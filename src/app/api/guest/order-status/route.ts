/**
 * GET /api/guest/order-status?id=<orderId>&token=<guestToken>
 *
 * Public proxy for guest users to check their order/payment status without
 * being logged in. Access is gated by a short-lived HMAC token that was
 * embedded in the payment return URL by /api/payments/liqpay/initiate-guest.
 *
 * Returns the minimal data the payment/return page needs:
 *   { order: { id, status, totalGross, currency, payment? }, paymentStatus, orderStatus }
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { verifyGuestToken } from '@/lib/guest-token';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    // ── Rate limit: 20 req / min per IP ──────────────────────
    const ip = getClientIp(request);
    const rl = checkRateLimit(`guest-order-status:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    // ── Validate params ───────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    const token = searchParams.get('token');

    if (!orderId || !token) {
      throw new BadRequestError('Missing id or token');
    }

    // ── Verify HMAC token ─────────────────────────────────────
    const valid = await verifyGuestToken(orderId, token);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 },
      );
    }

    // ── Fetch order ───────────────────────────────────────────
    const [order] = await db
      .select({
        id: schema.order.id,
        status: schema.order.status,
        totalGross: schema.order.totalGross,
        currency: schema.order.currency,
      })
      .from(schema.order)
      .where(eq(schema.order.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // ── Fetch latest payment record ───────────────────────────
    const [payment] = await db
      .select({
        status: schema.payment.status,
        amount: schema.payment.amount,
        currency: schema.payment.currency,
      })
      .from(schema.payment)
      .where(eq(schema.payment.orderId, orderId))
      .orderBy(desc(schema.payment.createdAt))
      .limit(1);

    const paymentStatus = payment?.status ?? 'PENDING';

    return NextResponse.json({
      order: {
        ...order,
        payment: payment ?? null,
      },
      paymentStatus,
      orderStatus: order.status,
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/guest/order-status',
    });
  }
}
