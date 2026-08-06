import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { createLiqPayPaymentForOrder } from '@/lib/liqpay-order';

/**
 * POST /api/payments/liqpay-installments/initiate
 *
 * Same flow as /api/payments/liqpay/initiate but restricts paytypes to
 * installment options (moment_part = Monobank, paypart = PrivatBank),
 * which causes LiqPay to redirect directly to the installment checkout page.
 * Delegates to createLiqPayPaymentForOrder() (src/lib/liqpay-order.ts) with
 * variant: 'installment' — shared with the regular initiate routes and the
 * admin payment-link route.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const body = await request.json();
    const { orderId, gaClientId } = body;

    if (!orderId) {
      throw new BadRequestError('Missing required field: orderId');
    }

    logger.info('Initiating LiqPay installment payment', {
      userId: session.user.id,
      orderId,
    });

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
    const resultUrl = `${baseUrl}/payment/return?orderId=${orderId}&provider=liqpay`;

    const { paymentId, sessionId, paymentUrl, amount } = await createLiqPayPaymentForOrder({
      order,
      userEmail: user.email,
      baseUrl,
      resultUrl,
      gaClientId,
      variant: 'installment',
    });

    const duration = Date.now() - startTime;
    logger.info('LiqPay installment payment initiated successfully', {
      paymentId,
      orderId,
      amount,
      duration,
    });

    return NextResponse.json({
      success: true,
      paymentId,
      sessionId,
      paymentUrl,
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay-installments/initiate',
    });
  }
}
