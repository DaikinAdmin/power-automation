import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { OrderStatus } from '@/db/schema';

// import prisma from '@/db';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

// Valid order statuses
const VALID_ORDER_STATUSES: OrderStatus[] = ['NEW', 'WAITING_FOR_PAYMENT', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUND', 'DELIVERY', 'ASK_FOR_PRICE'];

// JSON value type (replaces Prisma.JsonValue)
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

type OrderLineItem = {
  itemId: string;
  articleId: string;
  name: string;
  quantity: number;
  warehouseId: string;
  warehouseName?: string | null;
  warehouseDisplayedName?: string | null;
  warehouseCountry?: string | null;
  basePrice?: number | null;
  baseSpecialPrice?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

const parseLineItems = (value: JsonValue | null): OrderLineItem[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is OrderLineItem => typeof item === 'object' && item !== null) as OrderLineItem[];
  }
  return [];
};

async function ensureAuthorized() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  if (!user || !user.role || !AUTHORIZED_ROLES.has(user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { session, role: user.role };
}

const mapOrder = (order: any) => {

  return {
  id: order.id,
  status: order.status,
  originalTotalPrice: order.originalTotalPrice,
  totalPrice: order.totalPrice,
  deliveryId: order.deliveryId,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  user: order.user,
  lineItems: order.lineItems,
  comment: order.comment,
};
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureAuthorized();
    if ('error' in authResult) {
      return authResult.error;
    }

    const { id } = await params;

    // Drizzle implementation
    const [orderData] = await db
      .select({
        id: schema.order.id,
        status: schema.order.status,
        totalPrice: schema.order.totalPrice,
        originalTotalPrice: schema.order.originalTotalPrice,
        lineItems: schema.order.lineItems,
        createdAt: schema.order.createdAt,
        comment: schema.order.comment,
        deliveryId: schema.order.deliveryId,
        updatedAt: schema.order.updatedAt,
        userName: schema.user.name,
        userPhoneNumber: schema.user.phoneNumber,
        userCountryCode: schema.user.countryCode,
        userEmail: schema.user.email,
      })
      .from(schema.order)
      .leftJoin(schema.user, eq(schema.order.userId, schema.user.id))
      .where(eq(schema.order.id, id))
      .limit(1);

    if (!orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch items with details
    let items: any[] = [];
    const lineItems = parseLineItems(orderData.lineItems as JsonValue | null);
    const itemIds = lineItems.map(li => li.itemId).filter(Boolean);
    if (itemIds.length > 0) {
      const itemsData = await db
        .select()
        .from(schema.item)
        .where(inArray(schema.item.id, itemIds));

      items = await Promise.all(
        itemsData.map(async (item) => {
          const [itemDetail] = await db
            .select({ itemName: schema.itemDetails.itemName })
            .from(schema.itemDetails)
            .where(eq(schema.itemDetails.itemSlug, item.articleId))
            .limit(1);

          const [priceData] = await db
            .select({
              id: schema.itemPrice.id,
              price: schema.itemPrice.price,
              warehouse: schema.warehouse,
            })
            .from(schema.itemPrice)
            .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
            .where(eq(schema.itemPrice.itemSlug, item.articleId))
            .limit(1);

          return {
            id: item.id,
            itemDetails: itemDetail ? [itemDetail] : [],
            itemPrice: priceData ? [priceData] : [],
          };
        })
      );
    }

    const order = {
      id: orderData.id,
      status: orderData.status,
      totalPrice: orderData.totalPrice,
      originalTotalPrice: orderData.originalTotalPrice,
      lineItems: orderData.lineItems,
      createdAt: orderData.createdAt,
      comment: orderData.comment,
      deliveryId: orderData.deliveryId,
      updatedAt: orderData.updatedAt,
      user: {
        name: orderData.userName,
        phoneNumber: orderData.userPhoneNumber,
        countryCode: orderData.userCountryCode,
        email: orderData.userEmail,
      },
      items,
    };

    /* Prisma implementation (commented out)
    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalPrice: true,
        originalTotalPrice: true,
        lineItems: true,
        createdAt: true,
        comment: true,
        user: {
          select: {
            name: true,
            phoneNumber: true,
            countryCode: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
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
            }
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    */

    return NextResponse.json({
      order: mapOrder(order),
      viewerRole: authResult.role,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureAuthorized();
    if ('error' in authResult) {
      return authResult.error;
    }

    const { id } = await params;
    const body = await request.json();
    const { status, deliveryId } = body as { status?: OrderStatus; deliveryId?: string | null };

    if (!status || !VALID_ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    if (status === 'DELIVERY' && (!deliveryId || typeof deliveryId !== 'string' || deliveryId.trim().length === 0)) {
      return NextResponse.json({ error: 'Delivery ID is required when status is DELIVERY' }, { status: 400 });
    }

    const updateData: any = { 
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'DELIVERY') {
      updateData.deliveryId = deliveryId?.trim() ?? null;
    } else if (deliveryId !== undefined) {
      updateData.deliveryId = deliveryId ? deliveryId.trim() : null;
    }

    // Drizzle implementation
    const [updatedOrderData] = await db
      .update(schema.order)
      .set(updateData)
      .where(eq(schema.order.id, id))
      .returning();

    if (!updatedOrderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch user data
    const [userData] = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.user)
      .where(eq(schema.user.id, updatedOrderData.userId))
      .limit(1);

    // Fetch items with details
    let items: any[] = [];
    const lineItems = parseLineItems(updatedOrderData.lineItems as JsonValue | null);
    const itemIds = lineItems.map(li => li.itemId).filter(Boolean);
    if (itemIds.length > 0) {
      const itemsData = await db
        .select()
        .from(schema.item)
        .where(inArray(schema.item.id, itemIds));

      items = await Promise.all(
        itemsData.map(async (item) => {
          const [itemDetail] = await db
            .select({ itemName: schema.itemDetails.itemName })
            .from(schema.itemDetails)
            .where(eq(schema.itemDetails.itemSlug, item.articleId))
            .limit(1);

          const [priceData] = await db
            .select({
              id: schema.itemPrice.id,
              price: schema.itemPrice.price,
              warehouse: schema.warehouse,
            })
            .from(schema.itemPrice)
            .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
            .where(eq(schema.itemPrice.itemSlug, item.articleId))
            .limit(1);

          return {
            id: item.id,
            articleId: item.articleId,
            itemDetails: itemDetail ? [itemDetail] : [],
            itemPrice: priceData ? [priceData] : [],
          };
        })
      );
    }

    const updatedOrder = {
      ...updatedOrderData,
      user: userData,
      items,
    };

    /* Prisma implementation (commented out)
    const updateData: Record<string, unknown> = { status };

    if (status === 'DELIVERY') {
      updateData.deliveryId = deliveryId?.trim() ?? null;
    } else if (deliveryId !== undefined) {
      updateData.deliveryId = deliveryId ? deliveryId.trim() : null;
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
    */

    return NextResponse.json({
      order: mapOrder(updatedOrder),
      viewerRole: authResult.role,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
