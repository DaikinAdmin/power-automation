import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const { warehouseId } = await params;
    
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
    const { name, country, isVisible, displayedName } = body;

    if (!name || !country) {
      return NextResponse.json({ error: 'Name and country are required' }, { status: 400 });
    }

    // Drizzle implementation
    const [warehouse] = await db
      .update(schema.warehouse)
      .set({
        name,
        countrySlug: country,
        isVisible,
        displayedName,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.warehouse.id, warehouseId))
      .returning();

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const warehouse = await db.warehouse.update({
      where: { id: warehouseId },
      data: {
        name,
        country,
        isVisible,
        displayedName
      }
    });
    */

    return NextResponse.json(warehouse);
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const { warehouseId } = await params;
    
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

    // Check if warehouse exists
    const [warehouse] = await db
      .select()
      .from(schema.warehouse)
      .where(eq(schema.warehouse.id, warehouseId))
      .limit(1);

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Check if warehouse has associated item prices
    const [priceCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.itemPrice)
      .where(eq(schema.itemPrice.warehouseId, warehouseId));

    if (priceCount && priceCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete warehouse with associated item prices' }, 
        { status: 400 }
      );
    }

    // Delete warehouse
    await db.delete(schema.warehouse).where(eq(schema.warehouse.id, warehouseId));

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const warehouseWithPrices = await db.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        _count: {
          select: {
            item_price: true
          }
        }
      }
    });

    if (!warehouseWithPrices) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    if (warehouseWithPrices._count.item_price > 0) {
      return NextResponse.json(
        { error: 'Cannot delete warehouse with associated item prices' }, 
        { status: 400 }
      );
    }

    await db.warehouse.delete({
      where: { id: warehouseId }
    });
    */

    return NextResponse.json({ message: 'Warehouse deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting warehouse:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
