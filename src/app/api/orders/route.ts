import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { mapOrderForUser, computeLineItemDerived } from './shared';
import { eq, desc, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { getTranslations } from 'next-intl/server';
import { sendNewOrderEmails, type OrderEmailData } from '@/lib/order-emails';

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
      return orderHandler(body, userId!, locale);
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

async function orderHandler(body: any, userId: string, locale: string = 'en') {
  const t = await getTranslations({ locale, namespace: 'errors' });
  
  const {
    cartItems,
    customerInfo,
    deliveryId,
    novaPost,
    domainCurrency: orderCurrency = 'EUR',
  } = body;

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json(
      { error: 'Cart is empty' },
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
          .where(eq(schema.itemDetails.itemSlug, item.slug))
          .limit(1),
        db.select({
          id: schema.itemPrice.id,
          itemSlug: schema.itemPrice.itemSlug,
          warehouseId: schema.itemPrice.warehouseId,
          price: schema.itemPrice.price,
          quantity: schema.itemPrice.quantity,
          promotionPrice: schema.itemPrice.promotionPrice,
          margin: schema.itemPrice.margin,
          initialCurrency: schema.itemPrice.initialCurrency,
          warehouse: schema.warehouse,
        })
          .from(schema.itemPrice)
          .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
          .where(eq(schema.itemPrice.itemSlug, item.slug)),
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

  // Resolve exchange rates (originalCurrency -> orderCurrency)
  const exchangeRateRows = await db
    .select({ from: schema.currencyExchange.from, rate: schema.currencyExchange.rate })
    .from(schema.currencyExchange)
    .where(eq(schema.currencyExchange.to, orderCurrency as 'EUR' | 'UAH' | 'PLN' | 'USD'));
  const exchangeRateMap = new Map<string, number>(exchangeRateRows.map(r => [r.from, r.rate]));
  exchangeRateMap.set(orderCurrency, 1); // same currency → rate 1

  // Resolve VAT rates per warehouse country
  const uniqueCountrySlugs = [
    ...new Set(
      (dbItemsWithRelations as any[]).flatMap(dbItem =>
        dbItem.itemPrice.map((p: any) => p.warehouse?.countrySlug).filter(Boolean)
      ) as string[]
    ),
  ];
  const vatRows = uniqueCountrySlugs.length > 0
    ? await db
        .select({ slug: schema.warehouseCountries.slug, vatPercentage: schema.warehouseCountries.vatPercentage })
        .from(schema.warehouseCountries)
        .where(inArray(schema.warehouseCountries.slug, uniqueCountrySlugs))
    : [];
  const vatMap = new Map<string, number>(vatRows.map(r => [r.slug!, (r.vatPercentage ?? 0) / 100]));

  let totalNetAcc = 0;
  let totalVatAcc = 0;
  const orderLineItems: any[] = [];

  // Validate stock availability
  for (const cartItem of cartItems) {
    const cartArticleId = cartItem.articleId || cartItem.productId;
    const dbItem = dbItemsWithRelations.find((item: { articleId: string }) => item.articleId === cartArticleId);
    if (!dbItem) {
      return NextResponse.json(
        { error: t('itemNotFound', { articleId: cartArticleId }) },
        { status: 404 }
      );
    }

    const itemPrice = dbItem.itemPrice.find(
      (price: { warehouse: any }) => price.warehouse?.id === cartItem.warehouseId
    );

    // Debug logging to understand the issue
    if (!itemPrice) {
      logger.warn('Warehouse not found for cart item', {
        cartItemWarehouseId: cartItem.warehouseId,
        availableWarehouses: dbItem.itemPrice.map((p: any) => ({
          id: p.warehouse?.id,
          name: p.warehouse?.name
        }))
      });
    }

    if (!itemPrice || !itemPrice.warehouse) {
      return NextResponse.json(
        { error: t('itemNotAvailable', { itemName: cartItem.name }) },
        { status: 400 }
      );
    }

    if (itemPrice.quantity < cartItem.quantity) {
      return NextResponse.json(
        { error: t('insufficientStock', { itemName: cartItem.name, available: itemPrice.quantity, requested: cartItem.quantity }) },
        { status: 400 }
      );
    }

    // Compute financial fields for the line item
    const originalCurrency = cartItem.currency || (itemPrice as any).initialCurrency || null;
    const exchangeRate = originalCurrency && originalCurrency !== orderCurrency
      ? (exchangeRateMap.get(originalCurrency) ?? 1)
      : 1;
    const vatRate = vatMap.get(itemPrice.warehouse.countrySlug ?? '') ?? 0;
    const basePriceNet = itemPrice.price;
    const specialPriceNet = itemPrice.promotionPrice ?? null;
    const unitPriceNet = specialPriceNet ?? basePriceNet;
    const lineTotalNet = +(unitPriceNet * cartItem.quantity).toFixed(6);
    const lineTotalNetConverted = +(lineTotalNet * exchangeRate).toFixed(2);
    const lineVatConverted = +(lineTotalNetConverted * vatRate).toFixed(2);

    totalNetAcc += lineTotalNetConverted;
    totalVatAcc += lineVatConverted;

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
      originalCurrency,
      vatRate,
      exchangeRate,
      basePriceNet,
      specialPriceNet,
      unitPriceNet,
    });
  }

  // Compute order-level financial totals
  const totalNet = +totalNetAcc.toFixed(2);
  const totalVat = +totalVatAcc.toFixed(2);
  const totalGross = +(totalNet + totalVat).toFixed(2);

  // Create delivery record if novaPost data is provided
  let resolvedDeliveryId: string | null = deliveryId || null;
  if (novaPost?.method) {
    const deliveryTypeMap: Record<string, 'PICKUP' | 'NOVA_POSHTA' | 'COURIER' | 'USER_ADDRESS'> = {
      warehouse: 'PICKUP',
      nova_dept: 'NOVA_POSHTA',
      nova_courier: 'COURIER',
    };
    const mappedType = deliveryTypeMap[novaPost.method] ?? 'USER_ADDRESS';
    const now2 = new Date().toISOString();
    const [newDelivery] = await db
      .insert(schema.delivery)
      .values({
        id: crypto.randomUUID(),
        userId,
        type: mappedType,
        city: novaPost.city ?? null,
        cityRef: novaPost.cityRef ?? null,
        warehouseRef: novaPost.warehouseRef ?? null,
        warehouseDesc: novaPost.warehouseDesc ?? null,
        street: novaPost.street ?? null,
        building: novaPost.building ?? null,
        flat: novaPost.flat ?? null,
        paymentMethod: novaPost.payment ?? null,
        status: 'PENDING',
        createdAt: now2,
        updatedAt: now2,
      })
      .returning();
    resolvedDeliveryId = newDelivery.id;
  }

  // Drizzle implementation - Create the order
  const now = new Date().toISOString();
  const [order] = await db
    .insert(schema.order)
    .values({
      id: crypto.randomUUID(),
      userId: userId,
      currency: orderCurrency,
      totalNet,
      totalVat,
      totalGross,
      lineItems: orderLineItems,
      status: 'NEW',
      deliveryId: resolvedDeliveryId,
      notes: { locale },
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Back-fill orderId on the delivery record
  if (resolvedDeliveryId && !deliveryId) {
    await db
      .update(schema.delivery)
      .set({ orderId: order.id, updatedAt: now })
      .where(eq(schema.delivery.id, resolvedDeliveryId));
  }

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

  // Send order notification emails (non-blocking)
  try {
    const [orderUser] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (orderUser) {
      const emailData: OrderEmailData = {
        orderId: order.id,
        orderShortId: order.id.substring(0, 8),
        customerName: orderUser.name,
        customerEmail: orderUser.email,
        customerPhone: orderUser.phoneNumber || undefined,
        companyName: orderUser.companyName || undefined,
        totalGross: order.totalGross,
        currency: order.currency,
        locale,
        lineItems: orderLineItems.map((li: any) => {
          const derived = computeLineItemDerived(li);
          return {
            name: li.name || li.articleId,
            articleId: li.articleId,
            quantity: li.quantity,
            unitPriceGross: derived.unitPriceGrossConverted,
            lineTotalGrossConverted: derived.lineTotalGrossConverted,
            warehouseName: li.warehouseName,
          };
        }),
        comment: null,
      };
      sendNewOrderEmails(emailData);
    }
  } catch (emailErr) {
    logger.error('Failed to send order notification emails', { orderId: order.id, error: String(emailErr) });
  }

  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      status: order.status,
      currency: order.currency,
      totalNet: order.totalNet,
      totalVat: order.totalVat,
      totalGross: order.totalGross,
      lineItems: Array.isArray(order.lineItems)
        ? (order.lineItems as any[]).map(computeLineItemDerived)
        : order.lineItems,
      createdAt: order.createdAt
    }
  });
}
