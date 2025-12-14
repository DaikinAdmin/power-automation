import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// import prisma from '@/db';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { mapOrderForUser } from '../shared';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Drizzle implementation
    const [order] = await db
      .select()
      .from(schema.order)
      .where(
        and(
          eq(schema.order.id, id),
          eq(schema.order.userId, session.user.id)
        )
      )
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Parse lineItems to get itemIds
    const lineItems = typeof order.lineItems === 'string' 
      ? JSON.parse(order.lineItems) 
      : order.lineItems;
    
    const itemIds = Array.isArray(lineItems) 
      ? lineItems.map((item: any) => item.itemId).filter(Boolean)
      : [];

    let items: any[] = [];
    if (itemIds.length > 0) {
      // Fetch items with details, prices, and brand
      const dbItems = await db
        .select()
        .from(schema.item)
        .where(inArray(schema.item.id, itemIds));

      items = await Promise.all(
        dbItems.map(async (item) => {
          const [itemDetails, itemPrices, brand] = await Promise.all([
            db.select({ itemName: schema.itemDetails.itemName, locale: schema.itemDetails.locale })
              .from(schema.itemDetails)
              .where(eq(schema.itemDetails.itemSlug, item.articleId))
              .limit(1),
            db.select({
              id: schema.itemPrice.id,
              price: schema.itemPrice.price,
              quantity: schema.itemPrice.quantity,
              promotionPrice: schema.itemPrice.promotionPrice,
              warehouse: schema.warehouse,
            })
              .from(schema.itemPrice)
              .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
              .where(eq(schema.itemPrice.itemSlug, item.articleId)),
            item.brandSlug
              ? db.select({ name: schema.brand.name })
                  .from(schema.brand)
                  .where(eq(schema.brand.alias, item.brandSlug))
                  .limit(1)
                  .then(r => r[0])
              : null,
          ]);

          return {
            ...item,
            itemDetails,
            itemPrice: itemPrices,
            brand,
          };
        })
      );
    }

    const orderWithItems = { ...order, items };

    /* Prisma implementation (commented out)
    const order = await db.order.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            itemDetails: {
              select: {
                itemName: true,
                locale: true,
              },
              take: 1,
            },
            itemPrice: {
              include: {
                warehouse: true,
              },
            },
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    */

    return NextResponse.json({
      order: mapOrderForUser(orderWithItems),
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Drizzle implementation
    const [order] = await db
      .select()
      .from(schema.order)
      .where(
        and(
          eq(schema.order.id, id),
          eq(schema.order.userId, session.user.id)
        )
      )
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (action === 'cancel' && order.status === 'NEW') {
      const [updatedOrder] = await db
        .update(schema.order)
        .set({
          status: 'CANCELLED',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.order.id, id))
        .returning();

      /* Prisma implementation (commented out)
      const updatedOrder = await db.order.update({
        where: { id: id },
        data: { status: 'CANCELLED' },
      });
      */

      return NextResponse.json({
        success: true,
        order: { id: updatedOrder.id, status: updatedOrder.status },
      });
    }

    return NextResponse.json({ error: 'Invalid action or order status' }, { status: 400 });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
