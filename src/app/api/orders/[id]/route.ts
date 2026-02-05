import { NextRequest, NextResponse } from 'next/server';

// import prisma from '@/db';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { mapOrderForUser } from '../shared';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, NotFoundError, BadRequestError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = await params;

    logger.info('Fetching order by ID', {
      endpoint: 'GET /api/orders/[id]',
      orderId: id,
      userId: session.user.id,
    });

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
      throw new NotFoundError('Order not found');
    }

    // Fetch payment data for the order
    const [paymentData] = await db
      .select({
        id: schema.payment.id,
        status: schema.payment.status,
        currency: schema.payment.currency,
        amount: schema.payment.amount,
        paymentMethod: schema.payment.paymentMethod,
        sessionId: schema.payment.sessionId,
        transactionId: schema.payment.transactionId,
      })
      .from(schema.payment)
      .where(eq(schema.payment.orderId, order.id))
      .limit(1);

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

    const orderWithItems = { ...order, items, payment: paymentData || null };

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

    const duration = Date.now() - startTime;
    logger.info('Order fetched successfully', {
      endpoint: 'GET /api/orders/[id]',
      orderId: id,
      userId: session.user.id,
      itemCount: items.length,
      duration,
    });

    return NextResponse.json({
      order: mapOrderForUser(orderWithItems),
    });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/orders/[id]' });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await request.json();
    const { action } = body;

    logger.info('Updating order', {
      endpoint: 'PATCH /api/orders/[id]',
      orderId: id,
      userId: session.user.id,
      action,
    });

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
      throw new NotFoundError('Order not found');
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

      const duration = Date.now() - startTime;
      logger.info('Order cancelled successfully', {
        endpoint: 'PATCH /api/orders/[id]',
        orderId: id,
        userId: session.user.id,
        newStatus: updatedOrder.status,
        duration,
      });

      return NextResponse.json({
        success: true,
        order: { id: updatedOrder.id, status: updatedOrder.status },
      });
    }

    throw new BadRequestError('Invalid action or order status');
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'PATCH /api/orders/[id]' });
  }
}
