import { NextRequest, NextResponse } from 'next/server';
// import { Currency } from '@/db/schema';
// import prisma from '@/db';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';

// Currency enum values from schema
const currencyValues = ['EUR', 'USD', 'PLN', 'UAH'] as const;
type Currency = typeof currencyValues[number];

// GET - Retrieve all currency exchange rates
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // const isAdmin = await isUserAdmin(session.user.id);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Drizzle implementation
    const exchangeRates = await db
      .select()
      .from(schema.currencyExchange)
      .orderBy(desc(schema.currencyExchange.updatedAt));

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const exchangeRates = await db.currencyExchange.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    });
    */

    const response = NextResponse.json(exchangeRates);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching currency exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currency exchange rates' },
      { status: 500 }
    );
  }
}

// PUT - Update currency exchange rate
export async function PUT(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { from, to, rate } = await req.json();
    
    // Validate input
    if (!from || !to || rate === undefined) {
      return NextResponse.json(
        { message: 'Missing required fields: from, to, rate' },
        { status: 400 }
      );
    }
    
    if (typeof rate !== 'number' || rate <= 0) {
      return NextResponse.json(
        { message: 'Rate must be a positive number' },
        { status: 400 }
      );
    }
    
    // Check if both currencies are valid
    if (!currencyValues.includes(from) || !currencyValues.includes(to)) {
      return NextResponse.json(
        { message: 'Invalid currency code' },
        { status: 400 }
      );
    }
    
    // Check if exchange rate exists
    const [existingRate] = await db
      .select()
      .from(schema.currencyExchange)
      .where(
        and(
          eq(schema.currencyExchange.from, from as any),
          eq(schema.currencyExchange.to, to as any)
        )
      )
      .limit(1);

    let exchangeRate;
    if (existingRate) {
      // Update existing rate
      [exchangeRate] = await db
        .update(schema.currencyExchange)
        .set({
          rate,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.currencyExchange.id, existingRate.id))
        .returning();
    } else {
      // Create new rate
      [exchangeRate] = await db
        .insert(schema.currencyExchange)
        .values({
          id: randomUUID(),
          from: from as any,
          to: to as any,
          rate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();
    }

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!Object.values(Currency).includes(from as Currency) || !Object.values(Currency).includes(to as Currency)) {
      return NextResponse.json(
        { message: 'Invalid currency code' },
        { status: 400 }
      );
    }
    
    const exchangeRate = await db.currencyExchange.upsert({
      where: {
        from_to: {
          from: from as Currency,
          to: to as Currency
        }
      },
      update: {
        rate,
        updatedAt: new Date()
      },
      create: {
        from: from as Currency,
        to: to as Currency,
        rate
      }
    });
    */
    
    return NextResponse.json(exchangeRate);
  } catch (error) {
    console.error('Error updating currency exchange rate:', error);
    return NextResponse.json(
      { message: 'Failed to update currency exchange rate' },
      { status: 500 }
    );
  }
}
