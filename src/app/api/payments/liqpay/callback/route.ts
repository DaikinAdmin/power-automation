import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';
import {
  verifyCallbackSignature,
  decodeCallbackData,
  LIQPAY_SUCCESS_STATUSES,
  LIQPAY_FAILURE_STATUSES,
} from '@/lib/liqpay';
import {
  sendPaymentSuccessEmails,
  type PaymentEmailData,
} from '@/lib/order-emails';
import { computeLineItemDerived } from '@/app/api/orders/shared';

// ---------------------------------------------------------------------------
// LiqPay configuration
// ---------------------------------------------------------------------------
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || '';

/**
 * POST /api/payments/liqpay/callback
 *
 * Server-to-server webhook called by LiqPay after every status change.
 * Configured via the `server_url` parameter when creating the checkout.
 *
 * LiqPay POSTs an application/x-www-form-urlencoded body with two fields:
 *   data      – base64-encoded JSON string with payment details
 *   signature – base64( SHA-1( PRIVATE_KEY + data + PRIVATE_KEY ) )
 *
 * Verification flow:
 *  1. Re-compute the expected signature using our private key.
 *  2. Compare with the received signature (constant-time to prevent timing attacks).
 *  3. If valid, decode the data JSON and act on the payment status.
 *  4. Return HTTP 200 unconditionally (LiqPay will retry on non-200).
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ------------------------------------------------------------------
    // 1. Parse the form-encoded body
    // ------------------------------------------------------------------
    const formData = await request.formData();
    const data = formData.get('data') as string | null;
    const signature = formData.get('signature') as string | null;

    if (!data || !signature) {
      throw new BadRequestError('Missing required fields: data and/or signature');
    }

    logger.info('Received LiqPay callback', {
      // Log only a short preview; never log raw private-key-derived material in prod
      dataPreview: data.substring(0, 30) + '...',
    });

    // ------------------------------------------------------------------
    // 2. Verify the signature — reject immediately if it doesn't match
    // ------------------------------------------------------------------
    if (!LIQPAY_PRIVATE_KEY) {
      throw new Error('LIQPAY_PRIVATE_KEY is not configured on the server');
    }

    const isValid = verifyCallbackSignature(data, signature, LIQPAY_PRIVATE_KEY);

    if (!isValid) {
      logger.error('LiqPay callback: invalid signature — possible spoofing attempt', {
        receivedSignature: signature,
      });
      // Return 200 to avoid LiqPay thinking the endpoint is down,
      // but do NOT process the payment
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 200 });
    }

    // ------------------------------------------------------------------
    // 3. Decode the payload
    // ------------------------------------------------------------------
    const payload = decodeCallbackData(data);

    logger.info('LiqPay callback decoded', {
      liqpayOrderId: payload.liqpay_order_id,
      ourOrderId: payload.order_id,
      status: payload.status,
      amount: payload.amount,
      currency: payload.currency,
    });

    /**
     * `order_id` in the LiqPay payload is what we passed as `liqpayOrderId`
     * during initiation — which is our internal `sessionId` (format: <orderId>_<ts>).
     * We stored it in the payment table's `sessionId` column.
     */
    const sessionId = payload.order_id;

    // ------------------------------------------------------------------
    // 4. Find the payment record by sessionId
    // ------------------------------------------------------------------
    const [payment] = await db
      .select()
      .from(schema.payment)
      .where(eq(schema.payment.sessionId, sessionId))
      .limit(1);

    if (!payment) {
      logger.error('LiqPay callback: payment record not found', { sessionId });
      // Return 200 so LiqPay doesn't retry — this could be a stale/unknown sessionId
      return NextResponse.json({ success: false, message: 'Payment record not found' }, { status: 200 });
    }

    const now = new Date().toISOString();

    // ------------------------------------------------------------------
    // 5. Handle terminal success statuses
    // ------------------------------------------------------------------
    if (LIQPAY_SUCCESS_STATUSES.includes(payload.status)) {
      // Mark payment as COMPLETED
      await db
        .update(schema.payment)
        .set({
          status: 'COMPLETED',
          transactionId: String(payload.payment_id),
          paymentMethod: payload.paytype,
          metadata: {
            ...(payment.metadata as Record<string, unknown>),
            liqpayStatus: payload.status,
            callbackPayload: payload,
          },
          updatedAt: now,
        })
        .where(eq(schema.payment.id, payment.id));

      // Advance the order to PROCESSING (fulfil order obligations)
      await db
        .update(schema.order)
        .set({ status: 'PROCESSING', updatedAt: now })
        .where(eq(schema.order.id, payment.orderId));

      const duration = Date.now() - startTime;
      logger.info('LiqPay payment completed successfully', {
        paymentId: payment.id,
        orderId: payment.orderId,
        liqpayPaymentId: payload.payment_id,
        duration,
      });

      // Send payment success emails (non-blocking)
      try {
        const [paidOrder] = await db
          .select()
          .from(schema.order)
          .where(eq(schema.order.id, payment.orderId))
          .limit(1);
        const [orderUser] = await db
          .select()
          .from(schema.user)
          .where(eq(schema.user.id, paidOrder.userId))
          .limit(1);

        if (orderUser && paidOrder) {
          const lineItems = Array.isArray(paidOrder.lineItems) ? paidOrder.lineItems as any[] : [];
          const orderNotes = paidOrder.notes as Record<string, unknown> | null;
          const emailData: PaymentEmailData = {
            orderId: paidOrder.id,
            orderShortId: paidOrder.id.substring(0, 8),
            customerName: orderUser.name,
            customerEmail: orderUser.email,
            customerPhone: orderUser.phoneNumber || undefined,
            companyName: orderUser.companyName || undefined,
            totalGross: paidOrder.totalGross ?? 0,
            currency: paidOrder.currency ?? 'UAH',
            locale: typeof orderNotes?.locale === 'string' ? orderNotes.locale : undefined,
            lineItems: lineItems.map((li: any) => {
              const derived = computeLineItemDerived(li);
              return {
                name: li.name || li.articleId,
                articleId: li.articleId,
                quantity: li.quantity,
                unitPriceGross: derived.unitPriceGrossConverted,
                lineTotalGrossConverted: derived.lineTotalGrossConverted,
                warehouseName: li.warehouseName,
              };
            }),
            paymentMethod: payload.paytype || 'LiqPay',
            paymentAmount: payload.amount,
            paymentCurrency: payload.currency || 'UAH',
            transactionId: String(payload.payment_id),
          };
          sendPaymentSuccessEmails(emailData);
        }
      } catch (emailErr) {
        logger.error('Failed to send payment success emails from callback', { error: String(emailErr) });
      }
    }
    // ------------------------------------------------------------------
    // 6. Handle terminal failure / reversal statuses
    // ------------------------------------------------------------------
    else if (LIQPAY_FAILURE_STATUSES.includes(payload.status)) {
      await db
        .update(schema.payment)
        .set({
          status: 'FAILED',
          errorCode: payload.err_code || payload.status,
          errorMessage: payload.err_description || `LiqPay status: ${payload.status}`,
          metadata: {
            ...(payment.metadata as Record<string, unknown>),
            liqpayStatus: payload.status,
            callbackPayload: payload,
          },
          updatedAt: now,
        })
        .where(eq(schema.payment.id, payment.id));

      // Revert order back to NEW so the user can retry
      await db
        .update(schema.order)
        .set({ status: 'NEW', updatedAt: now })
        .where(eq(schema.order.id, payment.orderId));

      logger.warn('LiqPay payment failed', {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payload.status,
        errCode: payload.err_code,
        errDescription: payload.err_description,
      });
    }
    // ------------------------------------------------------------------
    // 7. Handle intermediate / pending statuses (do not change order status)
    // ------------------------------------------------------------------
    else {
      // Persist the latest status snapshot in metadata for visibility
      await db
        .update(schema.payment)
        .set({
          metadata: {
            ...(payment.metadata as Record<string, unknown>),
            liqpayStatus: payload.status,
            lastCallbackPayload: payload,
          },
          updatedAt: now,
        })
        .where(eq(schema.payment.id, payment.id));

      logger.info('LiqPay callback: intermediate status, no action taken', {
        paymentId: payment.id,
        status: payload.status,
      });
    }

    // LiqPay requires an HTTP 200 response to stop retry attempts
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/payments/liqpay/callback',
    });
  }
}

/**
 * GET /api/payments/liqpay/callback
 *
 * LiqPay may redirect the buyer's browser here after checkout if `result_url`
 * is not set. In our setup `result_url` points to /payment/return, so this
 * handler is a safety net.
 *
 * NOTE: Do NOT update payment status from this handler — use POST (server_url)
 * for that, because the GET redirect is browser-initiated and not signed.
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('User returned from LiqPay checkout (GET fallback)', {
      url: request.url,
    });

    return NextResponse.json({
      success: true,
      message: 'LiqPay return received. Payment status is updated via server callback.',
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/payments/liqpay/callback',
    });
  }
}
