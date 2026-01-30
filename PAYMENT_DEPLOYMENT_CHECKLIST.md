# 🔲 Payment Integration Deployment Checklist

Use this checklist to ensure proper deployment of the Przelewy24 payment integration.

## Pre-Deployment Checklist

### 1. Database Setup
- [ ] Review payment table schema in `src/db/schema.ts`
- [ ] Generate migration: `npm run db:generate`
- [ ] Review generated migration file
- [ ] Apply migration: `npm run db:migrate`
- [ ] Verify payment table exists in database
- [ ] Check all indexes are created

### 2. Environment Variables
- [ ] Copy `.env.example.payment` contents
- [ ] Create/update `.env.local` file
- [ ] Add `P24_MERCHANT_ID`
- [ ] Add `P24_POS_ID`
- [ ] Add `P24_API_KEY`
- [ ] Add `P24_CRC`
- [ ] Set `P24_SANDBOX=true` for testing
- [ ] Set `NEXT_PUBLIC_APP_URL` to your local URL
- [ ] Verify no credentials are committed to git
- [ ] Restart development server after env changes

### 3. Przelewy24 Account Setup
- [ ] Create Przelewy24 account at https://www.przelewy24.pl/
- [ ] Access sandbox at https://sandbox.przelewy24.pl/
- [ ] Login to sandbox panel
- [ ] Navigate to Settings → Shop Data
- [ ] Copy Merchant ID
- [ ] Copy POS ID (usually same as Merchant ID)
- [ ] Copy CRC Key
- [ ] Navigate to Settings → API Access
- [ ] Generate API Key
- [ ] Copy API Key
- [ ] Save all credentials securely

### 4. Code Review
- [ ] Review API endpoint: `src/app/api/payments/initiate/route.ts`
- [ ] Review webhook handler: `src/app/api/payments/callback/route.ts`
- [ ] Review payment page: `src/app/[locale]/payment/page.tsx`
- [ ] Review return page: `src/app/[locale]/payment/return/page.tsx`
- [ ] Check checkout redirect in `src/app/[locale]/checkout/page.tsx`
- [ ] Verify translations in `src/locales/*.json`
- [ ] Check for TypeScript errors: `npm run type-check` or `npx tsc --noEmit`

### 5. Build Verification
- [ ] Run build: `npm run build`
- [ ] Check for build errors
- [ ] Check for build warnings
- [ ] Verify all pages compile successfully
- [ ] Test production build locally: `npm run start`

## Testing Checklist

### 6. Local Development Testing
- [ ] Start dev server: `npm run dev`
- [ ] Test user authentication
- [ ] Add items to cart
- [ ] Go to checkout page
- [ ] Complete checkout form
- [ ] Verify order creation
- [ ] Check redirect to payment page
- [ ] Verify order details display correctly
- [ ] Test payment page loads without errors
- [ ] Check "Proceed to Payment" button works
- [ ] Verify API call to `/api/payments/initiate`
- [ ] Check browser console for errors
- [ ] Review server logs for errors

### 7. Webhook Testing (Local)
- [ ] Install ngrok: `npm install -g ngrok`
- [ ] Start ngrok: `ngrok http 3000`
- [ ] Copy ngrok URL
- [ ] Login to Przelewy24 sandbox
- [ ] Go to Settings → Shop Data
- [ ] Set Status Notification URL to: `https://your-ngrok-url.ngrok.io/api/payments/callback`
- [ ] Save webhook configuration
- [ ] Test payment flow end-to-end
- [ ] Complete test payment on Przelewy24
- [ ] Verify webhook received (check logs)
- [ ] Confirm payment status updated in database
- [ ] Verify order status changed to PROCESSING
- [ ] Check return page displays success

### 8. Przelewy24 Sandbox Payment Test
- [ ] Navigate to payment page with real order
- [ ] Click "Proceed to Payment"
- [ ] Redirected to Przelewy24 sandbox
- [ ] Use test credentials:
  - Email: test@test.pl
  - Card: 4111 1111 1111 1111
  - CVV: 123
  - Expiry: any future date
- [ ] Complete test payment
- [ ] Return to site automatically
- [ ] Verify success message displayed
- [ ] Check order in database (status = PROCESSING)
- [ ] Check payment in database (status = COMPLETED)

### 9. Error Handling Testing
- [ ] Test with invalid order ID
- [ ] Test with already paid order
- [ ] Test with cancelled payment
- [ ] Test network error scenarios
- [ ] Test invalid signature (modify CRC temporarily)
- [ ] Verify error messages are user-friendly
- [ ] Check error logging

### 10. Multi-language Testing
- [ ] Test payment flow in Polish (`/pl/payment`)
- [ ] Test payment flow in English (`/en/payment`)
- [ ] Test payment flow in Ukrainian (`/ua/payment`)
- [ ] Verify all translations display correctly
- [ ] Check payment return page in all languages

## Production Deployment Checklist

### 11. Production Environment Setup
- [ ] Request production Przelewy24 credentials
- [ ] Login to production panel: https://secure.przelewy24.pl/
- [ ] Get production Merchant ID
- [ ] Get production POS ID
- [ ] Get production CRC Key
- [ ] Generate production API Key
- [ ] Update production `.env` file
- [ ] Set `P24_SANDBOX=false`
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Verify HTTPS is enabled
- [ ] Configure production webhook URL
- [ ] Test webhook URL is accessible

### 12. Production Przelewy24 Configuration
- [ ] Login to production Przelewy24 panel
- [ ] Navigate to Settings → Shop Data
- [ ] Set Status Notification URL: `https://yourdomain.com/api/payments/callback`
- [ ] Enable automatic notifications
- [ ] Set notification format to JSON
- [ ] Save configuration
- [ ] Test webhook endpoint with curl/Postman
- [ ] Verify SSL certificate is valid

### 13. Production Testing
- [ ] Deploy to production
- [ ] Create real test order with small amount
- [ ] Complete full payment flow
- [ ] Use real payment method
- [ ] Verify payment processed successfully
- [ ] Check order status updates
- [ ] Verify webhook received
- [ ] Test return URL works
- [ ] Check email notifications (if implemented)
- [ ] Monitor logs for errors

### 14. Monitoring Setup
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Configure payment failure alerts
- [ ] Set up webhook failure notifications
- [ ] Create dashboard for payment metrics
- [ ] Monitor payment success rate
- [ ] Track average payment time
- [ ] Monitor failed payment reasons

### 15. Security Verification
- [ ] Verify HTTPS is enforced
- [ ] Check environment variables are not exposed
- [ ] Confirm signature validation is working
- [ ] Test unauthorized access attempts
- [ ] Verify payment amounts are validated
- [ ] Check order ownership validation
- [ ] Review error messages (no sensitive data)
- [ ] Test CSRF protection
- [ ] Verify API authentication

### 16. Documentation
- [ ] Share `docs/PAYMENT_INTEGRATION.md` with team
- [ ] Share `docs/PAYMENT_QUICK_START.md` with developers
- [ ] Document Przelewy24 credentials location
- [ ] Create runbook for common issues
- [ ] Document webhook URL configuration
- [ ] Create user guide for customers
- [ ] Update API documentation
- [ ] Add payment flow to system architecture docs

### 17. Backup & Recovery
- [ ] Backup database before production deployment
- [ ] Document rollback procedure
- [ ] Test database restore process
- [ ] Create backup of Przelewy24 configuration
- [ ] Document manual payment verification process
- [ ] Create emergency contact list (Przelewy24 support)

## Post-Deployment Checklist

### 18. Initial Monitoring (First 24 Hours)
- [ ] Monitor first 10 payments closely
- [ ] Check webhook delivery rate
- [ ] Review error logs every 2 hours
- [ ] Verify payment status updates
- [ ] Check customer feedback
- [ ] Monitor payment success rate
- [ ] Track performance metrics

### 19. Week 1 Review
- [ ] Analyze payment success rate
- [ ] Review failed payments
- [ ] Check webhook reliability
- [ ] Gather customer feedback
- [ ] Review server performance
- [ ] Check database performance
- [ ] Analyze payment methods usage

### 20. Optimization
- [ ] Identify common failure reasons
- [ ] Optimize slow queries
- [ ] Improve error messages if needed
- [ ] Add missing logging
- [ ] Update documentation based on issues
- [ ] Consider adding payment retries
- [ ] Plan for future enhancements

## Emergency Contacts

### Przelewy24 Support
- **Email**: support@przelewy24.pl
- **Phone**: +48 61 642 93 44
- **Panel**: https://secure.przelewy24.pl/

### Internal Team
- **Database Admin**: [Add contact]
- **DevOps**: [Add contact]
- **Backend Lead**: [Add contact]

## Rollback Plan

If issues occur:
1. [ ] Disable payment button (UI update)
2. [ ] Show maintenance message
3. [ ] Revert to previous deployment
4. [ ] Investigate and fix issues
5. [ ] Test in staging
6. [ ] Redeploy when fixed

---

## Quick Commands Reference

```bash
# Database
npm run db:generate     # Generate migration
npm run db:migrate      # Apply migration

# Development
npm run dev            # Start dev server
npm run build          # Build for production
npm run start          # Start production server

# Testing
npm run type-check     # Check TypeScript
npm run lint          # Run linter

# Ngrok (for webhook testing)
ngrok http 3000       # Expose local server
```

---

**Last Updated**: January 30, 2026  
**Version**: 1.0.0

✅ = Completed  
⏳ = In Progress  
❌ = Blocked/Failed
