'use client';

import { useEffect } from 'react';
import { getGaClientId } from '@/helpers/ga4';
import type { DomainKey } from '@/lib/domain-config';

const VISITOR_COOKIE = 'pa_ad_visitor';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days — typical Google Ads conversion window

function getOrCreateVisitorId(): string {
  const match = document.cookie.match(/(?:^|;\s*)pa_ad_visitor=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  const id = crypto.randomUUID();
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${VISITOR_COOKIE_MAX_AGE}; SameSite=Lax`;
  return id;
}

interface AdClickTrackerProps {
  domain: DomainKey;
}

/**
 * Captures gclid (+ UTM params, GA4 client_id) for visitors landing via a
 * Google Ads click, so a manager-handled order (chat/call, not checkout) can
 * later be matched back to a gclid for a manual Google Ads offline
 * conversion import. No-ops for any visitor without a ?gclid= param.
 */
export default function AdClickTracker({ domain }: AdClickTrackerProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get('gclid');
    if (!gclid) return;

    const visitorId = getOrCreateVisitorId();
    const basePayload = {
      visitorId,
      gclid,
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmTerm: params.get('utm_term'),
      utmContent: params.get('utm_content'),
      landingPage: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
      domain,
    };

    let cancelled = false;
    const send = () => {
      if (cancelled) return;
      fetch('/api/tracking/ad-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, gaClientId: getGaClientId() }),
        keepalive: true,
      }).catch(() => {});
    };

    // _ga may not be set yet on first paint (GTM loads async, consent mode
    // can delay it further) — send immediately, then retry to backfill
    // gaClientId. The server upsert is idempotent on gclid.
    send();
    const retry1 = setTimeout(send, 1500);
    const retry2 = setTimeout(send, 4000);

    return () => {
      cancelled = true;
      clearTimeout(retry1);
      clearTimeout(retry2);
    };
  }, [domain]);

  return null;
}
