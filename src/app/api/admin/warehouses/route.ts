import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import db from '@/db';
import { db } from '@/db';
import { eq, asc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';

// GET all warehouses
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Drizzle implementation
    const warehousesData = await db
      .select({
        id: schema.warehouse.id,
        name: schema.warehouse.name,
        countrySlug: schema.warehouse.countrySlug,
        displayedName: schema.warehouse.displayedName,
        isVisible: schema.warehouse.isVisible,
        createdAt: schema.warehouse.createdAt,
        updatedAt: schema.warehouse.updatedAt,
        count: sql<number>`cast(count(${schema.itemPrice.id}) as integer)`,
      })
      .from(schema.warehouse)
      .leftJoin(schema.itemPrice, eq(schema.warehouse.id, schema.itemPrice.warehouseId))
      .groupBy(schema.warehouse.id)
      .orderBy(asc(schema.warehouse.name));

    const warehouses = warehousesData.map((w) => ({
      ...w,
      _count: { item_price: w.count },
      count: undefined,
    }));

    /* Prisma implementation (commented out)
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
    */

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

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, countrySlug, isVisible, displayedName } = body;

    if (!name || !countrySlug) {
      return NextResponse.json({ error: 'Name and countrySlug are required' }, { status: 400 });
    }

    // Drizzle implementation
    const [warehouse] = await db
      .insert(schema.warehouse)
      .values({
        id: randomUUID(),
        name,
        countrySlug,
        displayedName: displayedName || name,
        isVisible: isVisible ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const warehouse = await db.warehouse.create({
      data: {
        name: name,
        country: country,
        displayedName: displayedName,
        isVisible: isVisible
      }
    });
    */

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
