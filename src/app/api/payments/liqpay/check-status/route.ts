import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { buildData, buildSignature, LIQPAY_SUCCESS_STATUSES, LIQPAY_FAILURE_STATUSES } from '@/lib/liqpay';
import type { LiqPayCallbackData } from '@/lib/liqpay';
import {
  sendPaymentSuccessEmails,
  type PaymentEmailData,
} from '@/lib/order-emails';

// ---------------------------------------------------------------------------
// LiqPay configuration
// ---------------------------------------------------------------------------
const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY || '';
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || '';

/**
 * POST /api/payments/liqpay/check-status
 *
 * Actively queries LiqPay for the current payment status.
 * Used by the return page when the server-to-server callback hasn't arrived
 * (e.g. because the callback URL is unreachable from LiqPay servers).
 *
 * Body: { orderId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      throw new BadRequestError('Missing orderId');
    }

    // Verify the order belongs to this user
    const [order] = await db
      .select()
      .from(schema.order)
      .where(and(eq(schema.order.id, orderId), eq(schema.order.userId, session.user.id)))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // If the order is already in a terminal state, return it directly
    if (order.status === 'PROCESSING' || order.status === 'COMPLETED') {
      return NextResponse.json({ success: true, orderStatus: order.status, paymentStatus: 'COMPLETED' });
    }
    if (order.status === 'NEW' || order.status === 'CANCELLED') {
      // Check if there's a failed payment
      const [payment] = await db
        .select()
        .from(schema.payment)
        .where(eq(schema.payment.orderId, orderId))
        .orderBy(desc(schema.payment.createdAt))
        .limit(1);

      if (payment?.status === 'FAILED') {
        return NextResponse.json({ success: true, orderStatus: order.status, paymentStatus: 'FAILED' });
      }
    }

    // Find the most recent payment record for this order
    const [payment] = await db
      .select()
      .from(schema.payment)
      .where(eq(schema.payment.orderId, orderId))
      .orderBy(desc(schema.payment.createdAt))
      .limit(1);

    if (!payment || !payment.sessionId) {
      return NextResponse.json({ success: true, orderStatus: order.status, paymentStatus: payment?.status || 'NONE' });
    }

    // Only query LiqPay if payment is not already in a terminal state
    if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
      return NextResponse.json({ success: true, orderStatus: order.status, paymentStatus: payment.status });
    }

    // Query LiqPay status API
    if (!LIQPAY_PUBLIC_KEY || !LIQPAY_PRIVATE_KEY) {
      logger.warn('LiqPay credentials not configured, cannot check status');
      return NextResponse.json({ success: true, orderStatus: order.status, paymentStatus: payment.status });
    }

    const statusParams = {
      action: 'status',
      version: 3,
      public_key: LIQPAY_PUBLIC_KEY,
      order_id: payment.sessionId,
    };

    const data = buildData(statusParams as any);
    const signature = buildSignature(data, LIQPAY_PRIVATE_KEY);

    const liqpayResponse = await fetch('https://www.liqpay.ua/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data, signature }),
    });

    if (!liqpayResponse.ok) {
      logger.error('LiqPay status check failed', { status: liqpayResponse.status });
      return NextResponse.json({ success: true, orderStatus: order.status, paymentStatus: payment.status });
    }

    const liqpayData: LiqPayCallbackData = await liqpayResponse.json();

    logger.info('LiqPay status check result', {
      orderId,
      liqpayStatus: liqpayData.status,
      paymentId: payment.id,
    });

    const now = new Date().toISOString();

    // Update payment/order based on LiqPay response
    const currentPaymentStatus = payment.status as string;

    if (LIQPAY_SUCCESS_STATUSES.includes(liqpayData.status)) {
      // Payment is successful — update DB if not already done
      if (currentPaymentStatus !== 'COMPLETED') {
        await db
          .update(schema.payment)
          .set({
            status: 'COMPLETED',
            transactionId: String(liqpayData.payment_id),
            paymentMethod: liqpayData.paytype,
            metadata: {
              ...(payment.metadata as Record<string, unknown>),
              liqpayStatus: liqpayData.status,
              statusCheckPayload: liqpayData,
            },
            updatedAt: now,
          })
          .where(eq(schema.payment.id, payment.id));

        await db
          .update(schema.order)
          .set({ status: 'PROCESSING', updatedAt: now })
          .where(eq(schema.order.id, orderId));

        logger.info('Order updated to PROCESSING via status check', { orderId });

        // Send payment success emails
        try {
          const [user] = await db
            .select()
            .from(schema.user)
            .where(eq(schema.user.id, order.userId))
            .limit(1);

          if (user) {
            const lineItems = Array.isArray(order.lineItems) ? order.lineItems as any[] : [];
            const orderNotes = order.notes as Record<string, unknown> | null;
            const emailData: PaymentEmailData = {
              orderId: order.id,
              orderShortId: order.id.substring(0, 8),
              customerName: user.name,
              customerEmail: user.email,
              customerPhone: user.phoneNumber || undefined,
              companyName: user.companyName || undefined,
              totalPrice: order.totalPrice,
              originalTotalPrice: order.originalTotalPrice,
              locale: typeof orderNotes?.locale === 'string' ? orderNotes.locale : undefined,
              lineItems: lineItems.map((li: any) => ({
                name: li.name || li.articleId,
                articleId: li.articleId,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                lineTotal: li.lineTotal,
                warehouseName: li.warehouseName,
              })),
              paymentMethod: liqpayData.paytype || 'LiqPay',
              paymentAmount: liqpayData.amount,
              paymentCurrency: liqpayData.currency || 'UAH',
              transactionId: String(liqpayData.payment_id),
            };
            sendPaymentSuccessEmails(emailData);
          }
        } catch (emailErr) {
          logger.error('Failed to send payment emails from status check', { error: String(emailErr) });
        }
      }

      return NextResponse.json({ success: true, orderStatus: 'PROCESSING', paymentStatus: 'COMPLETED' });
    }

    if (LIQPAY_FAILURE_STATUSES.includes(liqpayData.status)) {
      if (currentPaymentStatus !== 'FAILED') {
        await db
          .update(schema.payment)
          .set({
            status: 'FAILED',
            errorCode: liqpayData.err_code || liqpayData.status,
            errorMessage: liqpayData.err_description || `LiqPay status: ${liqpayData.status}`,
            metadata: {
              ...(payment.metadata as Record<string, unknown>),
              liqpayStatus: liqpayData.status,
              statusCheckPayload: liqpayData,
            },
            updatedAt: now,
          })
          .where(eq(schema.payment.id, payment.id));

        await db
          .update(schema.order)
          .set({ status: 'NEW', updatedAt: now })
          .where(eq(schema.order.id, orderId));
      }

      return NextResponse.json({ success: true, orderStatus: 'NEW', paymentStatus: 'FAILED' });
    }

    // Still processing
    return NextResponse.json({
      success: true,
      orderStatus: order.status,
      paymentStatus: payment.status,
      liqpayStatus: liqpayData.status,
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay/check-status',
    });
  }
}
