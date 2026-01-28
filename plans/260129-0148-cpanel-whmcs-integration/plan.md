---
title: "cPanel & WHMCS Email Hosting Integration"
description: "Complete integration of Ephemera Email Platform with cPanel/WHM and WHMCS for hosting providers"
status: in_progress
priority: P1
effort: 8 weeks
branch: feature/cpanel-integration
tags: [cpanel, whmcs, hosting, integration, plugin]
created: 2026-01-29
---

# cPanel & WHMCS Email Hosting Integration

## Executive Summary

Tích hợp Ephemera Email Platform với hệ sinh thái cPanel/WHM và WHMCS để tiếp cận 100K+ hosting providers toàn cầu. Plan này bao gồm 6 phases hoàn chỉnh từ API foundation đến go-to-market.

## Phase Overview

| Phase | File | Focus | Effort | Priority | Status |
|-------|------|-------|--------|----------|--------|
| 01 | [phase-01-hosting-provider-api.md](phase-01-hosting-provider-api.md) | API Foundation cho hosting providers | 2 weeks | P1 | Completed (2026-01-29) |
| 02 | [phase-02-cpanel-whm-plugin.md](phase-02-cpanel-whm-plugin.md) | cPanel/WHM Plugin Development | 2 weeks | P1 | Completed (2026-01-29) |
| 03 | [phase-03-whmcs-module.md](phase-03-whmcs-module.md) | WHMCS Provisioning Module | 1.5 weeks | P1 | Completed (2026-01-29) |
| 04 | [phase-04-directadmin-plesk.md](phase-04-directadmin-plesk.md) | DirectAdmin & Plesk Extensions | 1.5 weeks | P2 | Completed (2026-01-29) |
| 05 | [phase-05-testing-documentation.md](phase-05-testing-documentation.md) | Testing & Documentation | 1 week | P1 | Completed (2026-01-29) |
| 06 | [phase-06-go-to-market.md](phase-06-go-to-market.md) | Launch & Partner Acquisition | Ongoing | P1 | Pending |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOSTING PROVIDER ECOSYSTEM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   cPanel     │  │    Plesk     │  │ DirectAdmin  │          │
│  │   Plugin     │  │  Extension   │  │   Plugin     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              WHMCS Provisioning Module                      ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           ││
│  │  │ Create  │ │Suspend  │ │Terminate│ │ Upgrade │           ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           ││
│  └──────────────────────────┬──────────────────────────────────┘│
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 EPHEMERA HOSTING PROVIDER API                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ /v1/tenant  │  │/v1/mailbox  │  │ /v1/domain  │             │
│  │   CRUD      │  │   CRUD      │  │   Verify    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ /v1/usage   │  │ /v1/billing │  │/v1/webhook  │             │
│  │  Metrics    │  │   Sync      │  │  Events     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EPHEMERA CORE PLATFORM                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   IMAP   │ │   SMTP   │ │  CalDAV  │ │   LDAP   │           │
│  │  Server  │ │  Server  │ │  Server  │ │   Sync   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Dependencies

### Technical Prerequisites
- [x] Multi-tenancy (Organization model) - Phase 01 Enterprise
- [x] IMAP/POP3 protocol support - Phase 02 Enterprise
- [x] SMTP Submission - Phase 03 Enterprise
- [x] CalDAV/CardDAV - Phase 06 Enterprise
- [x] Hosting Provider API - **This Plan Phase 01**
- [x] Usage metering & billing sync - **This Plan Phase 01**

### External Dependencies
- cPanel/WHM v120+ (UAPI support)
- WHMCS v8.x+
- Plesk Obsidian 18.x+
- DirectAdmin 1.65+

## Success Criteria

### Phase 1 MVP (Week 8)
- [ ] 5 pilot hosting providers integrated
- [ ] 100 domains provisioned
- [ ] <5 min avg provisioning time
- [ ] 99.9% API uptime

### Phase 2 Growth (Month 3)
- [ ] 20 hosting providers
- [ ] 1,000 domains
- [ ] cPanel Marketplace listing

### Phase 3 Scale (Month 6)
- [ ] 50+ hosting providers
- [ ] 10,000 domains
- [ ] $25K MRR

## Pricing Model

| Tier | $/domain/month | Mailboxes | Storage/mailbox | Features |
|------|----------------|-----------|-----------------|----------|
| Lite | $1 | 5 | 1GB | IMAP/POP3, Webmail |
| Pro | $5 | Unlimited | 10GB | + CalDAV, Forwarding |
| Business | $10 | Unlimited | 50GB | + LDAP, Compliance, API |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| cPanel API changes | Low | High | Abstraction layer, version pinning |
| IP reputation issues | Medium | High | MailChannels relay, warm-up process |
| Support burden | High | Medium | Self-service docs, tiered support |
| Partner churn | Medium | Medium | Long-term contracts, sticky features |

## Timeline

```
Week 1-2: Phase 01 - Hosting Provider API
Week 3-4: Phase 02 - cPanel/WHM Plugin
Week 5-6: Phase 03 - WHMCS Module
Week 6-7: Phase 04 - DirectAdmin/Plesk
Week 7-8: Phase 05 - Testing & Documentation
Week 8+:  Phase 06 - Go-to-Market (ongoing)
```

## Quick Start

```bash
# 1. Checkout feature branch
git checkout -b feature/cpanel-integration

# 2. Install dependencies
cd services/api && pnpm install

# 3. Run migrations
pnpm exec prisma migrate dev --name hosting_provider_api

# 4. Start development
pnpm dev
```
