/**
 * GA4 Measurement Protocol client — server-side "purchase" event.
 *
 * Used by the LiqPay webhook (src/app/api/payments/liqpay/callback/route.ts)
 * to report a confirmed payment straight to GA4, regardless of whether the
 * buyer's browser is still on the site. See docs/LIQPAY_INTEGRATION.md for
 * the full conversion-tracking algorithm.
 */
import logger from '@/lib/logger';

const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID_UA || '';
const GA4_API_SECRET = process.env.GA4_API_SECRET_UA || '';
const GA4_MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

// Routes MP events into GA4 DebugView (Admin -> DebugView) instead of/alongside
// standard reporting. GA4 does not surface Measurement Protocol events in
// DebugView unless each event's params explicitly says so. Testing-only —
// leave unset in production.
const GA4_MP_DEBUG = process.env.GA4_MP_DEBUG === 'true';

export interface GA4PurchaseItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

export interface GA4PurchaseEvent {
  clientId: string;
  transactionId: string;
  value: number;
  currency: string;
  items: GA4PurchaseItem[];
}

/**
 * Sends a "purchase" event to GA4 via the Measurement Protocol.
 *
 * Note: GA4's /mp/collect endpoint always responds 2xx, even for events that
 * fail validation — there's no reliable success signal beyond "the HTTP
 * request didn't fail". Validate payload shape manually against
 * /debug/mp/collect if events aren't showing up in GA4.
 *
 * @returns `true` if the request was sent successfully, `false` if skipped or failed.
 */
export async function sendGA4PurchaseEvent(event: GA4PurchaseEvent): Promise<boolean> {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    logger.warn('GA4 Measurement Protocol not configured — skipping server-side purchase event', {
      transactionId: event.transactionId,
    });
    return false;
  }

  if (!event.clientId) {
    logger.warn('GA4 purchase event skipped: no client_id captured for this payment', {
      transactionId: event.transactionId,
    });
    return false;
  }

  try {
    const url = `${GA4_MP_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: event.clientId,
        events: [
          {
            name: 'purchase',
            params: {
              transaction_id: event.transactionId,
              value: event.value,
              currency: event.currency,
              items: event.items,
              // GA4's built-in Geo/Country dimension can't be overridden via MP —
              // it's derived from the request's source IP (our server, not the
              // buyer's). LiqPay is UA-only, so hardcode a custom dimension to
              // use in reports instead of the (server-located) built-in one.
              offline_conversion_country: 'Ukraine',
              ...(GA4_MP_DEBUG ? { debug_mode: true } : {}),
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      logger.error('GA4 Measurement Protocol request failed', {
        status: res.status,
        transactionId: event.transactionId,
      });
      return false;
    }

    logger.info('GA4 Measurement Protocol purchase event sent', {
      transactionId: event.transactionId,
      value: event.value,
      currency: event.currency,
      debugMode: GA4_MP_DEBUG,
    });
    return true;
  } catch (error) {
    logger.error('GA4 Measurement Protocol request threw an error', {
      error: String(error),
      transactionId: event.transactionId,
    });
    return false;
  }
}
