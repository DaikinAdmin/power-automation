import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';
import crypto from 'crypto';

// Przelewy24 configuration
const P24_MERCHANT_ID = process.env.P24_MERCHANT_ID || '';
const P24_POS_ID = process.env.P24_POS_ID || '';
const P24_API_KEY = process.env.P24_API_KEY || '';
const P24_CRC = process.env.P24_CRC || '';
const P24_SANDBOX = process.env.P24_SANDBOX === 'true';
const P24_API_URL = P24_SANDBOX ? 'https://sandbox.przelewy24.pl/api/v1' : 'https://secure.przelewy24.pl/api/v1';

interface P24NotificationData {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
  sign: string;
}

interface P24VerifyRequest {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  currency: string;
  orderId: number;
  sign: string;
}

/**
 * POST /api/payments/callback
 * Handles payment status notifications from Przelewy24
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json() as P24NotificationData;
    
    logger.info('Received payment callback', {
      sessionId: body.sessionId,
      amount: body.amount,
      orderId: body.orderId,
    });

    // Validate required fields
    if (!body.sessionId || !body.amount || !body.merchantId || !body.sign) {
      throw new BadRequestError('Missing required fields in callback');
    }

    // Verify signature
    const signString = JSON.stringify({
      sessionId: body.sessionId,
      orderId: body.orderId,
      amount: body.amount,
      originAmount: body.originAmount,
      currency: body.currency,
      crc: P24_CRC,
    });
    const expectedSign = crypto.createHash('sha384').update(signString).digest('hex');

    if (body.sign !== expectedSign) {
      logger.error('Invalid signature in payment callback', {
        sessionId: body.sessionId,
        receivedSign: body.sign,
        expectedSign,
      });
      throw new BadRequestError('Invalid signature');
    }

    // Find payment record by sessionId
    const [payment] = await db
      .select()
      .from(schema.payment)
      .where(eq(schema.payment.sessionId, body.sessionId))
      .limit(1);

    if (!payment) {
      logger.error('Payment not found', { sessionId: body.sessionId });
      throw new BadRequestError('Payment not found');
    }

    // Verify the transaction with Przelewy24
    const verifyRequest: P24VerifyRequest = {
      merchantId: parseInt(P24_MERCHANT_ID),
      posId: parseInt(P24_POS_ID),
      sessionId: body.sessionId,
      amount: body.amount,
      currency: body.currency,
      orderId: body.orderId,
      sign: expectedSign,
    };

    logger.info('Verifying transaction with Przelewy24', {
      sessionId: body.sessionId,
    });

    const verifyResponse = await fetch(`${P24_API_URL}/transaction/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${P24_POS_ID}:${P24_API_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify(verifyRequest),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      logger.error('Transaction verification failed', {
        sessionId: body.sessionId,
        status: verifyResponse.status,
        error: verifyData,
      });
      
      // Update payment status to FAILED
      const now = new Date().toISOString();
      await db
        .update(schema.payment)
        .set({
          status: 'FAILED',
          errorCode: verifyData.code?.toString(),
          errorMessage: verifyData.error || 'Transaction verification failed',
          metadata: {
            ...payment.metadata as any,
            verifyResponse: verifyData,
            callbackData: body,
          },
          updatedAt: now,
        })
        .where(eq(schema.payment.id, payment.id));

      throw new Error(`Transaction verification failed: ${JSON.stringify(verifyData)}`);
    }

    logger.info('Transaction verified successfully', {
      sessionId: body.sessionId,
    });

    // Update payment status to COMPLETED
    const now = new Date().toISOString();
    await db
      .update(schema.payment)
      .set({
        status: 'COMPLETED',
        transactionId: body.orderId.toString(),
        paymentMethod: body.statement,
        metadata: {
          ...payment.metadata as any,
          methodId: body.methodId,
          verifyResponse: verifyData,
          callbackData: body,
        },
        updatedAt: now,
      })
      .where(eq(schema.payment.id, payment.id));

    // Update order status to PROCESSING
    await db
      .update(schema.order)
      .set({
        status: 'PROCESSING',
        updatedAt: now,
      })
      .where(eq(schema.order.id, payment.orderId));

    const duration = Date.now() - startTime;
    logger.info('Payment callback processed successfully', {
      paymentId: payment.id,
      orderId: payment.orderId,
      duration,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/callback',
    });
  }
}

/**
 * GET /api/payments/callback
 * Handles payment return from Przelewy24 (user redirect)
 */
export async function GET(request: NextRequest) {
  try {
    // This endpoint is for when the user returns from Przelewy24
    // The actual payment verification is done via POST webhook
    
    logger.info('User returned from payment gateway', {
      url: request.url,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment return received',
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/payments/callback',
    });
  }
}
