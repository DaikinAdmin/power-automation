import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';

// Public input — trim/cap defensively.
const MAX_LEN = 512;
function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, MAX_LEN);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Captures a Google Ads landing (gclid + UTM + GA4 client_id) for later
 * matching against a manually-logged offline conversion. Public/no-auth —
 * called by src/components/ad-click-tracker.tsx for anonymous visitors.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      throw new BadRequestError('Invalid JSON body');
    }

    const gclid = clean(body.gclid);
    const visitorId = clean(body.visitorId);
    const landingPage = clean(body.landingPage);
    const domain = clean(body.domain);

    if (!gclid || !visitorId || !landingPage || !domain) {
      throw new BadRequestError('Missing required fields: gclid, visitorId, landingPage, domain');
    }

    const gaClientId = clean(body.gaClientId);
    const now = new Date().toISOString();

    await db
      .insert(schema.adClick)
      .values({
        visitorId,
        gclid,
        gaClientId,
        utmSource: clean(body.utmSource),
        utmMedium: clean(body.utmMedium),
        utmCampaign: clean(body.utmCampaign),
        utmTerm: clean(body.utmTerm),
        utmContent: clean(body.utmContent),
        landingPage,
        referrer: clean(body.referrer),
        userAgent: clean(body.userAgent),
        domain,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.adClick.gclid,
        set: {
          // Only backfill gaClientId once it's actually known — retries
          // shouldn't wipe an already-captured value with null.
          ...(gaClientId ? { gaClientId } : {}),
          updatedAt: now,
        },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'POST /api/tracking/ad-click' });
  }
}
