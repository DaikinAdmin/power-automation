/**
 * Delivery pricing configuration.
 * Single source of truth used by:
 *  - GET /api/delivery-pricing  (API endpoint for the frontend)
 *  - POST /api/orders           (server-side charge computation)
 */

export interface DeliveryPricing {
  freeShippingThreshold: number;
  parcelLockerPrice: number;
  courierPrice: number;
  currency: string;
}

const PRICING_BY_DOMAIN: Record<string, DeliveryPricing> = {
  pl: {
    freeShippingThreshold: 500,
    parcelLockerPrice: 15,
    courierPrice: 25,
    currency: 'PLN',
  },
};

/**
 * Returns delivery pricing for the given domain key, or null if the domain
 * has no delivery surcharge (e.g. UA).
 */
export function getDeliveryPricingByDomainKey(domainKey: string): DeliveryPricing | null {
  return PRICING_BY_DOMAIN[domainKey] ?? null;
}

/**
 * Computes the delivery surcharge to add to an order.
 * Returns 0 when no pricing config exists for the domain.
 */
export function computeDeliveryCharge(
  pricing: DeliveryPricing | null,
  method: string | undefined,
  itemsTotal: number,
): number {
  if (!pricing || !method) return 0;
  if (itemsTotal >= pricing.freeShippingThreshold) return 0;
  if (method === 'parcel_locker_inpost' || method === 'dpd_parcel') return pricing.parcelLockerPrice;
  if (method === 'courier_inpost') return pricing.courierPrice;
  return 0;
}
