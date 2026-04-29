import { NextRequest, NextResponse } from 'next/server';
import type { OrderStatus } from '@/db/schema';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { computeLineItemDerived, OrderLineItem } from '@/app/api/orders/shared';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

// Valid order statuses
const VALID_ORDER_STATUSES: OrderStatus[] = ['NEW', 'WAITING_FOR_PAYMENT', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUND', 'DELIVERY', 'ASK_FOR_PRICE'];

// JSON value type
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

const parseLineItems = (value: JsonValue | null): OrderLineItem[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is OrderLineItem => typeof item === 'object' && item !== null) as OrderLineItem[];
  }
  return [];
};

async function ensureAuthorized(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
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
    currency: order.currency ?? null,
    totalNet: order.totalNet ?? null,
    totalVat: order.totalVat ?? null,
    totalGross: order.totalGross ?? null,
    deliveryId: order.deliveryId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    user: order.user,
    lineItems: Array.isArray(order.lineItems)
      ? order.lineItems.map(computeLineItemDerived)
      : order.lineItems,
    comment: order.comment,
    notes: order.notes ?? null,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { id } = await params;

    // Drizzle implementation
    const [orderData] = await db
      .select({
        id: schema.order.id,
        status: schema.order.status,
        currency: schema.order.currency,
        totalNet: schema.order.totalNet,
        totalVat: schema.order.totalVat,
        totalGross: schema.order.totalGross,
        lineItems: schema.order.lineItems,
        createdAt: schema.order.createdAt,
        comment: schema.order.comment,
        notes: schema.order.notes,
        deliveryId: schema.order.deliveryId,
        updatedAt: schema.order.updatedAt,
        userName: schema.user.name,
        userPhoneNumber: schema.user.phoneNumber,
        userCountryCode: schema.user.countryCode,
        userEmail: schema.user.email,
        userVatNumber: schema.user.vatNumber,
        userCompanyName: schema.user.companyName,
        userType: schema.user.userType,
        userAddressLine: schema.user.addressLine,
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
      currency: orderData.currency,
      totalNet: orderData.totalNet,
      totalVat: orderData.totalVat,
      totalGross: orderData.totalGross,
      lineItems: orderData.lineItems,
      createdAt: orderData.createdAt,
      comment: orderData.comment,
      notes: orderData.notes,
      deliveryId: orderData.deliveryId,
      updatedAt: orderData.updatedAt,
      user: {
        name: orderData.userName,
        phoneNumber: orderData.userPhoneNumber,
        countryCode: orderData.userCountryCode,
        email: orderData.userEmail,
        vatNumber: orderData.userVatNumber,
        companyName: orderData.userCompanyName,
        userType: orderData.userType,
        addressLine: orderData.userAddressLine,
      },
      items,
    };

    // Fetch linked delivery record if present
    let deliveryRecord = null;
    if (orderData.deliveryId) {
      const [dr] = await db
        .select()
        .from(schema.delivery)
        .where(eq(schema.delivery.id, orderData.deliveryId))
        .limit(1);
      deliveryRecord = dr ?? null;
    }
    // Also check delivery by orderId (in case linkage only goes one way)
    if (!deliveryRecord) {
      const [dr] = await db
        .select()
        .from(schema.delivery)
        .where(eq(schema.delivery.orderId, id))
        .limit(1);
      deliveryRecord = dr ?? null;
    }

    return NextResponse.json({
      order: mapOrder(order),
      delivery: deliveryRecord,
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
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { id } = await params;
    const body = await request.json();

    // Handle notes update action
    if (body.action === 'updateNotes') {
      const { notes } = body as { notes: unknown };
      if (!Array.isArray(notes)) {
        return NextResponse.json({ error: 'Invalid notes format' }, { status: 400 });
      }
      const sanitized = notes.map((n: any) => ({
        id: typeof n.id === 'string' ? n.id.slice(0, 64) : '',
        text: typeof n.text === 'string' ? n.text.slice(0, 2000) : '',
        createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date().toISOString(),
      })).filter((n) => n.id && n.text);
      const [updated] = await db
        .update(schema.order)
        .set({ notes: sanitized, updatedAt: new Date().toISOString() })
        .where(eq(schema.order.id, id))
        .returning({ notes: schema.order.notes });
      if (!updated) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ notes: updated.notes });
    }

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

    // Fetch payment currency for GTM tracking
    const [paymentRecord] = await db
      .select({ currency: schema.payment.currency })
      .from(schema.payment)
      .where(eq(schema.payment.orderId, id))
      .limit(1);

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
      currency: paymentRecord?.currency ?? null,
      viewerRole: authResult.role,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Only admins can delete orders
    if (authResult.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: only admins can delete orders' }, { status: 403 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(schema.order)
      .where(eq(schema.order.id, id))
      .returning({ id: schema.order.id });

    if (!deleted) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
