import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { createLiqPayPaymentForOrder } from '@/lib/liqpay-order';
import { generateGuestToken } from '@/lib/guest-token';
import { sendPaymentLinkEmail } from '@/lib/order-emails';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

async function ensureAuthorized(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);
  if (!user || !user.role || !AUTHORIZED_ROLES.has(user.role)) {
    throw new ForbiddenError('Admin access required');
  }
}

/**
 * POST /api/admin/orders/[id]/payment-link
 *
 * Lets an admin/employee (re)generate a LiqPay checkout link for an order —
 * e.g. after applying a discount, or whenever the customer needs a fresh
 * link handed to them manually (call/chat/email). UA (LiqPay) orders only.
 *
 * Body: { sendEmail?: boolean }
 * Uses the same createLiqPayPaymentForOrder() helper as the customer-facing
 * initiate routes, so the discount (order.discountAmount) and GA4 purchase-
 * conversion attribution (order.gaClientId, captured at order creation) are
 * applied identically regardless of who triggers the payment. See
 * docs/LIQPAY_INTEGRATION.md.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();
  const endpoint = 'POST /api/admin/orders/[id]/payment-link';

  try {
    await ensureAuthorized(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const sendEmail = body?.sendEmail === true;

    const [order] = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.id, id))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }
    if (order.currency !== 'UAH') {
      throw new BadRequestError('Payment links can currently only be generated for UAH (LiqPay) orders');
    }
    if (order.status === 'COMPLETED' || order.status === 'PROCESSING') {
      throw new BadRequestError('Order is already paid or being processed');
    }

    const [orderUser] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, order.userId))
      .limit(1);

    if (!orderUser) {
      throw new NotFoundError('Order user not found');
    }

    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    const reqHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
    const baseUrl = reqHost ? `${proto}://${reqHost}` : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

    // Always guest-token-gated: the admin can't know whether the customer
    // will be logged in on whatever device eventually opens the link.
    const guestToken = await generateGuestToken(order.id);
    const resultUrl = `${baseUrl}/payment/return?orderId=${order.id}&provider=liqpay&token=${encodeURIComponent(guestToken)}`;

    const { paymentUrl, amount } = await createLiqPayPaymentForOrder({
      order,
      userEmail: orderUser.email,
      baseUrl,
      resultUrl,
    });

    if (sendEmail) {
      sendPaymentLinkEmail({
        orderId: order.id,
        orderShortId: order.id.substring(0, 8),
        customerName: orderUser.name,
        customerEmail: orderUser.email,
        amount,
        currency: 'UAH',
        locale: order.locale ?? undefined,
        paymentUrl,
      }).catch((err: unknown) =>
        logger.error('Failed to send payment link email', { orderId: order.id, error: String(err) }),
      );
    }

    logger.info('Admin generated LiqPay payment link', {
      endpoint,
      orderId: order.id,
      amount,
      emailed: sendEmail,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({ paymentUrl, amount });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint, duration: Date.now() - startTime });
  }
}
