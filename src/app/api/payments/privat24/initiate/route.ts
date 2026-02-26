import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, BadRequestError } from '@/lib/error-handler';
import { auth } from '@/lib/auth';

// Privat24 / PrivatBank Merchant configuration
// const PRIVAT24_MERCHANT_ID = process.env.PRIVAT24_MERCHANT_ID || '';
// const PRIVAT24_MERCHANT_PASSWORD = process.env.PRIVAT24_MERCHANT_PASSWORD || '';

/**
 * POST /api/payments/privat24/initiate
 * Initiates a payment with Privat24 (PrivatBank Merchant)
 * Body: { orderId: string }
 */
export async function POST(request: NextRequest) {
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

    logger.info('Initiating Privat24 payment', {
      userId: session.user.id,
      orderId,
    });

    // TODO: Implement Privat24 payment initiation logic
    // 1. Fetch order from DB
    // 2. Build XML/JSON request with merchant credentials & signature (md5)
    // 3. Send request to PrivatBank API to get payment page URL
    // 4. Insert payment record
    // 5. Return paymentUrl

    return NextResponse.json({
      success: false,
      message: 'Privat24 integration not yet implemented',
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/privat24/initiate',
    });
  }
}
