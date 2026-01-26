import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { mapOrderForUser } from './shared';
import { eq, desc, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';

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

    // Fetch related items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        // Parse lineItems to get itemIds
        const lineItems = typeof order.lineItems === 'string' 
          ? JSON.parse(order.lineItems) 
          : order.lineItems;
        
        const itemIds = Array.isArray(lineItems) 
          ? lineItems.map((item: any) => item.itemId).filter(Boolean)
          : [];

        if (itemIds.length === 0) {
          return { ...order, items: [] };
        }

        // Fetch items with details and prices
        const items = await db
          .select()
          .from(schema.item)
          .where(inArray(schema.item.id, itemIds));

        const itemsWithRelations = await Promise.all(
          items.map(async (item) => {
            const [itemDetails, itemPrice] = await Promise.all([
              db.select({ itemName: schema.itemDetails.itemName })
                .from(schema.itemDetails)
                .where(eq(schema.itemDetails.itemSlug, item.articleId))
                .limit(1)
                .then(r => r[0]),
              db.select({
                id: schema.itemPrice.id,
                price: schema.itemPrice.price,
                quantity: schema.itemPrice.quantity,
                promotionPrice: schema.itemPrice.promotionPrice,
                warehouse: schema.warehouse,
              })
                .from(schema.itemPrice)
                .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
                .where(eq(schema.itemPrice.itemSlug, item.articleId))
                .limit(1)
                .then(r => r[0]),
            ]);

            return {
              ...item,
              itemDetails: itemDetails ? [itemDetails] : [],
              itemPrice: itemPrice ? [itemPrice] : [],
            };
          })
        );

        return { ...order, items: itemsWithRelations };
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
    
    logger.info('Creating order', { 
      userId, 
      isPriceRequest: body.isPriceRequest 
    });

    if (body.isPriceRequest) {
      return priceRequestHandler(body, userId!);
    } else {
      return orderHandler(body, userId!);
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
      basePrice: itemPrice.price,
      baseSpecialPrice: itemPrice.promotionPrice,
      unitPrice: 0,
      lineTotal: 0,
    }];

  // Create order for price request
  const now = new Date().toISOString();
  const [order] = await db
    .insert(schema.order)
    .values({
      id: crypto.randomUUID(),
      userId: userId,
      originalTotalPrice: price || 0,
      totalPrice: (price || 0).toString(),
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

async function orderHandler(body: any, userId: string) {
  const {
    cartItems,
    totalPrice,
    originalTotalPrice,
    customerInfo,
    deliveryId,
  } = body;

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json(
      { error: 'Cart is empty' },
      { status: 400 }
    );
  }

  if (typeof totalPrice !== 'string' || !totalPrice.trim()) {
    return NextResponse.json(
      { error: 'A formatted totalPrice string is required' },
      { status: 400 }
    );
  }

  // Drizzle implementation - Validate that all items exist and have sufficient stock
  const itemIds = cartItems
    .map((item: any) => item.articleId || item.productId)
    .filter((id: string | undefined | null) => Boolean(id)) as string[];

  if (itemIds.length !== cartItems.length) {
    return NextResponse.json(
      { error: 'Each cart item must include an articleId' },
      { status: 400 }
    );
  }

  const dbItems = await db
    .select()
    .from(schema.item)
    .where(inArray(schema.item.articleId, itemIds));

  // Fetch related data for each item
  const dbItemsWithRelations = await Promise.all(
    dbItems.map(async (item) => {
      const [itemDetails, itemPrices] = await Promise.all([
        db.select({ itemName: schema.itemDetails.itemName, locale: schema.itemDetails.locale })
          .from(schema.itemDetails)
          .where(eq(schema.itemDetails.itemSlug, item.articleId))
          .limit(1),
        db.select({
          id: schema.itemPrice.id,
          itemSlug: schema.itemPrice.itemSlug,
          warehouseId: schema.itemPrice.warehouseId,
          price: schema.itemPrice.price,
          quantity: schema.itemPrice.quantity,
          promotionPrice: schema.itemPrice.promotionPrice,
          warehouse: schema.warehouse,
        })
          .from(schema.itemPrice)
          .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
          .where(eq(schema.itemPrice.itemSlug, item.articleId)),
      ]);

      return {
        ...item,
        itemDetails,
        itemPrice: itemPrices,
      };
    })
  );

  /* Prisma implementation (commented out)
  const dbItems = await db.item.findMany({
    where: {
      articleId: { in: itemIds }
    },
    include: {
      itemPrice: {
        include: {
          warehouse: true
        }
      },
      itemDetails: {
        select: {
          itemName: true,
          locale: true,
        },
        take: 1,
      },
    }
  });
  */

  let computedOriginalTotal = 0;
  const orderLineItems: Array<Record<string, any>> = [];

  // Validate stock availability
  for (const cartItem of cartItems) {
    const cartArticleId = cartItem.articleId || cartItem.productId;
    const dbItem = dbItemsWithRelations.find((item: { articleId: string }) => item.articleId === cartArticleId);
    if (!dbItem) {
      return NextResponse.json(
        { error: `Item ${cartArticleId} not found` },
        { status: 404 }
      );
    }

    const itemPrice = dbItem.itemPrice.find(
      (price: { warehouse: any }) => price.warehouse?.id === cartItem.warehouseId
    );

    if (!itemPrice || !itemPrice.warehouse || itemPrice.quantity < cartItem.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for item ${cartItem.name}` },
        { status: 400 }
      );
    }

    const baseUnitPrice = (itemPrice.promotionPrice ?? itemPrice.price) || 0;
    computedOriginalTotal += baseUnitPrice * cartItem.quantity;

    orderLineItems.push({
      itemId: dbItem.id,
      articleId: cartArticleId,
      name:
        cartItem.name ||
        dbItem.itemDetails?.[0]?.itemName ||
        dbItem.brandSlug ||
        cartArticleId,
      quantity: cartItem.quantity,
      warehouseId: itemPrice.warehouse.id,
      warehouseName: itemPrice.warehouse.name ?? itemPrice.warehouse.displayedName ?? 'Unknown warehouse',
      warehouseDisplayedName: itemPrice.warehouse.displayedName,
      warehouseCountry: itemPrice.warehouse.countrySlug,
      basePrice: itemPrice.price,
      baseSpecialPrice: itemPrice.promotionPrice,
      unitPrice: baseUnitPrice,
      lineTotal: baseUnitPrice * cartItem.quantity,
    });
  }

  const normalizedOriginalTotal = Number.parseFloat(computedOriginalTotal.toFixed(2));
  const clientOriginalTotal =
    typeof originalTotalPrice === 'number'
      ? Number.parseFloat(originalTotalPrice.toFixed(2))
      : null;

  if (
    clientOriginalTotal !== null &&
    Number.isFinite(clientOriginalTotal) &&
    Math.abs(clientOriginalTotal - normalizedOriginalTotal) > 1
  ) {
    console.warn('Mismatch between client supplied and computed original totals', {
      clientOriginalTotal,
      normalizedOriginalTotal,
    });
  }

  if (!Number.isFinite(normalizedOriginalTotal)) {
    return NextResponse.json(
      { error: 'Failed to calculate the original order total' },
      { status: 400 }
    );
  }

  // Drizzle implementation - Create the order
  const now = new Date().toISOString();
  const [order] = await db
    .insert(schema.order)
    .values({
      id: crypto.randomUUID(),
      userId: userId,
      originalTotalPrice: normalizedOriginalTotal,
      totalPrice,
      lineItems: orderLineItems,
      status: 'NEW',
      deliveryId: deliveryId || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Update stock quantities
  for (const cartItem of cartItems) {
    const cartArticleId = cartItem.articleId || cartItem.productId;
    const dbItem = dbItemsWithRelations.find((item: { articleId: string }) => item.articleId === cartArticleId);
    if (dbItem) {
      // Get current item price
      const [currentPrice] = await db
        .select()
        .from(schema.itemPrice)
        .where(eq(schema.itemPrice.itemSlug, dbItem.articleId))
        .limit(1);

      if (currentPrice) {
        await db
          .update(schema.itemPrice)
          .set({
            quantity: currentPrice.quantity - cartItem.quantity,
            updatedAt: now,
          })
          .where(eq(schema.itemPrice.id, currentPrice.id));
      }
    }
  }

  /* Prisma implementation (commented out)
  const order = await db.order.create({
    data: {
      userId: userId,
      originalTotalPrice: normalizedOriginalTotal,
      totalPrice,
      lineItems: orderLineItems,
      status: 'NEW',
      deliveryId: deliveryId || null,
      items: {
        connect: dbItems.map((item: { id: string }) => ({ id: item.id }))
      }
    },
    include: {
      items: {
        include: {
          itemDetails: true,
          itemPrice: {
            include: {
              warehouse: true
            }
          }
        }
      }
    }
  });

  for (const cartItem of cartItems) {
    const cartArticleId = cartItem.articleId || cartItem.productId;
    const dbItem = dbItems.find((item: { articleId: string }) => item.articleId === cartArticleId);
    if (dbItem) {
      await db.itemPrice.updateMany({
        where: {
          itemSlug: dbItem.articleId,
          warehouseId: cartItem.warehouseId
        },
        data: {
          quantity: {
            decrement: cartItem.quantity
          }
        }
      });
    }
  }
  */

  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      originalTotalPrice: order.originalTotalPrice,
      lineItems: order.lineItems,
      createdAt: order.createdAt
    }
  });
}
