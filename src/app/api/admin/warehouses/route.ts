import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import db from '@/db';

// GET all warehouses
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warehouses = await db.warehouse.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            item_price: true
          }
        }
      }
    });

    const response = NextResponse.json(warehouses);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, country, isVisible, displayedName } = body;

    if (!name || !country) {
      return NextResponse.json({ error: 'Name and country are required' }, { status: 400 });
    }

    const warehouse = await db.warehouse.create({
      data: {
        name: name,
        country: country,
        displayedName: displayedName,
        isVisible: isVisible
      }
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
