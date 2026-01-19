# SePay Integration Plan

## Overview
Tích hợp thanh toán SePay (VietQR) vào hệ thống subscription, tạm tắt Stripe để tập trung hoàn thiện.

## Status: IN PROGRESS

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 01](./phase-01-backend-sepay-service.md) | Backend: SePay Service & Routes | Pending |
| [Phase 02](./phase-02-database-migration.md) | Database: Add SePay fields to Payment model | Pending |
| [Phase 03](./phase-03-frontend-vietqr-ui.md) | Frontend: VietQR Payment UI | Pending |
| [Phase 04](./phase-04-disable-stripe.md) | Disable Stripe temporarily | Pending |
| [Phase 05](./phase-05-testing.md) | Testing & Integration | Pending |

## Key Dependencies
- SePay API Token from dashboard
- Bank account details (Account Number, Bank Brand)
- Webhook endpoint publicly accessible

## Environment Variables Required
```bash
SEPAY_ENABLED=true
SEPAY_API_TOKEN=your_api_token
SEPAY_ACCOUNT_NUMBER=your_bank_account
SEPAY_BANK_BRAND=MBBank
SEPAY_WEBHOOK_SECRET=optional_secret
```

## Reports
- [SePay API Research](../reports/researcher-260120-0349-sepay-api-research.md)
