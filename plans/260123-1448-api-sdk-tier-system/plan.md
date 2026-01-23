# API SDK Tier System Plan

```yaml
status: in_progress
created: 2026-01-23
priority: HIGH
```

## Overview

Complete tier-based rate limiting and quota system for API SDKs.

## Current State

| Component | Status |
|-----------|--------|
| Rate limit headers | ✅ Exists |
| Subscription tiers | ✅ In Prisma schema |
| Tier middleware | ❌ Missing |
| SDK rate limit handling | ⚠️ Partial |
| Documentation | ⚠️ Incomplete |

## Tier Limits

| Tier | Requests/min | Inboxes/day | Webhooks | Messages/inbox |
|------|-------------|-------------|----------|----------------|
| FREE | 60 | 100 | 1 | 100 |
| STARTER | 300 | 1,000 | 3 | 500 |
| PROFESSIONAL | 600 | 10,000 | 10 | 1,000 |
| BUSINESS | 1,200 | 50,000 | 25 | 5,000 |
| ENTERPRISE | Unlimited | Unlimited | Unlimited | Unlimited |

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Tier Config & Middleware](./phase-01-tier-middleware.md) | pending |
| 2 | [SDK Updates](./phase-02-sdk-updates.md) | pending |
| 3 | [Documentation](./phase-03-documentation.md) | pending |

## Files to Create/Modify

- `services/api/src/config/tier-limits.ts` - Tier configuration
- `services/api/src/middleware/tier-rate-limit.ts` - Rate limit middleware
- `packages/sdk-*/` - Update error handling
- `docs-site/docs/` - Update documentation
