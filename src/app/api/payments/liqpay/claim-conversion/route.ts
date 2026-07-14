/**
 * POST /api/payments/liqpay/claim-conversion
 *
 * Called by /payment/return once it observes a COMPLETED payment. Atomically
 * "claims" the right to report the GA4 purchase conversion for this payment —
 * if this call wins the race (payment.conversionSentAt was still NULL), the
 * caller is expected to push a live client-side `purchase` event to
 * dataLayer using the returned data.
 *
 * If the buyer never returns to claim it, src/lib/ga4-conversion-sweep.ts
 * eventually claims it instead and reports the conversion server-side via
 * the GA4 Measurement Protocol. Either way the conversion fires exactly once
 * — see docs/LIQPAY_INTEGRATION.md.
 *
 * Body: { orderId: string, token?: string }
 *   `token` is the guest-flow HMAC token (present for unauthenticated quick orders).
 *   Without it, the caller must have a session that owns the order.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { and, desc, eq, isNull } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { apiErrorHandler, BadRequestError, NotFoundError, UnauthorizedError } from '@/lib/error-handler';
import { verifyGuestToken } from '@/lib/guest-token';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { computeLineItemDerived, parseStoredLineItems } from '@/app/api/orders/shared';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`liqpay-claim-conversion:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await request.json();
    const { orderId, token } = body;

    if (!orderId) {
      throw new BadRequestError('Missing required field: orderId');
    }

    // ------------------------------------------------------------------
    // Access check: guest token OR a session that owns this order
    // ------------------------------------------------------------------
    if (token) {
      const valid = await verifyGuestToken(orderId, token);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    } else {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const [order] = await db
        .select({ userId: schema.order.userId })
        .from(schema.order)
        .where(eq(schema.order.id, orderId))
        .limit(1);
      if (!order || order.userId !== session.user.id) {
        throw new NotFoundError('Order not found');
      }
    }

    // ------------------------------------------------------------------
    // Find the completed LiqPay payment for this order
    // ------------------------------------------------------------------
    const [payment] = await db
      .select()
      .from(schema.payment)
      .where(and(eq(schema.payment.orderId, orderId), eq(schema.payment.status, 'COMPLETED')))
      .orderBy(desc(schema.payment.createdAt))
      .limit(1);

    if (!payment) {
      return NextResponse.json({ claimed: false });
    }

    // ------------------------------------------------------------------
    // Atomic claim — only the caller that sees conversionSentAt still NULL wins
    // ------------------------------------------------------------------
    const [claimed] = await db
      .update(schema.payment)
      .set({ conversionSentAt: new Date().toISOString() })
      .where(and(eq(schema.payment.id, payment.id), isNull(schema.payment.conversionSentAt)))
      .returning();

    if (!claimed) {
      return NextResponse.json({ claimed: false });
    }

    const [order] = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ claimed: false });
    }

    const lineItems = parseStoredLineItems(order.lineItems).map(computeLineItemDerived);

    return NextResponse.json({
      claimed: true,
      purchase: {
        transactionId: claimed.transactionId || claimed.id,
        value: order.totalGross,
        currency: order.currency,
        items: lineItems.map((li) => ({
          item_id: li.articleId,
          item_name: li.name || li.articleId,
          price: li.unitPriceGrossConverted ?? 0,
          quantity: li.quantity,
        })),
      },
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay/claim-conversion',
    });
  }
}
