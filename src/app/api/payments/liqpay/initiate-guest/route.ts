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
import { buildCheckoutUrl } from '@/lib/liqpay';
import type { LiqPayParams } from '@/lib/liqpay';
import { generateGuestToken } from '@/lib/guest-token';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY || '';
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || '';

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
    const { orderId } = body;

    if (!orderId) {
      throw new BadRequestError('Missing required field: orderId');
    }

    if (!LIQPAY_PUBLIC_KEY || !LIQPAY_PRIVATE_KEY) {
      throw new Error('LiqPay credentials are not configured');
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

    const sessionId = `${orderId}_${Date.now()}`;
    const guestToken = await generateGuestToken(orderId);
    const resultUrl = `${baseUrl}/payment/return?orderId=${orderId}&provider=liqpay&token=${encodeURIComponent(guestToken)}`;
    const serverUrl = `${baseUrl}/api/payments/liqpay/callback`;

    const params: LiqPayParams = {
      version: 3,
      public_key: LIQPAY_PUBLIC_KEY,
      action: 'pay',
      amount: order.totalGross > 0 ? order.totalGross : 0,
      currency: 'UAH',
      description: `Order #${orderId.substring(0, 8)}`,
      order_id: sessionId,
      result_url: resultUrl,
      server_url: serverUrl,
      language: 'uk',
      paytypes: 'card,privat24,gpay,apayqr',
    };

    const paymentUrl = buildCheckoutUrl(params, LIQPAY_PRIVATE_KEY);

    const now = new Date().toISOString();

    const [payment] = await db
      .insert(schema.payment)
      .values({
        id: crypto.randomUUID(),
        orderId,
        sessionId,
        merchantId: LIQPAY_PUBLIC_KEY,
        posId: null,
        amount: Math.round((order.totalGross > 0 ? order.totalGross : 0) * 100),
        currency: 'UAH',
        status: 'INITIATED',
        p24Email: user.email,
        p24OrderId: sessionId,
        description: `Order #${orderId}`,
        returnUrl: resultUrl,
        statusUrl: serverUrl,
        metadata: {
          provider: 'liqpay',
          liqpayOrderId: sessionId,
          params,
        },
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await db
      .update(schema.order)
      .set({ status: 'WAITING_FOR_PAYMENT', updatedAt: now })
      .where(eq(schema.order.id, orderId));

    logger.info('LiqPay guest payment initiated', {
      paymentId: payment.id,
      orderId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      sessionId,
      paymentUrl,
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay/initiate-guest',
    });
  }
}
