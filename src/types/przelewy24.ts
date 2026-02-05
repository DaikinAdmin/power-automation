/**
 * Przelewy24 API Type Definitions
 * 
 * These types define the structure of requests and responses
 * for the Przelewy24 payment gateway integration.
 * 
 * @see https://docs.przelewy24.pl/
 */

/**
 * Transaction registration request
 * Sent to Przelewy24 to initiate a payment session
 */
export interface P24TransactionRegisterRequest {
  /** Merchant ID from Przelewy24 account */
  merchantId: number;
  /** Point of Sale ID */
  posId: number;
  /** Unique session identifier */
  sessionId: string;
  /** Transaction amount in grosze (1 PLN = 100 grosze) */
  amount: number;
  /** Currency code (e.g., 'PLN', 'EUR', 'USD') */
  currency: string;
  /** Description of the payment */
  description: string;
  /** Customer email address */
  email: string;
  /** Customer name (optional) */
  client?: string;
  /** Customer address (optional) */
  address?: string;
  /** Customer zip code (optional) */
  zip?: string;
  /** Customer city (optional) */
  city?: string;
  /** Customer country code (optional, e.g., 'PL') */
  country?: string;
  /** Customer phone number (optional) */
  phone?: string;
  /** Language code (e.g., 'pl', 'en') */
  language?: string;
  /** Method ID for specific payment method (optional) */
  method?: number;
  /** URL to return customer after payment */
  urlReturn: string;
  /** URL for payment status notifications (webhook) */
  urlStatus: string;
  /** Transaction signature (SHA384) */
  sign: string;
  /** Encoding (optional, default: 'UTF-8') */
  encoding?: string;
  /** Transfer label (optional) */
  transferLabel?: string;
  /** Time limit for payment in minutes (optional, 0 = no limit) */
  timeLimit?: number;
  /** Channel for payment (optional, 0 = all channels) */
  channel?: number;
  /** Shipping cost in grosze (optional) */
  shipping?: number;
  /** Additional cart items (optional) */
  cart?: P24CartItem[];
}

/**
 * Cart item for detailed transaction
 */
export interface P24CartItem {
  /** Product name */
  name: string;
  /** Product description (optional) */
  description?: string;
  /** Quantity */
  quantity: number;
  /** Price per item in grosze */
  price: number;
  /** Item number/SKU (optional) */
  number?: string;
}

/**
 * Transaction registration response
 */
export interface P24TransactionRegisterResponse {
  data: {
    /** Transaction token for payment URL */
    token: string;
  };
  /** Response code */
  responseCode?: number;
  /** Error details (if any) */
  error?: string;
  /** Error code (if any) */
  code?: string;
}

/**
 * Payment notification (webhook) data
 * Received from Przelewy24 after payment completion
 */
export interface P24PaymentNotification {
  /** Merchant ID */
  merchantId: number;
  /** POS ID */
  posId: number;
  /** Session ID from registration */
  sessionId: string;
  /** Transaction amount in grosze */
  amount: number;
  /** Original amount (before any modifications) */
  originAmount: number;
  /** Currency code */
  currency: string;
  /** Przelewy24 order ID (transaction ID) */
  orderId: number;
  /** Payment method ID used */
  methodId: number;
  /** Payment method description */
  statement: string;
  /** Notification signature (SHA384) */
  sign: string;
  /** Timestamp (optional) */
  timestamp?: string;
}

/**
 * Transaction verification request
 * Sent to Przelewy24 to verify payment completion
 */
export interface P24TransactionVerifyRequest {
  /** Merchant ID */
  merchantId: number;
  /** POS ID */
  posId: number;
  /** Session ID */
  sessionId: string;
  /** Transaction amount in grosze */
  amount: number;
  /** Currency code */
  currency: string;
  /** Przelewy24 order ID */
  orderId: number;
  /** Verification signature (SHA384) */
  sign: string;
}

/**
 * Transaction verification response
 */
export interface P24TransactionVerifyResponse {
  data?: {
    /** Status of verification */
    status: string;
  };
  /** Response code */
  responseCode?: number;
  /** Error details (if any) */
  error?: string;
  /** Error code (if any) */
  code?: string;
}

/**
 * Transaction status request
 * Used to check current transaction status
 */
export interface P24TransactionStatusRequest {
  /** Merchant ID */
  merchantId: number;
  /** POS ID */
  posId: number;
  /** Session ID */
  sessionId: string;
  /** Request signature */
  sign: string;
}

/**
 * Transaction status response
 */
export interface P24TransactionStatusResponse {
  data?: {
    /** Order ID */
    orderId: number;
    /** Session ID */
    sessionId: string;
    /** Transaction status */
    status: string;
    /** Transaction amount */
    amount: number;
    /** Currency */
    currency: string;
    /** Payment date */
    date?: string;
  };
  /** Error details (if any) */
  error?: string;
}

/**
 * Refund request
 */
export interface P24RefundRequest {
  /** Merchant ID */
  merchantId: number;
  /** POS ID */
  posId: number;
  /** Order ID to refund */
  orderId: number;
  /** Session ID from original transaction */
  sessionId: string;
  /** Refund amount in grosze (optional, full refund if not provided) */
  amount?: number;
  /** Refund description */
  description: string;
  /** Request signature */
  sign: string;
}

/**
 * Refund response
 */
export interface P24RefundResponse {
  data?: {
    /** Refund order ID */
    orderId: number;
    /** Status */
    status: string;
  };
  /** Error details (if any) */
  error?: string;
}

/**
 * Payment method
 */
export interface P24PaymentMethod {
  /** Method ID */
  id: number;
  /** Method name */
  name: string;
  /** Method description */
  description?: string;
  /** Image URL */
  imgUrl?: string;
  /** Status (active/inactive) */
  status: number;
  /** Availability */
  availability: boolean;
}

/**
 * Signature generation helper type
 */
export interface P24SignatureData {
  /** Session ID */
  sessionId: string;
  /** Merchant ID */
  merchantId: number;
  /** Amount in grosze */
  amount: number;
  /** Currency */
  currency: string;
  /** CRC key from Przelewy24 */
  crc: string;
  /** Order ID (optional, for notifications) */
  orderId?: number;
  /** Original amount (optional, for notifications) */
  originAmount?: number;
}

/**
 * Error codes from Przelewy24
 */
export enum P24ErrorCode {
  /** Invalid parameters */
  ERR_INVALID_PARAMETERS = 'ERR01',
  /** Invalid signature */
  ERR_INVALID_SIGNATURE = 'ERR02',
  /** Transaction not found */
  ERR_TRANSACTION_NOT_FOUND = 'ERR03',
  /** Transaction already verified */
  ERR_ALREADY_VERIFIED = 'ERR04',
  /** System error */
  ERR_SYSTEM = 'ERR99',
}

/**
 * Payment status enum
 */
export enum P24PaymentStatus {
  /** Payment initiated but not completed */
  PENDING = 'PENDING',
  /** Payment completed successfully */
  SUCCESS = 'SUCCESS',
  /** Payment failed */
  FAILED = 'FAILED',
  /** Payment cancelled by user */
  CANCELLED = 'CANCELLED',
}

/**
 * API endpoints for Przelewy24
 */
export const P24_ENDPOINTS = {
  SANDBOX: 'https://sandbox.przelewy24.pl/api/v1',
  PRODUCTION: 'https://secure.przelewy24.pl/api/v1',
  TRANSACTION_REGISTER: '/transaction/register',
  TRANSACTION_VERIFY: '/transaction/verify',
  TRANSACTION_STATUS: '/transaction/by/sessionId',
  REFUND: '/transaction/refund',
  PAYMENT_METHODS: '/payment/methods',
} as const;

/**
 * Helper function to generate Przelewy24 payment URL
 */
export const getP24PaymentUrl = (token: string, sandbox: boolean = true): string => {
  const baseUrl = sandbox 
    ? 'https://sandbox.przelewy24.pl' 
    : 'https://secure.przelewy24.pl';
  return `${baseUrl}/trnRequest/${token}`;
};

/**
 * Helper function to get API endpoint
 */
export const getP24ApiUrl = (sandbox: boolean = true): string => {
  return sandbox ? P24_ENDPOINTS.SANDBOX : P24_ENDPOINTS.PRODUCTION;
};
