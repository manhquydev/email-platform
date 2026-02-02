---
title: "cPanel/WHMCS Project Integration"
description: "Integrate completed hosting provider backend into live product with Admin UI, SSO, and billing"
status: completed
priority: P1
effort: 4w
branch: main
tags: [hosting-provider, cpanel, whmcs, admin-ui, sso, billing]
created: 2026-01-29
---

# cPanel/WHMCS Project Integration Plan

## Context
- [Research: Integration Strategy](./research/researcher-01-integration-strategy.md)
- [Research: Codebase Analysis](./research/researcher-02-codebase-analysis.md)
- Backend: `services/api/src/services/hosting-provider.service.ts` (756 lines, complete)
- Routes: `services/api/src/routes/provider.ts` (413 lines, complete)

## Current State
Backend foundation **95% complete**: Provider auth, tenant/domain/mailbox CRUD, webhooks ready.
Missing: Admin UI, SSO endpoint, billing cron, partner docs.

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Admin UI for Provider Management | 5d | completed | [phase-01](./phase-01-admin-ui-provider-management.md) |
| 2 | SSO Endpoint for WHMCS | 2d | completed | [phase-02](./phase-02-sso-endpoint-whmcs-integration.md) |
| 3 | Billing Snapshot Cron Job | 2d | completed | [phase-03](./phase-03-billing-snapshot-job.md) |
| 4 | Pilot Partner Onboarding | 3d | completed | [phase-04](./phase-04-pilot-partner-onboarding.md) |

## Key Dependencies
- Prisma schema: `HostingProvider`, `ProviderTenant`, `ProviderUsageLog` models exist
- Auth middleware: `provider-auth.ts` ready
- Webhook service: `provider-webhook.service.ts` ready

## Success Criteria
- [x] Admin can register/manage hosting providers via UI
- [x] WHMCS "Login to Webmail" button works via SSO
- [x] Usage snapshots stored nightly for billing
- [x] 2-3 pilot partners onboarded successfully

## Risk Summary
| Risk | Mitigation |
|------|------------|
| SSO token security | Short TTL (5min), single-use, IP binding |
| Provider abuse | Rate limiting per provider ID |
| Billing accuracy | Dual-write: real-time + nightly snapshot |

## Validation Summary

**Validated:** 2026-01-29
**Questions asked:** 5

### Confirmed Decisions
| Decision | User Choice |
|----------|-------------|
| Billing model | **Allocated quotas** - tính phí theo mailboxes/storage đã provision |
| SSO IP binding | **Required always** - bắt buộc IP binding cho security |
| Provider registration | **Admin-only** - chỉ Super Admin tạo provider |
| Pilot partners | **Chưa có** - cần outreach tìm partners |
| Timeline | **Flexible** - không áp deadline cụ thể |

### Action Items
- [x] Phase 02: Update SSO service để IP binding là REQUIRED (không optional)
- [x] Phase 04: Thêm task outreach tìm pilot partners (WHT forum, cPanel community)
- [x] Phase 03: Billing snapshot chỉ cần track allocated quotas (đơn giản hóa)

### Implications
1. **SSO stricter**: Mọi SSO token PHẢI có IP binding - cần update `provider-sso.service.ts`
2. **Billing simpler**: Không cần track actual usage, chỉ snapshot allocated quotas
3. **Pilot effort +**: Cần thêm thời gian cho partner outreach trong Phase 04
