import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';

/**
 * POST /api/payments/invoice/initiate
 * Registers an invoice payment request – marks the order as
 * WAITING_FOR_PAYMENT and creates a PENDING payment record with
 * paymentMethod = "invoice" so the admin can issue a bank-transfer invoice.
 * Body: { orderId: string }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      throw new BadRequestError('Missing required field: orderId');
    }

    logger.info('Initiating invoice payment request', {
      userId: session.user.id,
      orderId,
    });

    // Fetch the order
    const [order] = await db
      .select()
      .from(schema.order)
      .where(
        and(
          eq(schema.order.id, orderId),
          eq(schema.order.userId, session.user.id)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status === 'COMPLETED') {
      throw new BadRequestError('Order is already completed');
    }

    // Check if an invoice payment record already exists
    const [existingPayment] = await db
      .select()
      .from(schema.payment)
      .where(
        and(
          eq(schema.payment.orderId, orderId),
          eq(schema.payment.paymentMethod, 'invoice')
        )
      )
      .limit(1);

    if (existingPayment) {
      return NextResponse.json({ success: true, alreadyRequested: true });
    }

    // Create a payment record for the invoice request
    const now = new Date().toISOString();
    await db.insert(schema.payment).values({
      orderId: order.id,
      amount: order.originalTotalPrice ?? 0,
      currency: 'EUR',
      status: 'PENDING',
      paymentMethod: 'invoice',
      description: `Invoice request for order ${order.id.substring(0, 8)}`,
      metadata: { requestedBy: session.user.id, requestedAt: now },
      updatedAt: now,
    });

    // Update order status to WAITING_FOR_PAYMENT
    if (order.status === 'NEW') {
      await db
        .update(schema.order)
        .set({ status: 'WAITING_FOR_PAYMENT', updatedAt: now })
        .where(eq(schema.order.id, order.id));
    }

    logger.info('Invoice payment request created', {
      orderId: order.id,
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorHandler(error, request, { duration: Date.now() - startTime });
  }
}
