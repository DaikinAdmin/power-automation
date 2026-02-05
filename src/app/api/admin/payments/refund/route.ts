import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import crypto from 'crypto';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

// Przelewy24 configuration
const P24_MERCHANT_ID = process.env.P24_MERCHANT_ID || '';
const P24_POS_ID = process.env.P24_POS_ID || '';
const P24_API_KEY = process.env.P24_API_KEY || '';
const P24_CRC = process.env.P24_CRC || '';
const P24_SANDBOX = process.env.P24_SANDBOX === 'true';
const P24_API_URL = P24_SANDBOX ? 'https://sandbox.przelewy24.pl/api/v1' : 'https://secure.przelewy24.pl/api/v1';

async function ensureAuthorized(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new UnauthorizedError('Unauthorized');
  }

  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  if (!user || !user.role || !AUTHORIZED_ROLES.has(user.role)) {
    throw new UnauthorizedError('Forbidden');
  }

  return { session, role: user.role };
}

/**
 * POST /api/admin/payments/refund
 * Initiates a refund for a payment via Przelewy24
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    await ensureAuthorized(request);

    const body = await request.json();
    const { paymentId, orderId, reason } = body;

    if (!paymentId && !orderId) {
      throw new BadRequestError('Either paymentId or orderId is required');
    }

    logger.info('Initiating refund', {
      paymentId,
      orderId,
    });

    // Find payment record
    let payment;
    if (paymentId) {
      [payment] = await db
        .select()
        .from(schema.payment)
        .where(eq(schema.payment.id, paymentId))
        .limit(1);
    } else if (orderId) {
      [payment] = await db
        .select()
        .from(schema.payment)
        .where(eq(schema.payment.orderId, orderId))
        .limit(1);
    }

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if payment is eligible for refund
    if (payment.status !== 'COMPLETED' && payment.status !== 'REFUNDED') {
      throw new BadRequestError('Only completed payments can be refunded');
    }

    if (payment.status === 'REFUNDED') {
      throw new BadRequestError('Payment has already been refunded');
    }

    // Get order details
    const [order] = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.id, payment.orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Validate Przelewy24 credentials
    if (!P24_MERCHANT_ID || !P24_POS_ID || !P24_API_KEY || !payment.transactionId) {
      throw new Error('Przelewy24 credentials not configured or transaction ID missing');
    }

    // Generate signature for refund request
    const signString = JSON.stringify({
      sessionId: payment.sessionId,
      orderId: parseInt(payment.transactionId!),
      amount: payment.amount,
      currency: payment.currency,
      crc: P24_CRC,
    });
    const sign = crypto.createHash('sha384').update(signString).digest('hex');

    // Prepare refund request for Przelewy24
    const refundRequest = {
      requestId: crypto.randomUUID(),
      refunds: [{
        orderId: parseInt(payment.transactionId!),
        sessionId: payment.sessionId,
        amount: payment.amount, // Full refund
        description: reason || `Refund for order ${order.id}`,
      }],
      urlStatus: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/refund-callback`,
    };

    logger.info('Sending refund request to Przelewy24', {
      sessionId: payment.sessionId,
      amount: payment.amount,
      sandbox: P24_SANDBOX,
    });

    // Send refund request to Przelewy24
    const p24Response = await fetch(`${P24_API_URL}/transaction/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${P24_POS_ID}:${P24_API_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify(refundRequest),
    });

    const p24Data = await p24Response.json();

    if (!p24Response.ok) {
      logger.error('Przelewy24 refund failed', {
        status: p24Response.status,
        error: p24Data,
      });
      throw new Error(`Przelewy24 refund failed: ${JSON.stringify(p24Data)}`);
    }

    logger.info('Przelewy24 refund successful', {
      sessionId: payment.sessionId,
    });

    // Update payment status to REFUNDED
    const now = new Date().toISOString();
    await db
      .update(schema.payment)
      .set({
        status: 'REFUNDED',
        metadata: {
          ...(payment.metadata as any),
          refundRequest,
          refundResponse: p24Data,
          refundReason: reason,
          refundedAt: now,
        },
        updatedAt: now,
      })
      .where(eq(schema.payment.id, payment.id));

    // Update order status to REFUND
    await db
      .update(schema.order)
      .set({
        status: 'REFUND',
        updatedAt: now,
      })
      .where(eq(schema.order.id, payment.orderId));

    const duration = Date.now() - startTime;
    logger.info('Refund processed successfully', {
      paymentId: payment.id,
      orderId: payment.orderId,
      duration,
    });

    return NextResponse.json({
      success: true,
      message: 'Refund initiated successfully',
      payment: {
        id: payment.id,
        status: 'REFUNDED',
      },
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/admin/payments/refund',
    });
  }
}
