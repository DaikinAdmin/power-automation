import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

import prisma from '@/db';
import { auth } from '@/lib/auth';
import { mapOrderForUser } from '../shared';

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

    const order = await prisma.order.findFirst({
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

    return NextResponse.json({
      order: mapOrderForUser(order),
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

    const order = await prisma.order.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (action === 'cancel' && order.status === 'NEW') {
      const updatedOrder = await prisma.order.update({
        where: { id: id },
        data: { status: 'CANCELLED' },
      });

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
