import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';

import prisma from '@/db';
import { auth } from '@/lib/auth';
import { mapOrderForUser } from './shared';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
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
                warehouse: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json({
      orders: orders.map(mapOrderForUser),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (body.isPriceRequest) {
      return priceRequestHandler(body, userId!);
    } else {
      return orderHandler(body, userId!);
    }
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function priceRequestHandler(body: any, userId: string) {

  const { itemId, warehouseId, quantity, comment, price, isPriceRequest, status } = body;

  if (!itemId || !warehouseId || !quantity) {
    return NextResponse.json(
      { error: 'Missing required fields: itemId, warehouseId, quantity' },
      { status: 400 }
    );
  }

  // Verify item exists
  const item = await prisma.item.findUnique({
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
      name:
        item.itemDetails?.[0]?.itemName,
      quantity: quantity,
      warehouseId: itemPrice.warehouse.id,
      warehouseName: itemPrice.warehouse.name ?? itemPrice.warehouse.displayedName ?? 'Unknown warehouse',
      warehouseDisplayedName: itemPrice.warehouse.displayedName,
      warehouseCountry: itemPrice.warehouse.country,
      basePrice: itemPrice.price,
      baseSpecialPrice: itemPrice.promotionPrice,
      unitPrice: 0,
      lineTotal: 0,
    }];

  // Create order for price request
  const order = await prisma.order.create({
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

  // Validate that all items exist and have sufficient stock
  const itemIds = cartItems
    .map((item: any) => item.articleId || item.productId)
    .filter((id: string | undefined | null) => Boolean(id)) as string[];

  if (itemIds.length !== cartItems.length) {
    return NextResponse.json(
      { error: 'Each cart item must include an articleId' },
      { status: 400 }
    );
  }
  const dbItems = await prisma.item.findMany({
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

  let computedOriginalTotal = 0;
  const orderLineItems: Array<Record<string, any>> = [];

  // Validate stock availability
  for (const cartItem of cartItems) {
    const cartArticleId = cartItem.articleId || cartItem.productId;
    const dbItem = dbItems.find((item: { articleId: string }) => item.articleId === cartArticleId);
    if (!dbItem) {
      return NextResponse.json(
        { error: `Item ${cartArticleId} not found` },
        { status: 404 }
      );
    }

    const itemPrice = dbItem.itemPrice.find(
      (price: { warehouse: { id: string } }) => price.warehouse.id === cartItem.warehouseId
    );

    if (!itemPrice || itemPrice.quantity < cartItem.quantity) {
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
        dbItem.brandName ||
        cartArticleId,
      quantity: cartItem.quantity,
      warehouseId: itemPrice.warehouse.id,
      warehouseName: itemPrice.warehouse.name ?? itemPrice.warehouse.displayedName ?? 'Unknown warehouse',
      warehouseDisplayedName: itemPrice.warehouse.displayedName,
      warehouseCountry: itemPrice.warehouse.country,
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

  // Create the order
  const order = await prisma.order.create({
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

  // Update stock quantities
  for (const cartItem of cartItems) {
    const cartArticleId = cartItem.articleId || cartItem.productId;
    const dbItem = dbItems.find((item: { articleId: string }) => item.articleId === cartArticleId);
    if (dbItem) {
      await prisma.itemPrice.updateMany({
        where: {
          itemId: dbItem.id,
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
