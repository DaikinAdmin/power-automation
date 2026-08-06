/** Reads the GA4 client_id portion of the _ga cookie (e.g. "GA1.1.123.456" -> "123.456"). */
export function getGaClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return null;
  const parts = match[1].split(".");
  if (parts.length < 4) return null;
  return `${parts[2]}.${parts[3]}`;
}

/**
 * Reads (without creating) the pa_ad_visitor cookie set by
 * src/components/ad-click-tracker.tsx when a visitor lands via a Google Ads
 * click. Lets the checkout order carry the same gclid/GA4 client_id
 * attribution even if the buyer never completes an online-card payment
 * right away — see docs/LIQPAY_INTEGRATION.md.
 */
export function getAdVisitorId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)pa_ad_visitor=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
