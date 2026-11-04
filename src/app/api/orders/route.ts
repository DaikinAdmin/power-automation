import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { mapOrderForUser, orderHandler, priceRequestHandler } from './shared';
import { eq, desc, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError } from '@/lib/error-handler';

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
      return priceRequestHandler(body, userId!, request.headers.get('host'));
    } else {
      return orderHandler(body, userId!, locale, request.headers.get('host'));
    }
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/orders',
    });
  }
}
