/**
 * LiqPay Payment Gateway - TypeScript Utility
 *
 * Based on the official LiqPay JavaScript SDK (OSL 3.0) and API v3 documentation.
 * Reference: https://www.liqpay.ua/documentation/uk
 *
 * How it works:
 *  1. Build a `params` object with all required fields.
 *  2. Serialize it to JSON, then encode with base64  → `data`.
 *  3. Create a SHA-1 HMAC-like signature:
 *       signature = base64( sha1( privateKey + data + privateKey ) )
 *  4. Redirect the browser to the checkout URL (GET) passing data + signature
 *     as query params, OR POST them as hidden form inputs.
 *  5. LiqPay processes the payment and POSTs back to your `server_url`
 *     with the same data+signature format so you can verify authenticity.
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Required parameters for creating a LiqPay checkout session (action=pay). */
export interface LiqPayParams {
  /** API version — always 3. */
  version: 3;
  /** Your LiqPay public key (from merchant dashboard). */
  public_key: string;
  /** Operation type. "pay" for a one-time payment. */
  action: 'pay' | 'hold' | 'subscribe' | 'paydonate';
  /** Payment amount, e.g. 100 or 99.99. LiqPay uses actual units, NOT cents. */
  amount: number;
  /** ISO currency code: USD | EUR | UAH. */
  currency: 'USD' | 'EUR' | 'UAH';
  /** Payment description shown to the buyer. */
  description: string;
  /** Your unique order/invoice identifier (max 255 chars). */
  order_id: string;
  /** URL to redirect the buyer after the checkout finishes (result_url). */
  result_url?: string;
  /** Server-to-server callback URL where LiqPay will POST the payment result. */
  server_url?: string;
  /** UI language: uk | en. Defaults to uk. */
  language?: 'uk' | 'en';
  /**
   * Allowed payment methods shown on the checkout page.
   * E.g. "card,privat24,gpay,apay"
   * If omitted, the merchant's dashboard settings are used.
   */
  paytypes?: string;
  /**
   * ISO 8601 expiry datetime (UTC) until which the invoice can be paid.
   * Format: "2024-12-31 23:59:59"
   */
  expired_date?: string;
  /** Fiscalisation metadata (optional). */
  rro_info?: {
    items: Array<{
      amount: number;  // quantity
      price: number;   // unit price
      cost: number;    // total cost = amount * price
      id: number;      // product id
    }>;
    delivery_emails?: string[];
  };
}

/**
 * Decoded callback payload that LiqPay POSTs to your `server_url`.
 * Only the most important fields are typed here; the full list is in the docs.
 */
export interface LiqPayCallbackData {
  /** LiqPay transaction id. */
  payment_id: number;
  /** Your order_id that you passed when creating the checkout. */
  order_id: string;
  /** LiqPay's own order_id. */
  liqpay_order_id: string;
  /**
   * Final payment status:
   *  success   – paid
   *  failure   – failed/declined
   *  error     – invalid data
   *  reversed  – refunded
   *  subscribed / unsubscribed – subscription lifecycle
   *
   * Intermediate / pending statuses (see docs for full list):
   *  processing, hold_wait, invoice_wait, wait_accept, cash_wait, etc.
   */
  status: LiqPayStatus;
  /** Transaction amount (actual, not cents). */
  amount: number;
  /** ISO currency code. */
  currency: string;
  /** Transaction description. */
  description: string;
  /** Your merchant's public key. */
  public_key: string;
  /** Acquirer id. */
  acq_id: number;
  /** Payment method used: card | privat24 | masterpass | moment_part | cash | invoice | qr */
  paytype: string;
  /** Sender card masked number, e.g. "4111****1111". */
  sender_card_mask2: string;
  /** Sender card type: MC | Visa. */
  sender_card_type: string;
  /** Sender bank name. */
  sender_card_bank: string;
  /** ISO 3166-1 numeric country code of the sender card. */
  sender_card_country: number;
  /** Sender first name. */
  sender_first_name: string;
  /** Sender last name. */
  sender_last_name: string;
  /** Sender phone number. */
  sender_phone: string;
  /** Was 3-D Secure used? */
  is_3ds: boolean;
  /** MPI ECI value: 5 = full 3DS, 6 = no issuer 3DS, 7 = no 3DS. */
  mpi_eci: 5 | 6 | 7;
  /** Date payment was created. */
  create_date: string;
  /** Date payment was last modified. */
  end_date: string;
  /** Debit currency. */
  currency_debit: string;
  /** Credit currency. */
  currency_credit: string;
  /** Debit amount. */
  amount_debit: number;
  /** Credit amount. */
  amount_credit: number;
  /** Commission charged to sender. */
  sender_commission: number;
  /** Commission charged to receiver. */
  receiver_commission: number;
  /** Agent commission. */
  agent_commission: number;
  /** Debit authorisation code. */
  authcode_debit: string;
  /** Credit authorisation code. */
  authcode_credit: string;
  /** Error code (if failed). */
  err_code: string;
  /** Human-readable error description (if failed). */
  err_description: string;
  /** Verification code (if verifycode=Y was requested). */
  verifycode: string;
  /** API version. */
  version: number;
}

/** All possible LiqPay payment statuses. */
export type LiqPayStatus =
  // Terminal (final) statuses
  | 'success'
  | 'failure'
  | 'error'
  | 'reversed'
  | 'subscribed'
  | 'unsubscribed'
  // Verification-required statuses
  | '3ds_verify'
  | 'captcha_verify'
  | 'cvv_verify'
  | 'ivr_verify'
  | 'otp_verify'
  | 'password_verify'
  | 'phone_verify'
  | 'pin_verify'
  | 'receiver_verify'
  | 'sender_verify'
  | 'senderapp_verify'
  | 'wait_qr'
  | 'wait_sender'
  // Other intermediate statuses
  | 'cash_wait'
  | 'hold_wait'
  | 'invoice_wait'
  | 'prepared'
  | 'processing'
  | 'wait_accept'
  | 'wait_card'
  | 'wait_compensation'
  | 'wait_lc'
  | 'wait_reserve'
  | 'wait_secure';

/** The set of statuses that indicate the payment is definitively successful. */
export const LIQPAY_SUCCESS_STATUSES: LiqPayStatus[] = ['success'];

/** The set of statuses that indicate a definitively failed payment. */
export const LIQPAY_FAILURE_STATUSES: LiqPayStatus[] = [
  'failure',
  'error',
  'reversed',
];

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Encodes a params object into a base64 JSON string (the `data` field).
 *
 * Algorithm: base64( JSON.stringify(params) )
 */
export function buildData(params: LiqPayParams): string {
  return Buffer.from(JSON.stringify(params)).toString('base64');
}

/**
 * Generates the HMAC-like signature for a given `data` string.
 *
 * Algorithm: base64( SHA-1( privateKey + data + privateKey ) )
 *
 * Note: LiqPay API v3 uses SHA-1. Keep your private key server-side only —
 * never expose it to the browser.
 */
export function buildSignature(data: string, privateKey: string): string {
  return crypto
    .createHash('sha1')
    .update(privateKey + data + privateKey)
    .digest('base64');
}

/**
 * Builds both `data` and `signature` in one call.
 *
 * @returns Object containing the base64-encoded data and its signature.
 */
export function buildCheckoutPayload(
  params: LiqPayParams,
  privateKey: string
): { data: string; signature: string } {
  const data = buildData(params);
  const signature = buildSignature(data, privateKey);
  return { data, signature };
}

/**
 * Returns the full checkout redirect URL (GET).
 *
 * LiqPay supports GET requests to the checkout endpoint, which allows
 * a simple window.location.href redirect instead of a form submission.
 *
 * URL format: https://www.liqpay.ua/api/3/checkout?data=...&signature=...
 */
export function buildCheckoutUrl(
  params: LiqPayParams,
  privateKey: string
): string {
  const { data, signature } = buildCheckoutPayload(params, privateKey);
  const qs = new URLSearchParams({ data, signature });
  return `https://www.liqpay.ua/api/3/checkout?${qs.toString()}`;
}

/**
 * Verifies the authenticity of an incoming LiqPay server-to-server callback.
 *
 * LiqPay sends a POST request to your `server_url` with two form fields:
 *   - `data`      – base64-encoded JSON with payment details
 *   - `signature` – base64( SHA-1( privateKey + data + privateKey ) )
 *
 * Call this before trusting any callback payload to ensure the request
 * actually originates from LiqPay and has not been tampered with.
 *
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyCallbackSignature(
  data: string,
  receivedSignature: string,
  privateKey: string
): boolean {
  const expectedSignature = buildSignature(data, privateKey);
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Buffers of different length throw — that means the signatures differ
    return false;
  }
}

/**
 * Decodes the `data` field from a LiqPay callback into a typed object.
 *
 * @throws {Error} If the base64/JSON is malformed.
 */
export function decodeCallbackData(data: string): LiqPayCallbackData {
  const json = Buffer.from(data, 'base64').toString('utf8');
  return JSON.parse(json) as LiqPayCallbackData;
}
