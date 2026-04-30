import { NextRequest, NextResponse } from 'next/server';

// import prisma from '@/db';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler } from '@/lib/error-handler';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

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

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    logger.info('Fetching all orders', {
      endpoint: 'GET /api/admin/orders',
      role: authResult.role,
    });

    // Fetch orders with user data
    const ordersWithUser = await db
      .select({
        id: schema.order.id,
        status: schema.order.status,
        currency: schema.order.currency,
        totalNet: schema.order.totalNet,
        totalVat: schema.order.totalVat,
        totalGross: schema.order.totalGross,
        lineItems: schema.order.lineItems,
        createdAt: schema.order.createdAt,
        userName: schema.user.name,
        userEmail: schema.user.email,
      })
      .from(schema.order)
      .leftJoin(schema.user, eq(schema.order.userId, schema.user.id))
      .orderBy(desc(schema.order.createdAt)) as unknown as Array<{
        id: string;
        status: string;
        currency: string | null;
        totalNet: number | null;
        totalVat: number | null;
        totalGross: number | null;
        lineItems: Array<{ itemId: string; articleId: string; name: string; quantity: number }> | null;
        createdAt: Date;
        userName: string | null;
        userEmail: string | null;
      }>;

    // Format orders — derive items list directly from lineItems JSON (no extra DB lookup needed)
    const orders = ordersWithUser.map(order => ({
      id: order.id,
      status: order.status,
      currency: order.currency ?? null,
      totalNet: order.totalNet ?? null,
      totalVat: order.totalVat ?? null,
      totalGross: order.totalGross ?? null,
      createdAt: order.createdAt,
      user: {
        name: order.userName,
        email: order.userEmail,
      },
      items: Array.isArray(order.lineItems)
        ? order.lineItems.map(li => ({
            id: li.itemId,
            itemDetails: [{ itemName: li.name ?? li.articleId }],
          }))
        : [],
    }));

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !AUTHORIZED_ROLES.has(user.role)) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    const orders = await db.order.findMany({
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
    */

    const duration = Date.now() - startTime;
    logger.info('Orders fetched successfully', {
      endpoint: 'GET /api/admin/orders',
      count: orders.length,
      role: authResult.role,
      duration,
    });

    return NextResponse.json({
      orders,
      viewerRole: authResult.role,
    });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/admin/orders' });
  }
}
