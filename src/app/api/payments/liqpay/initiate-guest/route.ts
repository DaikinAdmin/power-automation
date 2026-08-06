/**
 * POST /api/payments/liqpay/initiate-guest
 *
 * TEMPORARY endpoint — no authentication required.
 * Used by the guest quick-order flow to initiate LiqPay payment.
 *
 * Body: { orderId: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { createLiqPayPaymentForOrder } from '@/lib/liqpay-order';
import { generateGuestToken } from '@/lib/guest-token';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ── Rate limit: 5 req / min per IP ─────────────────────────
    const ip = getClientIp(request);
    const rl = checkRateLimit(`liqpay-initiate-guest:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await request.json();
    const { orderId, gaClientId } = body;

    if (!orderId) {
      throw new BadRequestError('Missing required field: orderId');
    }

    // Fetch order
    const [order] = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.id, orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status === 'COMPLETED' || order.status === 'PROCESSING') {
      throw new BadRequestError('Order is already paid or being processed');
    }

    // Fetch user for email
    const [user] = await db
      .select({ email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, order.userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    const reqHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
    const baseUrl = reqHost ? `${proto}://${reqHost}` : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

    const guestToken = await generateGuestToken(orderId);
    const resultUrl = `${baseUrl}/payment/return?orderId=${orderId}&provider=liqpay&token=${encodeURIComponent(guestToken)}`;

    const { paymentId, sessionId, paymentUrl } = await createLiqPayPaymentForOrder({
      order,
      userEmail: user.email,
      baseUrl,
      resultUrl,
      // GA4 client_id captured client-side right before the redirect — used by
      // the callback webhook to send a server-side Measurement Protocol purchase event.
      gaClientId,
    });

    logger.info('LiqPay guest payment initiated', {
      paymentId,
      orderId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      paymentId,
      sessionId,
      paymentUrl,
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay/initiate-guest',
    });
  }
}
