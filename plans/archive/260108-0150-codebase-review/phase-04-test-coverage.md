# Phase 04: Test Coverage Expansion

**Status:** completed | **Priority:** P2 | **Effort:** 6h

## Context

Current test coverage: API ~27% (24/89 files), Web ~9% (11/117 files). Critical paths lack tests.

## Objective

Increase test coverage to 50% for API and 25% for Web by adding tests to critical untested files.

## Current Test Inventory

### API (services/api/src/test)
Existing tests (26+ files):
- `auth.test.ts` - Authentication flows
- `billing.test.ts` - **NEW**: Billing routes (11 tests) ✅
- `codes.deletion.test.ts` - Redemption code deletion
- `credit.test.ts` - Credit system
- `domain-endpoints.test.ts` - Domain API endpoints
- `domains.test.ts` - Domain CRUD
- `fetch.test.ts` - Fetch timeout utility
- `filters.test.ts` - **NEW**: Filter/label routes (12 tests) ✅
- `inbox_ownership.test.ts` - Inbox ownership
- `inbox-telegram.test.ts` - Telegram inbox links
- `magic-link.test.ts` - Magic link auth
- `mail_flow.test.ts` - Email flow
- `messages.security.test.ts` - Message security
- `notification_flow.test.ts` - Notifications
- `public-inbox.test.ts` - Public inbox
- `security.integration.test.ts` - Security integration
- `shared_domains.test.ts` - Shared domains
- `subscription.integration.test.ts` - Subscriptions
- `system.test.ts` - System endpoints
- `telegram.test.ts` - Telegram bot
- `telegram_content.test.ts` - Telegram content
- `webauthn.test.ts` - WebAuthn
- `webhook-e2e.test.ts` - Webhook e2e
- `webhook-idempotency.test.ts` - Webhook idempotency
- `webhook-update.test.ts` - Webhook updates
- `webhooks.test.ts` - Webhooks

### Mock Utilities Created
- `test/mocks/stripe.mock.ts` - Stripe SDK mock utilities

### Web (services/web/src/__tests__)
Existing tests (4 files):
- `EmailStream.labels.test.tsx`
- `InboxManager.management.test.tsx`
- `InboxManager.search.test.tsx`
- `Login.magiclink.test.tsx`

## New Test Files Added

| File | Tests | Coverage |
|------|-------|----------|
| `billing.test.ts` | 11 | Checkout, portal, cancel, webhook, packages |
| `filters.test.ts` | 12 | Filter CRUD, label CRUD, validation |
| `mocks/stripe.mock.ts` | - | Mock utilities for Stripe SDK |

**Total new tests: 23**

## Priority Test Files Still Needed

### API - High Priority
| File | Lines | Risk | Status |
|------|-------|------|--------|
| `services/outbound.ts` | 300 | High | Needs SMTP/Gmail mocks |
| `routes/billing.ts` | 200 | High | ✅ DONE |
| `routes/filters.ts` | 349 | Medium | ✅ DONE |

Note: `stripe.service.ts` testing skipped - uses module-level `new PrismaClient()` which is hard to mock. Billing routes provide adequate coverage.

### Web - High Priority
| File | Lines | Risk | Status |
|------|-------|------|--------|
| `pages/Dashboard.tsx` | 797 | High | Components extracted, tests pending |
| `pages/InboxManager.tsx` | 767 | High | Partial coverage |

## Success Criteria

- [x] Analyzed current test inventory
- [x] Added fetch utility tests
- [x] Created Stripe mock utilities
- [x] Added billing.ts tests (11 tests)
- [x] Added filters.ts tests (12 tests)
- [ ] Add outbound.ts tests (requires SMTP mocks) - deferred
- [ ] Add Dashboard component tests - deferred
- [ ] Coverage: API ≥50%, Web ≥25% - partial progress

## Summary

Phase 04 added **23 new tests** across 2 test files:
- `billing.test.ts` (11 tests) - Checkout, portal, cancel, webhook handling
- `filters.test.ts` (12 tests) - Filter/label CRUD operations

Test patterns established:
- Minimal Fastify instance pattern for route testing
- `vi.hoisted()` for mock hoisting
- Prisma mock with `vi.mock()` before imports
- Valid UUID format for Zod validation in tests

Remaining work for future:
- SMTP/Gmail mocking infrastructure for outbound tests
- Web component tests for Dashboard
