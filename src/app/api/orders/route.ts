import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { mapOrderForUser, computeLineItemDerived, orderHandler } from './shared';
import { eq, desc, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { getTranslations } from 'next-intl/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    logger.info('Fetching user orders', { userId: session.user.id });

    // Drizzle implementation
    const orders = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.userId, session.user.id))
      .orderBy(desc(schema.order.createdAt));

    // Fetch related items and payments for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        // Parse lineItems to get itemIds
        // Fetch payment data for the order
        const [paymentData] = await db
          .select({
            id: schema.payment.id,
            status: schema.payment.status,
            currency: schema.payment.currency,
            amount: schema.payment.amount,
            paymentMethod: schema.payment.paymentMethod,
          })
          .from(schema.payment)
          .where(eq(schema.payment.orderId, order.id))
          .orderBy(desc(schema.payment.createdAt))
          .limit(1);

        return { ...order, payment: paymentData || null };
      })
    );

    /* Prisma implementation (commented out)
    const orders = await db.order.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            itemDetails: {
              select: {
                itemName: true,
              },
              take: 1,
            },
            itemPrice: {
              include: {
                warehouse: {
                  include: {
                    country: true,
                  }
                },
              },
              take: 1,
            },
          },
        },
      },
    });
    */

    const duration = Date.now() - startTime;
    logger.info('Orders fetched successfully', { 
      userId: session.user.id,
      ordersCount: ordersWithItems.length,
      duration: duration
    });

    return NextResponse.json({
      orders: ordersWithItems.map(mapOrderForUser),
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/orders',
    });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    
    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const body = await request.json();
    const locale = body.locale || 'en';
    
    logger.info('Creating order', { 
      userId, 
      isPriceRequest: body.isPriceRequest 
    });

    if (body.isPriceRequest) {
      return priceRequestHandler(body, userId!);
    } else {
      return orderHandler(body, userId!, locale, request.headers.get('host'));
    }
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/orders',
    });
  }
}

async function priceRequestHandler(body: any, userId: string) {

  const { itemId, warehouseId, quantity, comment, price, isPriceRequest, status } = body;

  if (!itemId || !warehouseId || !quantity) {
    throw new BadRequestError('Missing required fields: itemId, warehouseId, quantity');
  }

  // Drizzle implementation - Verify item exists
  const [item] = await db
    .select()
    .from(schema.item)
    .where(eq(schema.item.id, itemId))
    .limit(1);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const [itemDetail] = await db
    .select({ itemName: schema.itemDetails.itemName, locale: schema.itemDetails.locale })
    .from(schema.itemDetails)
    .where(eq(schema.itemDetails.itemSlug, item.articleId))
    .limit(1);

  const [itemPrice] = await db
    .select({
      id: schema.itemPrice.id,
      price: schema.itemPrice.price,
      promotionPrice: schema.itemPrice.promotionPrice,
      margin: schema.itemPrice.margin,
      initialCurrency: schema.itemPrice.initialCurrency,
      warehouse: schema.warehouse,
    })
    .from(schema.itemPrice)
    .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
    .where(eq(schema.itemPrice.warehouseId, warehouseId))
    .limit(1);

  if (!itemPrice || !itemPrice.warehouse) {
    return NextResponse.json({ error: 'Item not available in selected warehouse' }, { status: 404 });
  }

  const orderLineItems = [{
      itemId: itemId,
      articleId: item.articleId,
      name: itemDetail?.itemName,
      quantity: quantity,
      warehouseId: itemPrice.warehouse.id,
      warehouseName: itemPrice.warehouse.name ?? itemPrice.warehouse.displayedName ?? 'Unknown warehouse',
      warehouseDisplayedName: itemPrice.warehouse.displayedName,
      warehouseCountry: itemPrice.warehouse.countrySlug,
      originalCurrency: itemPrice.initialCurrency ?? null,
      vatRate: 0,
      exchangeRate: 1,
      basePriceNet: itemPrice.price,
      specialPriceNet: itemPrice.promotionPrice ?? null,
      unitPriceNet: 0,
    }];

  // Create order for price request
  const now = new Date().toISOString();
  const [order] = await db
    .insert(schema.order)
    .values({
      id: crypto.randomUUID(),
      userId: userId,
      currency: 'EUR',
      totalNet: price || 0,
      totalVat: 0,
      totalGross: price || 0,
      status: status,
      comment: comment || null,
      lineItems: orderLineItems,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  /* Prisma implementation (commented out)
  const item = await db.item.findUnique({
    where: { id: itemId },
    include: {
      itemDetails: {
        select: {
          itemName: true,
          locale: true,
        },
        take: 1,
      },
      itemPrice: {
        where: { warehouseId },
        include: { warehouse: true }
      }
    }
  });

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const itemPrice = item.itemPrice[0];
  if (!itemPrice) {
    return NextResponse.json({ error: 'Item not available in selected warehouse' }, { status: 404 });
  }

  const orderLineItems = [{
      itemId: itemId,
      articleId: item.articleId,
      name: item.itemDetails?.[0]?.itemName,
      quantity: quantity,
      warehouseId: itemPrice.warehouse.id,
      warehouseName: itemPrice.warehouse.name ?? itemPrice.warehouse.displayedName ?? 'Unknown warehouse',
      warehouseDisplayedName: itemPrice.warehouse.displayedName,
      warehouseCountry: itemPrice.warehouse.countrySlug,
      basePrice: itemPrice.price,
      baseSpecialPrice: itemPrice.promotionPrice,
      unitPrice: 0,
      lineTotal: 0,
    }];

  const order = await db.order.create({
    data: {
      userId: userId,
      originalTotalPrice: price || 0,
      totalPrice: (price || 0).toString(),
      status: status,
      comment: comment || null,
      lineItems: orderLineItems,
      items: {
        connect: { id: itemId }
      }
    },
    include: {
      items: true,
      user: true
    }
  });
  */

  return NextResponse.json({
    success: true,
    order: order,
    orderId: order.id,
    message: isPriceRequest ? 'Price request submitted successfully' : 'Order created successfully'
  });
}
