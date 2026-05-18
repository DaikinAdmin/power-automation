import { NextRequest, NextResponse } from 'next/server';
import { getDomainKeyByHost } from '@/lib/domain-config';
import { getDeliveryPricingByDomainKey } from '@/lib/delivery-pricing';

/**
 * GET /api/delivery-pricing
 *
 * Returns delivery surcharge config for the current domain.
 * Used by the checkout frontend to display accurate prices
 * without hardcoding values on the client.
 *
 * Response:
 *   { pricing: DeliveryPricing }  — when the domain has a surcharge
 *   { pricing: null }             — when shipping is always free (e.g. UA)
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const domainKey = getDomainKeyByHost(host);
  const pricing = getDeliveryPricingByDomainKey(domainKey);

  return NextResponse.json({ pricing });
}
