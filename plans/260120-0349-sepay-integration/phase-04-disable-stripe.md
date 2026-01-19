# Phase 04: Disable Stripe Temporarily

## Priority: MEDIUM | Status: PENDING

## Overview
Temporarily disable Stripe integration while focusing on SePay.

## Files to Modify
- `services/api/src/routes/billing.ts` - Add payment method toggle
- `services/api/src/config.ts` - Add STRIPE_ENABLED flag

## Implementation Steps

### 1. Add STRIPE_ENABLED config
```typescript
stripe: {
  enabled: (process.env.STRIPE_ENABLED ?? "false").toLowerCase() === "true",
  apiKey: process.env.STRIPE_API_KEY ?? "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
}
```

### 2. Update billing routes
- Check `stripeEnabled` before allowing Stripe checkout
- Default to SePay when Stripe disabled
- Return payment methods availability in `/billing/tiers`

### 3. Update .env.example
```bash
# Payment Providers
STRIPE_ENABLED=false
SEPAY_ENABLED=true
```

### 4. Update billing response
```typescript
// GET /billing/tiers response
{
  tiers: [...],
  paymentMethods: {
    stripe: false,
    sepay: true
  }
}
```

## Success Criteria
- [ ] Stripe checkout returns 503 when disabled
- [ ] SePay checkout works when enabled
- [ ] Frontend shows only available payment methods
