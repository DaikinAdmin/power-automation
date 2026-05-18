# Delivery Pricing (Poland)

## Overview

Orders on the PL domain include a delivery surcharge when the cart total is below a threshold. The pricing is defined once on the server and consumed both by the API and the frontend.

---

## Files

| File | Purpose |
|---|---|
| `src/lib/delivery-pricing.ts` | Single source of truth — pricing config and computation helpers |
| `src/app/api/delivery-pricing/route.ts` | `GET /api/delivery-pricing` — returns pricing for the current domain |
| `src/app/api/orders/route.ts` | Uses `computeDeliveryCharge()` to calculate the surcharge server-side |
| `src/components/delivery-poland.tsx` | Fetches pricing from the API on mount and shows labels in the selector |

---

## Pricing Config (`src/lib/delivery-pricing.ts`)

```ts
const PRICING_BY_DOMAIN: Record<string, DeliveryPricing> = {
  pl: {
    freeShippingThreshold: 500, // PLN — no surcharge above this
    parcelLockerPrice: 15,      // PLN — parcel_locker_inpost, dpd_parcel
    courierPrice: 25,           // PLN — courier_inpost
    currency: 'PLN',
  },
};
```

To change prices — edit only this file. To add pricing for a new domain (e.g. `ua`) — add a new key.

---

## API Endpoint

```
GET /api/delivery-pricing
```

Returns the pricing config for the domain derived from the `Host` header.

**Response (PL domain):**
```json
{
  "pricing": {
    "freeShippingThreshold": 500,
    "parcelLockerPrice": 15,
    "courierPrice": 25,
    "currency": "PLN"
  }
}
```

**Response (UA domain or any domain without config):**
```json
{ "pricing": null }
```

---

## Server-side Order Calculation

The `POST /api/orders` handler **ignores** the `deliveryPrice` field sent by the client and recomputes it on the server:

```ts
const deliveryPricing = getDeliveryPricingByDomainKey(domainKey);
const plDeliveryCharge = computeDeliveryCharge(deliveryPricing, deliveryPoland?.method, totalNet + totalVat);
const totalGross = totalNet + totalVat + plDeliveryCharge;
```

This prevents a client from bypassing the surcharge by sending `deliveryPrice: 0`.

---

## Frontend (`delivery-poland.tsx`)

On mount the component fetches `/api/delivery-pricing` and stores the result in state. All price labels and `deliveryPrice` in the emitted `PolandDeliveryState` are derived from this fetched config. If the fetch fails, pricing falls back to `null` (surcharge = 0).

---

## DB Column

`delivery.delivery_price` (`doublePrecision`, default `0`) — stores the server-computed surcharge for PL deliveries. Visible in:
- Admin → Deliveries table
- Admin → Orders → detail page
- Dashboard → Orders → detail page
- Checkout order summary
