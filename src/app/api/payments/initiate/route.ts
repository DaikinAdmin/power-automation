import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import crypto from 'crypto';

// Przelewy24 configuration - these should be in environment variables
const P24_MERCHANT_ID = process.env.P24_MERCHANT_ID || '';
const P24_POS_ID = process.env.P24_POS_ID || '';
const P24_API_KEY = process.env.P24_API_KEY || '';
const P24_CRC = process.env.P24_CRC || '';
const P24_SANDBOX = process.env.P24_SANDBOX === 'true';
const P24_API_URL = P24_SANDBOX ? 'https://sandbox.przelewy24.pl/api/v1' : 'https://secure.przelewy24.pl/api/v1';

interface P24RegisterRequest {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  currency: string;
  description: string;
  email: string;
  client?: string;
  country?: string;
  language?: string;
  urlReturn: string;
  urlStatus: string;
  sign: string;
}

/**
 * POST /api/payments/initiate
 * Initiates a payment with Przelewy24
 * Body: { orderId: string }
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

    logger.info('Initiating payment', { 
      userId: session.user.id,
      orderId 
    });

    // Validate Przelewy24 credentials
    if (!P24_MERCHANT_ID || !P24_POS_ID || !P24_API_KEY || !P24_CRC) {
      throw new Error('Przelewy24 credentials not configured');
    }

    // Fetch the order
    const [order] = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.id, orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify the order belongs to the user
    if (order.userId !== session.user.id) {
      throw new UnauthorizedError('Order does not belong to the user');
    }

    // Check if order is already paid or in process
    if (order.status === 'COMPLETED' || order.status === 'PROCESSING') {
      throw new BadRequestError('Order is already being processed or completed');
    }

    // Get user info
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Calculate amount in grosze (1 PLN = 100 grosze)
    const amountInGrosze = Math.round(order.originalTotalPrice * 100);

    // Generate unique session ID for Przelewy24
    const sessionId = `${orderId}_${Date.now()}`;

    // Prepare return and status URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/payment/return?orderId=${orderId}`;
    const statusUrl = `${baseUrl}/api/payments/callback`;

    // Calculate signature (sign)
    const signString = JSON.stringify({
      sessionId,
      merchantId: parseInt(P24_MERCHANT_ID),
      amount: amountInGrosze,
      currency: 'PLN',
      crc: P24_CRC,
    });
    const sign = crypto.createHash('sha384').update(signString).digest('hex');

    // Prepare request for Przelewy24
    const p24Request: P24RegisterRequest = {
      merchantId: parseInt(P24_MERCHANT_ID),
      posId: parseInt(P24_POS_ID),
      sessionId,
      amount: amountInGrosze,
      currency: 'PLN',
      description: `Order #${orderId}`,
      email: user.email,
      client: user.name || user.email,
      country: 'PL',
      language: 'pl',
      urlReturn: returnUrl,
      urlStatus: statusUrl,
      sign,
    };

    logger.info('Sending request to Przelewy24', {
      sessionId,
      amount: amountInGrosze,
      sandbox: P24_SANDBOX,
    });

    // Register transaction with Przelewy24
    const p24Response = await fetch(`${P24_API_URL}/transaction/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${P24_POS_ID}:${P24_API_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify(p24Request),
    });

    const p24Data = await p24Response.json();

    if (!p24Response.ok) {
      logger.error('Przelewy24 registration failed', {
        status: p24Response.status,
        error: p24Data,
      });
      throw new Error(`Przelewy24 registration failed: ${JSON.stringify(p24Data)}`);
    }

    logger.info('Przelewy24 registration successful', {
      sessionId,
      token: p24Data.data?.token,
    });

    // Create payment record in database
    const now = new Date().toISOString();
    const [payment] = await db
      .insert(schema.payment)
      .values({
        id: crypto.randomUUID(),
        orderId,
        sessionId,
        merchantId: P24_MERCHANT_ID,
        posId: P24_POS_ID,
        amount: amountInGrosze,
        currency: 'PLN',
        status: 'INITIATED',
        p24Email: user.email,
        p24OrderId: orderId,
        description: `Order #${orderId}`,
        returnUrl,
        statusUrl,
        metadata: {
          token: p24Data.data?.token,
          p24Response: p24Data,
        },
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Update order status to WAITING_FOR_PAYMENT
    await db
      .update(schema.order)
      .set({
        status: 'WAITING_FOR_PAYMENT',
        updatedAt: now,
      })
      .where(eq(schema.order.id, orderId));

    const duration = Date.now() - startTime;
    logger.info('Payment initiated successfully', {
      paymentId: payment.id,
      orderId,
      duration,
    });

    // Return payment URL to redirect user
    const paymentUrl = P24_SANDBOX
      ? `https://sandbox.przelewy24.pl/trnRequest/${p24Data.data?.token}`
      : `https://secure.przelewy24.pl/trnRequest/${p24Data.data?.token}`;

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      sessionId,
      paymentUrl,
      token: p24Data.data?.token,
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/initiate',
    });
  }
}
