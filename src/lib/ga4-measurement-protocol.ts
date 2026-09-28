/**
 * GA4 Measurement Protocol client — server-side "purchase" event.
 *
 * Used by the offline-conversion sweep (src/lib/ga4-conversion-sweep.ts) to
 * report a confirmed payment straight to GA4, regardless of whether the
 * buyer's browser is still on the site. See docs/LIQPAY_INTEGRATION.md for
 * the full conversion-tracking algorithm.
 *
 * Each domain reports into its own GA4 property — the measurement id, api
 * secret and conversion country all come from the domain config, so a UA
 * payment can never land in the PL property or vice versa.
 */
import logger from '@/lib/logger';
import { getDomainConfigByKey, type DomainKey } from '@/lib/domain-config';

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
  /** Домен, у GA4-property якого треба відрепортувати конверсію. */
  domainKey: DomainKey;
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
  const { measurementId, apiSecret, conversionCountry } = getDomainConfigByKey(event.domainKey).ga4;

  if (!measurementId || !apiSecret) {
    logger.warn('GA4 Measurement Protocol not configured for this domain — skipping server-side purchase event', {
      domainKey: event.domainKey,
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
    const url = `${GA4_MP_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`;
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
              // buyer's), so expose the domain's country as a custom dimension
              // to use in reports instead of the (server-located) built-in one.
              offline_conversion_country: conversionCountry,
              ...(GA4_MP_DEBUG ? { debug_mode: true } : {}),
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      logger.error('GA4 Measurement Protocol request failed', {
        status: res.status,
        domainKey: event.domainKey,
        transactionId: event.transactionId,
      });
      return false;
    }

    logger.info('GA4 Measurement Protocol purchase event sent', {
      domainKey: event.domainKey,
      measurementId,
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
