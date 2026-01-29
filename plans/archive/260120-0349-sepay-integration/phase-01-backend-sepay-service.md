# Phase 01: Backend SePay Service & Routes

## Priority: HIGH | Status: PENDING

## Overview
Create SePay service for VietQR generation and webhook handling.

## Key Insights
- VietQR URL: `https://qr.sepay.vn/img?acc=ACC&bank=BANK&amount=AMT&des=CONTENT`
- Webhook payload: `{ id, bank_brand_name, account_number, transaction_date, amount_in, transaction_content, reference_number }`
- Must parse `transaction_content` to extract order ID

## Files to Create
- `services/api/src/services/sepay.service.ts` - SePay service
- `services/api/src/routes/sepay.ts` - SePay routes (webhook, checkout)

## Files to Modify
- `services/api/src/config.ts` - Add SePay config
- `services/api/src/routes/billing.ts` - Add SePay checkout endpoint
- `services/api/src/app.ts` - Register SePay routes

## Implementation Steps

### 1. Add SePay config to config.ts
```typescript
sepay: {
  enabled: (process.env.SEPAY_ENABLED ?? "false").toLowerCase() === "true",
  apiToken: process.env.SEPAY_API_TOKEN ?? "",
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER ?? "",
  bankBrand: process.env.SEPAY_BANK_BRAND ?? "MBBank",
  webhookSecret: process.env.SEPAY_WEBHOOK_SECRET ?? "",
}
```

### 2. Create SePay Service
- `generateQrUrl(amount, orderId)` - Generate VietQR URL
- `verifyWebhook(payload, headers)` - Verify webhook authenticity
- `parseTransactionContent(content)` - Extract order ID from content
- `handlePaymentReceived(payload)` - Process successful payment

### 3. Create SePay Routes
- `POST /sepay/webhook` - Receive payment notifications
- `POST /billing/sepay/checkout` - Create pending payment & return QR

### 4. Create PendingPayment table for tracking
- Store pending payments waiting for confirmation
- Link to user, package, amount, unique code

## Success Criteria
- [ ] VietQR URL generated correctly
- [ ] Webhook receives and processes payments
- [ ] Payment model updated with SePay transaction

## Todo
- [ ] Create sepay.service.ts
- [ ] Create sepay.ts routes
- [ ] Update config.ts
- [ ] Register routes in app.ts
