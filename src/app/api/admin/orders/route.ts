import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

import prisma from '@/db';
import { auth } from '@/lib/auth';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

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

export async function GET(request: NextRequest) {
  try {
    const authResult = await ensureAuthorized();
    if ('error' in authResult) {
      return authResult.error;
    }

    const orders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        totalPrice: true,
        originalTotalPrice: true,
        lineItems: true,
        createdAt: true,
        user: {
          select: {
            name: true,
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      orders,
      viewerRole: authResult.role,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
