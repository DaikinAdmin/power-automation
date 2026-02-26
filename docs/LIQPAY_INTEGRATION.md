# LiqPay Payment Integration

## Overview

This document covers the full LiqPay (API v3) integration implemented in this project.

| File | Purpose |
|---|---|
| `src/lib/liqpay.ts` | Core utility — data encoding, signature, verification |
| `src/app/api/payments/liqpay/initiate/route.ts` | `POST` — creates checkout session, returns redirect URL |
| `src/app/api/payments/liqpay/callback/route.ts` | `POST` — server-to-server webhook from LiqPay |

---

## Environment Variables

Add the following to your `.env.local` (never commit to git):

```env
# LiqPay merchant credentials (from https://www.liqpay.ua → Merchant account → Keys)
LIQPAY_PUBLIC_KEY=sandbox_i12345678901234567890
LIQPAY_PRIVATE_KEY=sandbox_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Currency for LiqPay charges: USD | EUR | UAH (defaults to UAH if not set)
LIQPAY_CURRENCY=UAH

# Public URL of your app (used to build callback and return URLs)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

> For local development use ngrok to expose your server:
> ```bash
> ngrok http 3000
> # then set NEXT_PUBLIC_APP_URL=https://xxxx.ngrok.io
> ```

---

## How It Works

### 1. Payment Initiation (`POST /api/payments/liqpay/initiate`)

```
Browser                    Your Server                    LiqPay
  │                              │                            │
  │─── POST /liqpay/initiate ───►│                            │
  │     { orderId }              │                            │
  │                              │ build data + signature     │
  │                              │ insert payment (INITIATED) │
  │                              │ set order → WAITING_FOR_PAYMENT
  │◄── { paymentUrl } ──────────│                            │
  │                              │                            │
  │─── window.location.href = paymentUrl ──────────────────►│
  │                              │    buyer completes payment │
```

**Signature algorithm (checkout form):**

```
data      = base64( JSON.stringify(params) )
signature = base64( SHA-1( PRIVATE_KEY + data + PRIVATE_KEY ) )
```

The resulting `paymentUrl` is a GET URL:
```
https://www.liqpay.ua/api/3/checkout?data=<base64>&signature=<sha1>
```

### 2. Server Callback (`POST /api/payments/liqpay/callback`)

After a payment status change, LiqPay POSTs to your `server_url`:

```
LiqPay Server                  Your Server
      │                              │
      │─── POST /liqpay/callback ───►│
      │  Content-Type: application/x-www-form-urlencoded
      │  data=<base64>&signature=<sha1>
      │                              │ 1. verify signature
      │                              │ 2. decode base64 JSON
      │                              │ 3. lookup payment by sessionId
      │                              │ 4. update payment + order status
      │◄── HTTP 200 ────────────────│
```

**Signature verification (callback):**

```
expectedSignature = base64( SHA-1( PRIVATE_KEY + data + PRIVATE_KEY ) )
assert timingSafeEqual(receivedSignature, expectedSignature)
```

LiqPay will **retry** requests that return non-2xx. Always return HTTP 200
even if something goes wrong internally (log the error, don't expose it).

---

## Params Reference

### Checkout params (`LiqPayParams`)

| Field | Required | Type | Description |
|---|---|---|---|
| `version` | ✅ | `3` | API version (always 3) |
| `public_key` | ✅ | string | Your LiqPay public key |
| `action` | ✅ | string | `pay` / `hold` / `subscribe` / `paydonate` |
| `amount` | ✅ | number | Amount in actual units (not cents): `99.50` |
| `currency` | ✅ | string | `USD` / `EUR` / `UAH` |
| `description` | ✅ | string | Payment description shown to buyer |
| `order_id` | ✅ | string | Your unique identifier (max 255 chars) |
| `result_url` | optional | string | Redirect URL after checkout (browser) |
| `server_url` | optional | string | Server-to-server webhook URL |
| `language` | optional | `uk` / `en` | Checkout page language |
| `paytypes` | optional | string | Allowed payment methods: `card,privat24,gpay,apay` |
| `expired_date` | optional | string | Invoice expiry `"2025-12-31 23:59:59"` UTC |
| `rro_info` | optional | object | Fiscalisation data |

### Callback payload (`LiqPayCallbackData`)

| Field | Type | Description |
|---|---|---|
| `payment_id` | number | LiqPay's transaction id |
| `order_id` | string | Your `order_id` from the checkout params |
| `liqpay_order_id` | string | LiqPay's own order id |
| `status` | string | Payment status (see below) |
| `amount` | number | Charged amount |
| `currency` | string | Currency code |
| `paytype` | string | Payment method: `card`, `privat24`, `gpay`, `apay`, `qr`, etc. |
| `sender_card_mask2` | string | Masked card number: `4111****1111` |
| `sender_card_type` | string | `Visa` / `MC` |
| `is_3ds` | boolean | Was 3-D Secure used? |
| `err_code` | string | Error code (on failure) |
| `err_description` | string | Error description (on failure) |

---

## Payment Statuses

### Terminal (final)

| Status | Meaning | Action |
|---|---|---|
| `success` | Payment successful | `payment → COMPLETED`, `order → PROCESSING` |
| `failure` | Payment declined | `payment → FAILED`, `order → NEW` |
| `error` | Invalid data | `payment → FAILED`, `order → NEW` |
| `reversed` | Refunded | `payment → FAILED`, `order → NEW` |

### Intermediate (non-final)

These are stored in `payment.metadata.liqpayStatus` but do **not** change the order status.
Wait for a terminal status before fulfilling the order.

| Status | Meaning |
|---|---|
| `processing` | Payment being processed |
| `hold_wait` | Amount blocked on sender's card |
| `invoice_wait` | Invoice sent, waiting for payment |
| `wait_accept` | Funds collected, shop under review |
| `3ds_verify` | Awaiting 3-D Secure verification |
| `otp_verify` | Awaiting OTP confirmation |
| `cash_wait` | Awaiting cash payment at a terminal |

---

## Database

The `payment` table columns used by LiqPay:

| Column | Value |
|---|---|
| `sessionId` | `${orderId}_${timestamp}` — matches `order_id` sent to LiqPay |
| `merchantId` | `LIQPAY_PUBLIC_KEY` |
| `posId` | `null` (Przelewy24-specific field) |
| `amount` | Amount × 100 stored in minor units for consistency |
| `currency` | ISO currency code |
| `status` | `INITIATED` → `COMPLETED` / `FAILED` |
| `transactionId` | LiqPay `payment_id` (set on success) |
| `paymentMethod` | LiqPay `paytype` (set on success) |
| `metadata.provider` | `"liqpay"` |
| `metadata.liqpayStatus` | Latest raw LiqPay status |
| `metadata.callbackPayload` | Full decoded callback body |

---

## Utility Functions (`src/lib/liqpay.ts`)

```typescript
import {
  buildData,              // base64( JSON.stringify(params) )
  buildSignature,         // base64( sha1( pk + data + pk ) )
  buildCheckoutPayload,   // { data, signature }
  buildCheckoutUrl,       // full GET checkout URL
  verifyCallbackSignature, // boolean — validates incoming webhook
  decodeCallbackData,     // decode base64 JSON → LiqPayCallbackData
  LIQPAY_SUCCESS_STATUSES,
  LIQPAY_FAILURE_STATUSES,
} from '@/lib/liqpay';
```

---

## Testing with Sandbox

1. Register at https://www.liqpay.ua and get **sandbox** credentials.
2. Set `LIQPAY_SANDBOX=...` is not needed — sandbox is determined by the key prefix (`sandbox_*`).
3. Use these test card numbers:
   - **Success:** `4242 4242 4242 4242`, any future expiry, any CVV
   - **Failure:** `4000 0000 0000 0002`

4. Test the webhook locally with ngrok:
   ```bash
   ngrok http 3000
   # update NEXT_PUBLIC_APP_URL in .env.local
   # restart the dev server
   ```

---

## Security Notes

- The **private key** is used only server-side for signing and verification. It is never sent to the browser or stored in the database.
- Signature verification in the callback uses `crypto.timingSafeEqual` to prevent timing attacks.
- Always return HTTP 200 from the callback endpoint — use internal logging for errors instead of exposing them in the response.
- Never log the raw `data` or `signature` fields at INFO level in production — they contain the full payment payload.
