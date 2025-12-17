import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// import prisma from '@/db';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, desc, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

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

export async function GET(request: NextRequest) {
  try {
    const authResult = await ensureAuthorized();
    if ('error' in authResult) {
      return authResult.error;
    }

    // Fetch orders with user data
    const ordersWithUser = await db
      .select({
        id: schema.order.id,
        status: schema.order.status,
        totalPrice: schema.order.totalPrice,
        originalTotalPrice: schema.order.originalTotalPrice,
        lineItems: schema.order.lineItems,
        createdAt: schema.order.createdAt,
        itemIds: schema.order.lineItems,
        userName: schema.user.name,
        userEmail: schema.user.email,
      })
      .from(schema.order)
      .leftJoin(schema.user, eq(schema.order.userId, schema.user.id))
      .orderBy(desc(schema.order.createdAt)) as unknown as Array<{
        id: string;
        status: string;
        totalPrice: number;
        originalTotalPrice: number;
        lineItems: any;
        createdAt: Date;
        itemIds: string[];
        userName: string | null;
        userEmail: string | null;
      }>;

    // Fetch item details for all orders
    const allItemIds = ordersWithUser.flatMap(order => order.itemIds || []) as string[];
    const uniqueItemIds = [...new Set(allItemIds)];
    
    let itemsMap = new Map();
    if (uniqueItemIds.length > 0) {
      const items = await db
        .select({
          id: schema.item.id,
          articleId: schema.item.articleId,
        })
        .from(schema.item)
        .where(inArray(schema.item.id, uniqueItemIds));

      // Fetch item details for these items
      const itemDetailsPromises = items.map(async (item) => {
        const [detail] = await db
          .select({ itemName: schema.itemDetails.itemName })
          .from(schema.itemDetails)
          .where(eq(schema.itemDetails.itemSlug, item.articleId))
          .limit(1);
        
        return {
          id: item.id,
          itemDetails: detail ? [detail] : [],
        };
      });

      const itemsWithDetails = await Promise.all(itemDetailsPromises);
      itemsMap = new Map(itemsWithDetails.map(item => [item.id, item]));
    }

    // Format orders
    const orders = ordersWithUser.map(order => ({
      id: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      originalTotalPrice: order.originalTotalPrice,
      lineItems: order.lineItems,
      createdAt: order.createdAt,
      user: {
        name: order.userName,
        email: order.userEmail,
      },
      items: (order.itemIds || []).map(itemId => itemsMap.get(itemId)).filter(Boolean),
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

    return NextResponse.json({
      orders,
      viewerRole: authResult.role,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
