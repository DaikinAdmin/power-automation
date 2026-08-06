/**
 * Shared "create a LiqPay payment for an order" logic — used by the
 * customer-facing initiate/initiate-guest routes (regular + installments)
 * and by the admin payment-link route, so the discount/gaClientId handling
 * can't drift out of sync between them. See docs/LIQPAY_INTEGRATION.md.
 */
import crypto from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { buildCheckoutUrl, getOrderPayableAmount, type LiqPayParams } from '@/lib/liqpay';

const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY || '';
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || '';

const DEFAULT_PAYTYPES = 'card,privat24,gpay,apayqr';
const INSTALLMENT_PAYTYPES = 'moment_part,paypart';

export interface CreateLiqPayPaymentParams {
  order: typeof schema.order.$inferSelect;
  userEmail: string;
  baseUrl: string;
  resultUrl: string;
  /** Prefer a live browser-captured value; falls back to order.gaClientId if omitted. */
  gaClientId?: string | null;
  /** 'installment' restricts LiqPay's checkout to moment_part/paypart pay types. */
  variant?: 'installment';
}

export interface CreateLiqPayPaymentResult {
  paymentId: string;
  sessionId: string;
  paymentUrl: string;
  amount: number;
}

export async function createLiqPayPaymentForOrder({
  order,
  userEmail,
  baseUrl,
  resultUrl,
  gaClientId,
  variant,
}: CreateLiqPayPaymentParams): Promise<CreateLiqPayPaymentResult> {
  if (!LIQPAY_PUBLIC_KEY || !LIQPAY_PRIVATE_KEY) {
    throw new Error('LiqPay credentials (LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY) are not configured');
  }

  const amount = getOrderPayableAmount(order);

  // Reuse a still-pending session for this exact variant instead of spawning a
  // new one on every "pay" click — but only if its amount still matches the
  // order's current payable amount (a discount applied after the pending
  // session was created makes it stale, so we fall through and create fresh).
  const pendingPayments = await db
    .select()
    .from(schema.payment)
    .where(and(eq(schema.payment.orderId, order.id), eq(schema.payment.status, 'INITIATED')))
    .orderBy(desc(schema.payment.createdAt));

  const reusable = pendingPayments.find((p) => {
    const meta = p.metadata as { variant?: string; params?: LiqPayParams } | null;
    return (meta?.variant ?? undefined) === variant && meta?.params?.amount === amount;
  });

  if (reusable) {
    const meta = reusable.metadata as { params: LiqPayParams };
    return {
      paymentId: reusable.id,
      sessionId: reusable.sessionId!,
      paymentUrl: buildCheckoutUrl(meta.params, LIQPAY_PRIVATE_KEY),
      amount,
    };
  }

  const sessionId = variant === 'installment' ? `${order.id}_inst_${Date.now()}` : `${order.id}_${Date.now()}`;
  const serverUrl = `${baseUrl}/api/payments/liqpay/callback`;
  const descriptionSuffix = variant === 'installment' ? ' (частинами)' : '';

  const params: LiqPayParams = {
    version: 3,
    public_key: LIQPAY_PUBLIC_KEY,
    action: 'pay',
    amount,
    currency: 'UAH',
    description: `Order #${order.id.substring(0, 8)}${descriptionSuffix}`,
    order_id: sessionId,
    result_url: resultUrl,
    server_url: serverUrl,
    language: 'uk',
    paytypes: variant === 'installment' ? INSTALLMENT_PAYTYPES : DEFAULT_PAYTYPES,
  };

  const paymentUrl = buildCheckoutUrl(params, LIQPAY_PRIVATE_KEY);
  const now = new Date().toISOString();

  const [payment] = await db
    .insert(schema.payment)
    .values({
      id: crypto.randomUUID(),
      orderId: order.id,
      sessionId,
      merchantId: LIQPAY_PUBLIC_KEY,
      posId: null,
      amount: Math.round(amount * 100), // minor units (kopiyky), consistent with P24
      currency: 'UAH',
      status: 'INITIATED',
      p24Email: userEmail,
      p24OrderId: sessionId,
      description: `Order #${order.id}${descriptionSuffix}`,
      returnUrl: resultUrl,
      statusUrl: serverUrl,
      // Live value from the current browser wins; otherwise fall back to what
      // was captured on the order at creation time (see src/app/api/orders/shared.ts) —
      // needed for payments created with no browser present (admin-generated links).
      gaClientId: gaClientId || order.gaClientId || null,
      metadata: {
        provider: 'liqpay',
        variant,
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
    .where(eq(schema.order.id, order.id));

  return { paymentId: payment.id, sessionId, paymentUrl, amount };
}
