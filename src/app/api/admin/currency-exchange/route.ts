import { NextRequest, NextResponse } from 'next/server';
// import { Currency } from '@/db/schema';
// import prisma from '@/db';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError, ConflictError } from '@/lib/error-handler';

// Currency enum values from schema
const currencyValues = ['EUR', 'USD', 'PLN', 'UAH'] as const;
type Currency = typeof currencyValues[number];

// GET - Retrieve all currency exchange rates
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // const isAdmin = await isUserAdmin(session.user.id);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    logger.info('Fetching currency exchange rates', {
      endpoint: 'GET /api/admin/currency-exchange',
    });

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

    const duration = Date.now() - startTime;
    logger.info('Currency exchange rates fetched successfully', {
      endpoint: 'GET /api/admin/currency-exchange',
      count: exchangeRates.length,
      duration,
    });

    const response = NextResponse.json(exchangeRates);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    const req = new NextRequest('http://localhost/api/admin/currency-exchange');
    return apiErrorHandler(error, req, { endpoint: 'GET /api/admin/currency-exchange' });
  }
}

// PUT - Update currency exchange rate
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const { from, to, rate } = await request.json();
    
    logger.info('Updating currency exchange rate', {
      endpoint: 'PUT /api/admin/currency-exchange',
      from,
      to,
      rate,
    });

    // Validate input
    if (!from || !to || rate === undefined) {
      throw new BadRequestError('Missing required fields: from, to, rate');
    }
    
    if (typeof rate !== 'number' || rate <= 0) {
      throw new BadRequestError('Rate must be a positive number');
    }
    
    // Check if both currencies are valid
    if (!currencyValues.includes(from) || !currencyValues.includes(to)) {
      throw new BadRequestError('Invalid currency code');
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
    
    const duration = Date.now() - startTime;
    logger.info('Currency exchange rate updated successfully', {
      endpoint: 'PUT /api/admin/currency-exchange',
      from,
      to,
      rate,
      isNew: !existingRate,
      duration,
    });

    return NextResponse.json(exchangeRate);
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'PUT /api/admin/currency-exchange' });
  }
}
