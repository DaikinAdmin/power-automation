import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { createLiqPayPaymentForOrder } from '@/lib/liqpay-order';

/**
 * POST /api/payments/liqpay/initiate
 *
 * Initiates a LiqPay checkout session for a given order (authenticated
 * owner). Body: { orderId: string, gaClientId?: string }
 *
 * Validates ownership/status, then delegates checkout-session building,
 * payment persistence, and order status update to
 * createLiqPayPaymentForOrder() in src/lib/liqpay-order.ts — shared with
 * the guest-checkout and admin payment-link routes.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ------------------------------------------------------------------
    // 1. Auth
    // ------------------------------------------------------------------
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const body = await request.json();
    const { orderId, gaClientId } = body;

    if (!orderId) {
      throw new BadRequestError('Missing required field: orderId');
    }

    logger.info('Initiating LiqPay payment', {
      userId: session.user.id,
      orderId,
    });

    // ------------------------------------------------------------------
    // 2. Fetch order
    // ------------------------------------------------------------------
    const [order] = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.id, orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Ensure the order belongs to the authenticated user
    if (order.userId !== session.user.id) {
      throw new UnauthorizedError('Order does not belong to the current user');
    }

    // Prevent double-payment
    if (order.status === 'COMPLETED' || order.status === 'PROCESSING') {
      throw new BadRequestError('Order is already paid or being processed');
    }

    // ------------------------------------------------------------------
    // 3. Fetch user info (email is required by LiqPay)
    // ------------------------------------------------------------------
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // ------------------------------------------------------------------
    // 4. Build the LiqPay checkout session + persist the payment record
    // ------------------------------------------------------------------
    // Беремо baseUrl з реального запиту, щоб callback йшов на той самий домен
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    const reqHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
    const baseUrl = reqHost ? `${proto}://${reqHost}` : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
    const resultUrl = `${baseUrl}/payment/return?orderId=${orderId}&provider=liqpay`;

    const { paymentId, sessionId, paymentUrl, amount } = await createLiqPayPaymentForOrder({
      order,
      userEmail: user.email,
      baseUrl,
      resultUrl,
      // GA4 client_id captured client-side right before the redirect — used by
      // the callback webhook to send a server-side Measurement Protocol purchase event.
      gaClientId,
    });

    const duration = Date.now() - startTime;
    logger.info('LiqPay payment initiated successfully', {
      paymentId,
      orderId,
      amount,
      duration,
    });

    return NextResponse.json({
      success: true,
      paymentId,
      sessionId,
      paymentUrl, // frontend does: window.location.href = paymentUrl
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay/initiate',
    });
  }
}
