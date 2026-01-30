# Przelewy24 Payment Integration - Quick Start Guide

## Prerequisites
✅ Database with orders table
✅ User authentication system
✅ Active Przelewy24 account (sandbox or production)

## Installation Steps

### 1. Apply Database Changes
```bash
# Generate migration for new payment table
npm run db:generate

# Apply migration
npm run db:migrate
```

### 2. Configure Environment Variables
Add to `.env.local`:
```env
P24_MERCHANT_ID=your_merchant_id
P24_POS_ID=your_pos_id
P24_API_KEY=your_api_key
P24_CRC=your_crc_key
P24_SANDBOX=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Test the Implementation

#### Test Flow:
1. Start your development server: `npm run dev`
2. Add items to cart
3. Go to checkout: `/checkout`
4. Login or create account
5. Click "Confirm Order" → Should redirect to `/payment?orderId=xxx`
6. Click "Proceed to Payment" → Should redirect to Przelewy24
7. Complete payment on Przelewy24
8. Return to your site at `/payment/return?orderId=xxx`

## API Endpoints Reference

### Initiate Payment
```typescript
POST /api/payments/initiate
Authorization: Required (session cookie)
Body: { orderId: string }

Response: {
  success: true,
  paymentId: string,
  sessionId: string,
  paymentUrl: string,
  token: string
}
```

### Payment Callback (Webhook)
```typescript
POST /api/payments/callback
Authorization: None (validated by signature)
Body: Przelewy24 notification data

Response: { success: true, message: string }
```

## Payment Flow Diagram

```
User Cart → Checkout → Order Created
                ↓
        Payment Page (/payment?orderId=xxx)
                ↓
        Click "Proceed to Payment"
                ↓
        POST /api/payments/initiate
                ↓
        Redirect to Przelewy24
                ↓
        User Completes Payment
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Webhook to                User redirects to
/api/payments/callback    /payment/return
    ↓                       ↓
Update payment status    Check payment status
Update order status      Show result to user
```

## Payment Statuses

### Payment Table Statuses:
- `PENDING` - Payment record created, not yet initiated
- `INITIATED` - Payment session started with Przelewy24
- `PROCESSING` - Payment in progress
- `COMPLETED` - Payment successful and verified
- `FAILED` - Payment failed or rejected
- `CANCELLED` - Payment cancelled by user
- `REFUNDED` - Payment refunded

### Order Statuses Related to Payment:
- `NEW` - Order created, awaiting payment
- `WAITING_FOR_PAYMENT` - Payment initiated, waiting for completion
- `PROCESSING` - Payment received, order being processed
- `COMPLETED` - Order fulfilled

## Troubleshooting

### Payment Not Initiating
- Check Przelewy24 credentials in .env
- Verify order exists and belongs to user
- Check browser console for errors
- Review server logs for API errors

### Webhook Not Working
- Ensure webhook URL is publicly accessible
- For local dev, use ngrok: `ngrok http 3000`
- Configure webhook URL in Przelewy24 panel
- Check signature validation
- Review server logs at `/api/payments/callback`

### Payment Status Not Updating
- Check webhook is being called (server logs)
- Verify signature is correct
- Ensure payment record exists with correct sessionId
- Check Przelewy24 transaction status in their panel

### Testing in Sandbox

Use these test credentials in Przelewy24 sandbox:
- **Email**: test@test.pl
- **Card Number**: 4111 1111 1111 1111
- **CVV**: 123
- **Expiry**: Any future date

## Security Checklist

- [ ] Environment variables are not committed to git
- [ ] HTTPS enabled for production
- [ ] Webhook signature validation working
- [ ] User authentication required for payment initiation
- [ ] Order ownership validated
- [ ] Amount verification in callback
- [ ] Error messages don't expose sensitive data
- [ ] Transaction verification with Przelewy24 API

## Production Deployment

### Before Going Live:
1. Get production Przelewy24 credentials
2. Update `.env` with production values
3. Set `P24_SANDBOX=false`
4. Update `NEXT_PUBLIC_APP_URL` to production domain
5. Configure webhook URL in Przelewy24 production panel
6. Test with small real transaction
7. Monitor logs and payment status
8. Set up monitoring/alerts for failed payments

### Przelewy24 Panel Configuration:
1. Login to production panel
2. Go to **Settings → Shop Data**
3. Set **Status Notification URL**: `https://yourdomain.com/api/payments/callback`
4. Enable notifications
5. Save changes

## Monitoring & Analytics

### Key Metrics to Track:
- Payment success rate
- Average payment time
- Failed payment reasons
- Conversion rate (orders → payments)
- Popular payment methods

### Recommended Logging:
- Payment initiation attempts
- Successful payments
- Failed payments with reasons
- Webhook callback attempts
- Signature validation failures

## Support Resources

- **Przelewy24 API Docs**: https://docs.przelewy24.pl/
- **Przelewy24 Support**: support@przelewy24.pl
- **Sandbox Panel**: https://sandbox.przelewy24.pl/
- **Production Panel**: https://secure.przelewy24.pl/

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Invalid signature" error | Check CRC key, ensure correct JSON stringification |
| Webhook not received | Configure URL in P24 panel, ensure public access |
| Payment stays PENDING | Check webhook logs, verify signature |
| Amount mismatch | Check currency conversion (grosze), verify calculation |
| User not found | Ensure authentication, check session |

## Next Features to Consider

- [ ] Email notifications for payment status
- [ ] Admin panel for payment management
- [ ] Payment refunds support
- [ ] Multiple currency support
- [ ] Payment installments
- [ ] Saved payment methods
- [ ] Payment analytics dashboard
- [ ] Automated retry for failed payments
- [ ] Payment reminders
- [ ] Invoice generation

---

**Need Help?** 
- Check the full documentation in `docs/PAYMENT_INTEGRATION.md`
- Review API endpoint files in `src/app/api/payments/`
- Examine payment pages in `src/app/[locale]/payment/`
