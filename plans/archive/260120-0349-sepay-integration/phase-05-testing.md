# Phase 05: Testing & Integration

## Priority: HIGH | Status: PENDING

## Overview
Test SePay integration end-to-end.

## Test Scenarios

### 1. Unit Tests
- [ ] SePay service: QR URL generation
- [ ] SePay service: Transaction content parsing
- [ ] SePay service: Webhook verification

### 2. Integration Tests
- [ ] POST /sepay/webhook - Valid payload
- [ ] POST /sepay/webhook - Invalid signature
- [ ] POST /billing/sepay/checkout - Create pending payment
- [ ] GET /billing/sepay/status/:orderCode - Check status

### 3. E2E Tests
- [ ] User clicks upgrade → QR modal appears
- [ ] Simulate webhook → Payment confirmed
- [ ] User tier upgraded after payment

## Test Files
- `services/api/src/test/sepay.test.ts`
- `services/api/src/test/sepay.integration.test.ts`

## Manual Testing Steps
1. Create test package in admin panel
2. Go to pricing page, select package
3. Scan QR with banking app (test environment)
4. Verify webhook received (check logs)
5. Verify user tier updated

## Success Criteria
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual test successful
- [ ] No regressions in existing billing tests
