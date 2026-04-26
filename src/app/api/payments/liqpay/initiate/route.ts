import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import crypto from 'crypto';
import { buildCheckoutUrl } from '@/lib/liqpay';
import type { LiqPayParams } from '@/lib/liqpay';
import { eurToUahAmount } from '@/lib/server-currency';

// ---------------------------------------------------------------------------
// LiqPay configuration (set these in your .env / .env.local)
// ---------------------------------------------------------------------------
const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY || '';
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || '';

/**
 * POST /api/payments/liqpay/initiate
 *
 * Initiates a LiqPay checkout session for a given order.
 * Body: { orderId: string }
 *
 * Flow:
 *  1. Authenticate the current user.
 *  2. Fetch the order and validate ownership / status.
 *  3. Build the LiqPay `data` + `signature` payload.
 *  4. Persist a `payment` record in the DB (status = INITIATED).
 *  5. Set the order status to WAITING_FOR_PAYMENT.
 *  6. Return the checkout URL so the frontend can do window.location.href.
 */

/**
 * Parses the numeric UAH amount from a formatted totalPrice string.
 * Handles: "942,41 грн", "942.41 UAH".
 * Returns null if parsing fails or string is not UAH.
 */
function parseUahFromTotalPrice(totalPrice: string | null | undefined): number | null {
  if (!totalPrice) return null;
  if (!/грн|UAH/i.test(totalPrice)) return null;
  const cleaned = totalPrice.replace(/[^\d,.]/g, '').replace(',', '.');
  const amount = parseFloat(cleaned);
  return isFinite(amount) && amount > 0 ? amount : null;
}

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
    const { orderId } = body;

    if (!orderId) {
      throw new BadRequestError('Missing required field: orderId');
    }

    logger.info('Initiating LiqPay payment', {
      userId: session.user.id,
      orderId,
    });

    // ------------------------------------------------------------------
    // 2. Validate credentials
    // ------------------------------------------------------------------
    if (!LIQPAY_PUBLIC_KEY || !LIQPAY_PRIVATE_KEY) {
      throw new Error('LiqPay credentials (LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY) are not configured');
    }

    // ------------------------------------------------------------------
    // 3. Fetch order
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
    // 4. Fetch user info (email is required by LiqPay)
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
    // 5. Build LiqPay payload
    // ------------------------------------------------------------------
    // Беремо baseUrl з реального запиту, щоб callback йшов на той самий домен
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    const reqHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
    const baseUrl = reqHost ? `${proto}://${reqHost}` : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

    /**
     * Unique session identifier for this payment attempt.
     * We embed the orderId so we can look it up in the callback.
     * Format: <orderId>_<timestamp>
     */
    const sessionId = `${orderId}_${Date.now()}`;

    /**
     * LiqPay `order_id` must be unique per transaction attempt.
     * We use sessionId so that a retry creates a new record.
     */
    const liqpayOrderId = sessionId;

    /**
     * result_url: user is redirected here after leaving the LiqPay checkout
     * (regardless of payment success/failure).
     */
    const resultUrl = `${baseUrl}/payment/return?orderId=${orderId}&provider=liqpay`;

    /**
     * server_url: LiqPay POSTs the payment result here (server-to-server).
     * Must be publicly accessible. Use ngrok for local development.
     */
    const serverUrl = `${baseUrl}/api/payments/liqpay/callback`;

    // Use the UAH amount that was shown to the user at checkout (stored in order.totalPrice,
    // e.g. "942,41 грн"). Falls back to EUR→UAH conversion if parsing fails.
    const parsedUah = parseUahFromTotalPrice(order.totalPrice);
    const amountInUah = parsedUah !== null
      ? parsedUah
      : await eurToUahAmount(order.originalTotalPrice);

    const params: LiqPayParams = {
      version: 3,
      public_key: LIQPAY_PUBLIC_KEY,
      action: 'pay',
      amount: amountInUah,
      currency: 'UAH',
      description: `Order #${orderId.substring(0, 8)}`,
      order_id: liqpayOrderId,
      result_url: resultUrl,
      server_url: serverUrl,
      language: 'uk',
      paytypes: 'card,privat24,gpay,apayqr',
    };

    // buildCheckoutUrl internally calls buildData() + buildSignature()
    const paymentUrl = buildCheckoutUrl(params, LIQPAY_PRIVATE_KEY);

    logger.info('LiqPay checkout URL built', {
      sessionId,
      liqpayOrderId,
      amountEur: order.originalTotalPrice,
      amountInUah,
      currency: 'UAH',
    });

    // ------------------------------------------------------------------
    // 6. Persist payment record
    // ------------------------------------------------------------------
    const now = new Date().toISOString();

    const [payment] = await db
      .insert(schema.payment)
      .values({
        id: crypto.randomUUID(),
        orderId,
        sessionId,           // used to find this record on callback
        merchantId: LIQPAY_PUBLIC_KEY,
        posId: null,         // P24-specific field, not used by LiqPay
        amount: Math.round(amountInUah * 100), // store in minor units (kopiyky) for consistency with P24
        currency: 'UAH',
        status: 'INITIATED',
        p24Email: user.email,
        p24OrderId: liqpayOrderId,
        description: `Order #${orderId}`,
        returnUrl: resultUrl,
        statusUrl: serverUrl,
        metadata: {
          provider: 'liqpay',
          liqpayOrderId,
          params, // full params (private key is NOT included — it was only used to sign)
        },
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // ------------------------------------------------------------------
    // 7. Update order status
    // ------------------------------------------------------------------
    await db
      .update(schema.order)
      .set({ status: 'WAITING_FOR_PAYMENT', updatedAt: now })
      .where(eq(schema.order.id, orderId));

    const duration = Date.now() - startTime;
    logger.info('LiqPay payment initiated successfully', {
      paymentId: payment.id,
      orderId,
      duration,
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      sessionId,
      paymentUrl, // frontend does: window.location.href = paymentUrl
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay/initiate',
    });
  }
}
