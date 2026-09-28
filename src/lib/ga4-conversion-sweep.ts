/**
 * Offline conversion fallback for online-gateway payments (LiqPay on the UA
 * domain, Przelewy24 on PL).
 *
 * The buyer's browser gets first shot at reporting a purchase conversion
 * (see /api/payments/claim-conversion, called from /payment/return). This
 * sweep catches payments that were confirmed COMPLETED but never got
 * claimed — because the buyer closed the tab, the redirect failed, etc. —
 * and reports them server-side via the GA4 Measurement Protocol instead.
 *
 * Each payment is routed to its own domain's GA4 property, resolved from the
 * gateway provider (see getOnlineGatewayDomainKey) — never guessed, so a UA
 * payment can't land in the PL property. Payments that didn't go through a
 * gateway (e.g. an invoice marked paid by an admin) already reported
 * `order_confirm_offline` at checkout, so they are claimed and skipped rather
 * than double-counted as a `purchase`.
 *
 * Started once from src/instrumentation.ts on server boot. See
 * docs/LIQPAY_INTEGRATION.md for the full algorithm.
 */
import { db } from '@/db';
import { and, eq, isNull, lt } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { computeLineItemDerived, parseStoredLineItems } from '@/app/api/orders/shared';
import { sendGA4PurchaseEvent } from '@/lib/ga4-measurement-protocol';
import { getOrderPayableAmount } from '@/lib/liqpay';
import { getOnlineGatewayDomainKey } from '@/lib/domain-config';

// How long the browser gets to claim the conversion itself before we fall back.
const GRACE_PERIOD_MS = 10 * 60 * 1000;

export async function sweepUnclaimedConversions(): Promise<void> {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_MS).toISOString();

  const staleCandidates = await db
    .select()
    .from(schema.payment)
    .where(
      and(
        eq(schema.payment.status, 'COMPLETED'),
        isNull(schema.payment.conversionSentAt),
        lt(schema.payment.updatedAt, cutoff),
      ),
    );

  for (const payment of staleCandidates) {
    try {
      // Same dedup guard as the browser path — whichever gets here first wins.
      // Note we claim before deciding whether to send: a row we skip must not
      // stay a candidate, or every pass would reconsider it forever.
      const [claimed] = await db
        .update(schema.payment)
        .set({ conversionSentAt: new Date().toISOString() })
        .where(and(eq(schema.payment.id, payment.id), isNull(schema.payment.conversionSentAt)))
        .returning();

      if (!claimed) continue; // the browser claimed it in the meantime

      // Only online-gateway payments have a deferred purchase conversion.
      const domainKey = getOnlineGatewayDomainKey(claimed);
      if (!domainKey) {
        logger.info('Conversion sweep: not an online-gateway payment, no purchase event to send', {
          paymentId: claimed.id,
          paymentMethod: claimed.paymentMethod,
        });
        continue;
      }

      if (!claimed.gaClientId) {
        logger.info('Conversion sweep: no client_id captured, skipping GA4 send', {
          paymentId: claimed.id,
        });
        continue;
      }

      const [order] = await db
        .select()
        .from(schema.order)
        .where(eq(schema.order.id, claimed.orderId))
        .limit(1);

      if (!order) continue;

      const lineItems = parseStoredLineItems(order.lineItems).map(computeLineItemDerived);
      await sendGA4PurchaseEvent({
        domainKey,
        clientId: claimed.gaClientId,
        transactionId: claimed.transactionId || claimed.id,
        value: getOrderPayableAmount(order),
        currency: order.currency,
        items: lineItems.map((li) => ({
          item_id: li.articleId,
          item_name: li.name || li.articleId,
          price: li.unitPriceGrossConverted ?? 0,
          quantity: li.quantity,
        })),
      });

      logger.info('Conversion sweep: sent offline GA4 purchase event', {
        paymentId: claimed.id,
        domainKey,
      });
    } catch (error) {
      logger.error('Conversion sweep: failed to process payment', {
        paymentId: payment.id,
        error: String(error),
      });
    }
  }
}
