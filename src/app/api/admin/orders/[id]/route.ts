import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { OrderStatus, Prisma } from '@prisma/client';

import prisma from '@/db';
import { auth } from '@/lib/auth';

const AUTHORIZED_ROLES = new Set(['ADMIN', 'EMPLOYER']);

type JsonValue = Prisma.JsonValue;

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !AUTHORIZED_ROLES.has(user.role)) {
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

    const order = await prisma.order.findUnique({
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

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    if (status === 'DELIVERY' && (!deliveryId || typeof deliveryId !== 'string' || deliveryId.trim().length === 0)) {
      return NextResponse.json({ error: 'Delivery ID is required when status is DELIVERY' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'DELIVERY') {
      updateData.deliveryId = deliveryId?.trim() ?? null;
    } else if (deliveryId !== undefined) {
      updateData.deliveryId = deliveryId ? deliveryId.trim() : null;
    }

    const updatedOrder = await prisma.order.update({
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

    return NextResponse.json({
      order: mapOrder(updatedOrder),
      viewerRole: authResult.role,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
