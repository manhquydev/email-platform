---
title: "Enterprise Webmail Expansion Feasibility Study"
description: "Strategic assessment of transforming Ephemera from disposable inbox platform to enterprise webmail suite"
status: pending
priority: P1
effort: research
branch: main
tags: [strategy, feasibility, enterprise, webmail]
created: 2026-01-28
---

# Enterprise Webmail Expansion - Feasibility & Strategy

## Executive Summary

Ephemera is a well-architected disposable inbox platform. Transforming it into enterprise webmail requires **18-24 months** of development with a team of **4-6 engineers**. The market opportunity is real ($3.7B, 5.2% CAGR), but the technical gap is substantial.

## Strategic Recommendation: CONDITIONAL GO

**Conditions for GO:**
1. Secure funding for 18-month runway (~$800K-1.2M)
2. Acquire/hire protocol specialist (IMAP/SMTP expert)
3. Partner with existing CalDAV/CardDAV library maintainers
4. Target SME/MSP segment first (not enterprise)

**NO-GO if:**
- Cannot secure 18-month runway
- Cannot find protocol expertise
- Must ship within 12 months

## Current State Assessment

| Capability | Current | Enterprise Need | Gap |
|------------|---------|-----------------|-----|
| Mail Storage | Ephemeral | Persistent | HIGH |
| Protocols | HTTP/REST only | IMAP/POP3/JMAP | CRITICAL |
| Auth | Local JWT | LDAP/SSO/SCIM | HIGH |
| Productivity | None | CalDAV/CardDAV | HIGH |
| Multi-tenant | Basic | Full isolation | MEDIUM |

## Phase Overview

| Phase | Document | Status |
|-------|----------|--------|
| 1 | [Feasibility Assessment](./phase-01-feasibility-assessment.md) | Pending |
| 2 | [Market Positioning](./phase-02-market-positioning.md) | Pending |
| 3 | [Technical Roadmap](./phase-03-technical-roadmap.md) | Pending |
| 4 | [Resource Requirements](./phase-04-resource-requirements.md) | Pending |

## Key Decision Points

1. **Build vs Buy IMAP**: Build custom or integrate Dovecot?
2. **Calendar/Contacts**: Build or fork Radicale/Baikal?
3. **Target Market**: SME-first or Enterprise-first?
4. **Monetization**: Per-user SaaS or Support-based FOSS?

## Next Steps

1. Review each phase document
2. Present to stakeholders with GO/NO-GO criteria
3. If GO: Begin Phase A (Multi-tenant foundation)
