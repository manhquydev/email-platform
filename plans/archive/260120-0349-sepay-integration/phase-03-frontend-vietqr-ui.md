# Phase 03: Frontend VietQR Payment UI

## Priority: HIGH | Status: PENDING

## Overview
Create VietQR checkout modal with QR code display and payment status polling.

## Files to Create
- `services/web/src/components/billing/vietqr-checkout-modal.tsx`
- `services/web/src/hooks/use-sepay-checkout.ts`

## Files to Modify
- `services/web/src/components/settings/subscription-modules/pricing-cards-section.tsx`

## Implementation Steps

### 1. Create VietQR Checkout Modal
- Display QR code from SePay URL
- Show payment instructions in Vietnamese
- Auto-poll for payment status every 5 seconds
- Show success/timeout states

### 2. Create useSepayCheckout Hook
```typescript
interface SepayCheckoutResult {
  qrUrl: string;
  orderCode: string;
  amount: number;
  expiresAt: string;
}

function useSepayCheckout() {
  const createCheckout = async (packageId: string): Promise<SepayCheckoutResult>;
  const checkStatus = async (orderCode: string): Promise<'PENDING' | 'COMPLETED'>;
}
```

### 3. Update Pricing Cards
- Replace Stripe checkout with SePay checkout
- Open VietQR modal instead of redirecting to Stripe

## UI Design
```
┌─────────────────────────────────────┐
│     Thanh toán qua VietQR           │
├─────────────────────────────────────┤
│                                     │
│        ┌─────────────┐              │
│        │   QR CODE   │              │
│        │   (VietQR)  │              │
│        └─────────────┘              │
│                                     │
│   Số tiền: 99,000đ                  │
│   Nội dung: EP_XXXXXX               │
│                                     │
│   ⏱ Hết hạn sau: 14:59              │
│                                     │
│   [Đang chờ thanh toán...]          │
│                                     │
└─────────────────────────────────────┘
```

## Success Criteria
- [ ] QR code displays correctly
- [ ] Payment status updates in real-time
- [ ] Success message shown after payment
- [ ] Timeout handling after 15 minutes
