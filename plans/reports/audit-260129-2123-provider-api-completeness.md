# Provider API Audit Report

**Date:** 2026-01-29
**Version:** 1.0
**Status:** Audit Complete

## Executive Summary
The Provider API foundation is solid, covering core tenant, domain, and mailbox management. Security architecture (API keys, IP-bound SSO) is implemented correctly. However, key lifecycle management features (updating mailboxes, managing provider settings) are missing, and production safeguards like rate limiting are not visible in the reviewed code.

## 1. Feature Completeness Matrix

| Feature Area | Status | Gaps / Notes |
| :--- | :--- | :--- |
| **Provider Auth** | ✅ Complete | SHA-256 hashed keys, correct middleware implementation. |
| **Provider Mgmt** | ⚠️ Partial | Read/Regenerate Key only. **Missing:** Update (webhook URL, emails), Delete. |
| **Tenant CRUD** | ✅ Complete | Create, Read, Update, List, Suspend/Unsuspend, Terminate implemented. |
| **Domain Mgmt** | ✅ Complete | Add, List, DNS Records, Verify, Remove implemented. |
| **Mailbox CRUD** | ⚠️ Partial | Create, List, Delete implemented. **Missing:** Update (Password, Quota). |
| **SSO** | ✅ Complete | Token generation with IP binding. Validation service exists. |
| **Webhooks** | ✅ Complete | Event emission integrated into mutations. Test/List endpoints exist. |
| **Usage/Billing** | ✅ Complete | Aggregated metrics for Provider and Per-Tenant available. |

## 2. Critical Gaps & Issues

### Missing Functionality
1.  **Mailbox Updates:** No endpoint to update mailbox password, quota, or display name (`PATCH /tenants/:id/mailboxes/:email` missing).
2.  **Provider Configuration:** Providers cannot update their own `webhookUrl` or `contactEmail` via API.
3.  **Domain Verification Webhook:** While `domain.verified` event exists, the actual DNS check is manual trigger only. No background job mechanism observed in this context.

### Security & Reliability
1.  **Rate Limiting:** No explicit rate limiting middleware found in `provider.ts`. Essential for preventing noisy neighbor issues in multi-tenant environments.
2.  **Input Validation:** Regex for domain validation `^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$` is generally safe but strict.
3.  **SSO IP Binding:** Binding SSO tokens to `clientIp` (User's IP) is strictly enforced. Ensure WHMCS/cPanel server forwards the correct end-user IP, not the server IP.

## 3. Recommendations

1.  **Implement Mailbox Update:** Add `PATCH` route for mailboxes to allow password resets and quota adjustments.
2.  **Add Rate Limiting:** Apply `@fastify/rate-limit` to `providerRoutes`, scoped by `providerId`.
3.  **Provider Settings:** Add endpoint for providers to update their Webhook URL.
4.  **Pagination:** `listTenants` has `limit`/`offset` (good), but `listMailboxes` and `listDomains` do not support pagination (potential performance risk for large tenants).

## Unresolved Questions
- How are Providers initially registered? (Likely internal Admin API).
- Where is the SSO consumption route (`/auth/sso`)? (Presumably in User Auth routes).
