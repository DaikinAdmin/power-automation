import { NextRequest, NextResponse } from 'next/server';
import { Currency } from '@prisma/client';
import prisma from '@/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET - Retrieve all currency exchange rates
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const exchangeRates = await prisma.currencyExchange.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    });

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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
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
    if (!Object.values(Currency).includes(from as Currency) || !Object.values(Currency).includes(to as Currency)) {
      return NextResponse.json(
        { message: 'Invalid currency code' },
        { status: 400 }
      );
    }
    
    // Update or create the exchange rate
    const exchangeRate = await prisma.currencyExchange.upsert({
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
    
    return NextResponse.json(exchangeRate);
  } catch (error) {
    console.error('Error updating currency exchange rate:', error);
    return NextResponse.json(
      { message: 'Failed to update currency exchange rate' },
      { status: 500 }
    );
  }
}
