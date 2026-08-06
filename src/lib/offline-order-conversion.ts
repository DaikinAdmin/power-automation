/**
 * GA4 purchase conversion for orders paid *outside* LiqPay (bank_transfer /
 * cash_on_delivery on the UA domain) — these never get a `payment` row, so
 * the claim-conversion / ga4-conversion-sweep flow (keyed off
 * payment.conversionSentAt) never sees them.
 *
 * Confirmation happens in the *admin's* browser (marking the order
 * PROCESSING/COMPLETED after a bank transfer clears or a COD parcel is
 * confirmed), not the customer's — so this can't be a client-side
 * dataLayer.push like a normal checkout purchase; it has to go through the
 * server-side GA4 Measurement Protocol, keyed off the GA4 client_id captured
 * on the order at creation time (order.gaClientId — see
 * src/app/api/orders/shared.ts). Dedup guard: order.conversionSentAt,
 * mirroring payment.conversionSentAt. See docs/LIQPAY_INTEGRATION.md.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { getOrderPayableAmount } from '@/lib/liqpay';
import { sendGA4PurchaseEvent } from '@/lib/ga4-measurement-protocol';
import { computeLineItemDerived, parseStoredLineItems } from '@/app/api/orders/shared';

/**
 * Call after an order transitions to PROCESSING/COMPLETED. No-ops unless the
 * order is UAH, has no completed LiqPay payment (that path already handles
 * its own conversion), and hasn't already been claimed. Never throws — logs
 * and returns on any failure so it's always safe to fire-and-forget.
 */
export async function fireOfflineOrderConversionIfNeeded(orderId: string): Promise<void> {
  try {
    const [order] = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.id, orderId))
      .limit(1);

    if (!order || order.currency !== 'UAH' || order.conversionSentAt) return;

    // LiqPay/Przelewy24 orders already get their conversion via
    // claim-conversion / the sweep once their payment completes — only fire
    // this path for orders with no completed payment at all.
    const [completedPayment] = await db
      .select({ id: schema.payment.id })
      .from(schema.payment)
      .where(and(eq(schema.payment.orderId, orderId), eq(schema.payment.status, 'COMPLETED')))
      .limit(1);
    if (completedPayment) return;

    if (!order.gaClientId) {
      logger.info('Offline order conversion: no client_id captured, skipping GA4 send', { orderId });
      return;
    }

    // Atomic claim — same dedup pattern as payment.conversionSentAt.
    const [claimed] = await db
      .update(schema.order)
      .set({ conversionSentAt: new Date().toISOString() })
      .where(and(eq(schema.order.id, orderId), isNull(schema.order.conversionSentAt)))
      .returning();
    if (!claimed) return; // lost the race — someone else already claimed it

    const lineItems = parseStoredLineItems(claimed.lineItems).map(computeLineItemDerived);
    const sent = await sendGA4PurchaseEvent({
      clientId: order.gaClientId, // narrowed non-null above; same row as `claimed`
      transactionId: claimed.id,
      value: getOrderPayableAmount(claimed),
      currency: claimed.currency,
      items: lineItems.map((li) => ({
        item_id: li.articleId,
        item_name: li.name || li.articleId,
        price: li.unitPriceGrossConverted ?? 0,
        quantity: li.quantity,
      })),
    });

    logger.info('Offline order conversion processed', { orderId, sent });
  } catch (error) {
    logger.error('Offline order conversion failed', { orderId, error: String(error) });
  }
}
