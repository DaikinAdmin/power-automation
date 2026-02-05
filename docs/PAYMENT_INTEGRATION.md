# Payment Integration with Przelewy24 - Implementation Summary

## Overview
This document summarizes the implementation of the Przelewy24 payment integration for the Power Automation e-commerce platform.

## What Was Implemented

### 1. Database Schema Updates
**File: `/src/db/schema.ts`**

Added new payment tracking capabilities:
- **New Enum**: `PaymentStatus` with values: PENDING, INITIATED, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED
- **New Table**: `payment` with the following fields:
  - `id`: Primary key (UUID)
  - `orderId`: Foreign key to orders table
  - `sessionId`: Przelewy24 session ID
  - `merchantId`: Przelewy24 merchant ID
  - `posId`: Przelewy24 POS ID
  - `transactionId`: Przelewy24 transaction ID (set after payment completion)
  - `amount`: Amount in grosze/cents (integer)
  - `currency`: Currency code (default: PLN)
  - `status`: Payment status enum
  - `paymentMethod`: Method used (card, transfer, etc.)
  - `p24Email`: Email used in Przelewy24
  - `p24OrderId`: Order ID sent to Przelewy24
  - `description`: Payment description
  - `returnUrl`: URL to return after payment
  - `statusUrl`: URL for payment status notifications
  - `metadata`: JSONB field for additional data
  - `errorCode` & `errorMessage`: Error tracking
  - `createdAt` & `updatedAt`: Timestamps

**Migration Required**: You'll need to run `npm run db:migrate` or generate a new migration to add this table to your database.

### 2. Payment API Endpoints

#### 2.1 Payment Initiation Endpoint
**File: `/src/app/api/payments/initiate/route.ts`**

- **Endpoint**: `POST /api/payments/initiate`
- **Purpose**: Initiates a payment session with Przelewy24
- **Request Body**: `{ orderId: string }`
- **Process**:
  1. Validates user authentication
  2. Fetches and validates the order
  3. Calculates amount in grosze (PLN cents)
  4. Generates unique session ID
  5. Creates signature for Przelewy24
  6. Registers transaction with Przelewy24 API
  7. Creates payment record in database
  8. Updates order status to WAITING_FOR_PAYMENT
  9. Returns payment URL for user redirect

- **Response**: 
```json
{
  "success": true,
  "paymentId": "uuid",
  "sessionId": "unique-session-id",
  "paymentUrl": "https://secure.przelewy24.pl/trnRequest/TOKEN",
  "token": "przelewy24-token"
}
```

#### 2.2 Payment Callback Endpoint
**File: `/src/app/api/payments/callback/route.ts`**

- **Endpoint**: `POST /api/payments/callback` (Webhook from Przelewy24)
- **Purpose**: Handles payment status notifications from Przelewy24
- **Process**:
  1. Receives notification from Przelewy24
  2. Validates signature
  3. Finds payment record by sessionId
  4. Verifies transaction with Przelewy24 API
  5. Updates payment status (COMPLETED or FAILED)
  6. Updates order status to PROCESSING (on success)
  7. Stores transaction details

- **Endpoint**: `GET /api/payments/callback` (User return URL)
- **Purpose**: Handles user return from Przelewy24 payment page

### 3. Payment UI Pages

#### 3.1 Payment Page
**File: `/src/app/[locale]/payment/page.tsx`**

Features:
- Displays order summary (order ID, date, status, total amount)
- Shows secure payment information
- Lists available payment methods (credit card, bank transfer, BLIK, PayPal)
- "Proceed to Payment" button that initiates payment
- Redirects to Przelewy24 payment gateway
- Error handling and loading states
- Responsive design with company branding

#### 3.2 Payment Return Page
**File: `/src/app/[locale]/payment/return/page.tsx`**

Features:
- Handles user return from Przelewy24
- Checks payment status automatically
- Displays different states:
  - **Processing**: Shows loading spinner while checking status
  - **Success**: Confirms payment with order details, offers navigation to orders or continue shopping
  - **Pending**: Payment still processing, offers refresh button
  - **Failed**: Shows error message with retry option
- Auto-refreshes status for pending payments
- Fully localized in Polish, English, and Ukrainian

### 4. Checkout Page Updates
**File: `/src/app/[locale]/checkout/page.tsx`**

Changes:
- Added `useRouter` import from `next/navigation`
- Modified order submission flow to redirect to payment page after successful order creation
- Changed from showing alert to redirecting: `router.push(\`/\${locale}/payment?orderId=\${result.order.id}\`)`
- Cart is cleared after order creation (before redirect)

### 5. Translations

Added comprehensive translations for payment flow in all three languages:

#### Polish (`pl.json`)
- Complete payment page translations
- Payment status messages
- Error messages
- Button labels

#### English (`en.json`)
- Full English translations for all payment-related text

#### Ukrainian (`ua.json`)
- Complete Ukrainian translations for payment flow

Translation keys added:
- `payment.*` - Payment page translations
- `paymentReturn.*` - Payment return page translations

## Environment Variables Required

Add these to your `.env` or `.env.local` file:

```env
# Przelewy24 Configuration
P24_MERCHANT_ID=your_merchant_id
P24_POS_ID=your_pos_id
P24_API_KEY=your_api_key
P24_CRC=your_crc_key
P24_SANDBOX=true  # Set to 'false' for production

# Application URL (required for payment callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to your production URL
```

## How to Get Przelewy24 Credentials

1. **Sign up for Przelewy24**:
   - Go to https://www.przelewy24.pl/
   - Register for a merchant account

2. **Get Sandbox Credentials** (for testing):
   - Go to https://sandbox.przelewy24.pl/
   - Login to your test account
   - Navigate to Settings → Shop Data
   - You'll find:
     - Merchant ID
     - POS ID
     - CRC Key
     - API Key

3. **Production Credentials**:
   - After testing, request production access
   - Get production credentials from the production panel
   - Set `P24_SANDBOX=false` in environment

## User Flow

1. **Checkout Process**:
   - User adds items to cart
   - Goes to checkout page
   - Logs in or creates account
   - Accepts terms and conditions
   - Clicks "Confirm Order"

2. **Payment Initiation**:
   - Order is created in database with status "NEW"
   - User is redirected to payment page with orderId
   - Payment page fetches order details
   - User clicks "Proceed to Payment"
   - System calls `/api/payments/initiate`
   - Payment record created with status "INITIATED"
   - Order status updated to "WAITING_FOR_PAYMENT"
   - User is redirected to Przelewy24

3. **Payment at Przelewy24**:
   - User completes payment on Przelewy24 platform
   - Przelewy24 sends webhook to `/api/payments/callback`
   - System verifies and updates payment/order status

4. **Return to Site**:
   - User redirected to `/payment/return?orderId=xxx`
   - Page checks payment status
   - Shows success, pending, or failed message
   - Provides navigation options

## Testing the Integration

### 1. Database Migration
```bash
# Generate migration for new payment table
npm run db:generate

# Run migration
npm run db:migrate
```

### 2. Set Environment Variables
Create or update `.env.local` with Przelewy24 sandbox credentials.

### 3. Test Order Flow
1. Add items to cart
2. Go to checkout
3. Create/login to account
4. Complete checkout
5. Should redirect to payment page
6. Click "Proceed to Payment"

### 4. Test with Przelewy24 Sandbox
- Use Przelewy24 test cards
- Test successful payment
- Test failed payment
- Test pending payment

### 5. Webhook Testing
For local development, you'll need to expose your local server:
```bash
# Using ngrok (install first if needed)
ngrok http 3000

# Update P24 webhook URL in sandbox to:
# https://your-ngrok-url.ngrok.io/api/payments/callback
```

## Security Considerations

1. **Signature Verification**: All Przelewy24 notifications are verified using SHA384 signatures
2. **User Validation**: Payment can only be initiated by the order owner
3. **Amount Verification**: Amount is verified during callback
4. **HTTPS Required**: Production must use HTTPS for callbacks
5. **Environment Variables**: Sensitive credentials stored in env variables
6. **Transaction Verification**: Each payment is verified with Przelewy24 before confirmation

## Error Handling

- Invalid order ID: Returns 404
- Unauthorized access: Returns 401
- Payment already processed: Returns 400
- Przelewy24 API errors: Logged and returned with appropriate message
- Signature mismatch: Rejected with 400
- Network errors: Caught and logged

## Next Steps

1. **Run Database Migration**: Generate and apply the payment table schema
2. **Configure Przelewy24**: Set up sandbox account and get credentials
3. **Test Integration**: Test full payment flow in sandbox
4. **Setup Webhooks**: Configure webhook URL in Przelewy24 panel
5. **Production Setup**: Get production credentials when ready to go live
6. **Email Notifications**: Consider adding payment confirmation emails
7. **Admin Panel**: Add payment management to admin interface
8. **Refunds**: Implement refund functionality if needed
9. **Multiple Payment Providers**: Consider adding alternative payment methods
10. **Analytics**: Add payment tracking to analytics

## Files Created/Modified

### Created:
- `/src/app/api/payments/initiate/route.ts`
- `/src/app/api/payments/callback/route.ts`
- `/src/app/[locale]/payment/page.tsx`
- `/src/app/[locale]/payment/return/page.tsx`

### Modified:
- `/src/db/schema.ts` - Added payment table and PaymentStatus enum
- `/src/app/[locale]/checkout/page.tsx` - Added redirect to payment
- `/src/locales/pl.json` - Added payment translations
- `/src/locales/en.json` - Added payment translations
- `/src/locales/ua.json` - Added payment translations

## Support

For issues with:
- **Przelewy24 Integration**: Consult https://docs.przelewy24.pl/
- **Database Schema**: Check Drizzle ORM documentation
- **Next.js Routing**: Refer to Next.js App Router docs
- **Payment Testing**: Use Przelewy24 sandbox environment

---

**Implementation Date**: January 30, 2026
**Status**: ✅ Complete - Ready for Testing
