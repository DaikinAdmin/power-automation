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

const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY || '';
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || '';

/**
 * POST /api/payments/liqpay-installments/initiate
 *
 * Same flow as /api/payments/liqpay/initiate but restricts paytypes to
 * installment options (moment_part = Monobank, paypart = PrivatBank),
 * which causes LiqPay to redirect directly to the installment checkout page.
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

    logger.info('Initiating LiqPay installment payment', {
      userId: session.user.id,
      orderId,
    });

    if (!LIQPAY_PUBLIC_KEY || !LIQPAY_PRIVATE_KEY) {
      throw new Error('LiqPay credentials (LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY) are not configured');
    }

    const [order] = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.id, orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.userId !== session.user.id) {
      throw new UnauthorizedError('Order does not belong to the current user');
    }

    if (order.status === 'COMPLETED' || order.status === 'PROCESSING') {
      throw new BadRequestError('Order is already paid or being processed');
    }

    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    const reqHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
    const baseUrl = reqHost ? `${proto}://${reqHost}` : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

    const sessionId = `${orderId}_inst_${Date.now()}`;
    const liqpayOrderId = sessionId;
    const resultUrl = `${baseUrl}/payment/return?orderId=${orderId}&provider=liqpay`;
    const serverUrl = `${baseUrl}/api/payments/liqpay/callback`;

    const amountInUah = await eurToUahAmount(order.originalTotalPrice);

    const params: LiqPayParams = {
      version: 3,
      public_key: LIQPAY_PUBLIC_KEY,
      action: 'pay',
      amount: amountInUah,
      currency: 'UAH',
      description: `Order #${orderId.substring(0, 8)} (частинами)`,
      order_id: liqpayOrderId,
      result_url: resultUrl,
      server_url: serverUrl,
      language: 'uk',
      // Restrict to installment pay types so LiqPay routes to the installment checkout
      paytypes: 'moment_part,paypart',
    };

    const paymentUrl = buildCheckoutUrl(params, LIQPAY_PRIVATE_KEY);

    logger.info('LiqPay installment checkout URL built', {
      sessionId,
      liqpayOrderId,
      amountInUah,
    });

    const now = new Date().toISOString();

    const [payment] = await db
      .insert(schema.payment)
      .values({
        id: crypto.randomUUID(),
        orderId,
        sessionId,
        merchantId: LIQPAY_PUBLIC_KEY,
        posId: null,
        amount: Math.round(amountInUah * 100),
        currency: 'UAH',
        status: 'INITIATED',
        p24Email: user.email,
        p24OrderId: liqpayOrderId,
        description: `Order #${orderId} (installments)`,
        returnUrl: resultUrl,
        statusUrl: serverUrl,
        metadata: {
          provider: 'liqpay',
          variant: 'installment',
          liqpayOrderId,
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

    const duration = Date.now() - startTime;
    logger.info('LiqPay installment payment initiated successfully', {
      paymentId: payment.id,
      orderId,
      duration,
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      sessionId,
      paymentUrl,
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay-installments/initiate',
    });
  }
}