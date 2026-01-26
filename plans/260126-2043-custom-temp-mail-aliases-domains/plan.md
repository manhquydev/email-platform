---
title: "Custom Temp Mail Aliases & Domains"
description: "Enable custom alias selection and multi-domain support for ephemeral inboxes with premium monetization"
status: pending
priority: P1
effort: 12-24h (depending on approach)
branch: main
tags: [ephemeral, aliases, domains, monetization, premium]
created: 2026-01-26
---

# Custom Temp Mail Aliases & Domains

## Overview

Enable users to choose custom aliases (e.g., `john.doe@ephemera.email`) instead of random strings (`swift-tiger-123@ephemera.email`) and select from multiple public domains. Implement premium tier for monetization.

## Current State

- **Random-only aliases**: `adjective-noun-number` format hardcoded
- **Single domain**: `EPHEMERAL_DOMAIN` env variable (default: `ephemera.email`)
- **No premium features**: No differentiation between free/paid ephemeral users
- **No domain selection UI**: Frontend has no controls for customization

## Competitor Analysis Summary

| Feature | temp-mail.org | boomlify.com | Ephemera (Current) |
|---------|---------------|--------------|-------------------|
| Custom Alias | Yes (free) | Yes (free) | No |
| Domain Selection | Limited free | Pool + BYOD | Single domain |
| Multi-inbox | Premium (10) | Free (50/day) | No |
| Retention | 10-60 min | 14 days free | 2 hours |
| Premium Tier | Yes | Yes (credits) | No |

## Implementation Approaches

### [Approach A: Incremental Enhancement](./approach-a-incremental.md)
- **Effort**: 12-16h
- **Focus**: Quick wins, minimal backend changes
- **Scope**: Custom alias input, domain dropdown, basic premium gate

### [Approach B: Full Feature Parity](./approach-b-full-parity.md)
- **Effort**: 20-28h
- **Focus**: Complete overhaul matching/exceeding competitors
- **Scope**: Multi-inbox, OTP parsing, extended retention, API tiers

## Recommendation

**Start with Approach A** for immediate user value (80/20 rule):
1. Custom aliases = highest user-requested feature
2. Domain selection = low effort, high impact
3. Premium gate = establishes monetization path
4. Can iterate to Approach B features based on user feedback

## Key Files

**Backend**:
- `services/api/src/services/ephemeral-inbox.service.ts` - Core logic
- `services/api/src/routes/ephemeral-inbox.ts` - API endpoints
- `services/api/prisma/schema.prisma` - Domain model (already exists)

**Frontend**:
- `services/web/src/pages/landing-page-modules/components/hero-inbox-widget.tsx` - Homepage widget
- `services/web/src/services/ephemeralService.ts` - API client
- `services/web/src/hooks/useEphemeralInbox.ts` - React hook

## Success Criteria

- [ ] Users can input custom alias (with validation)
- [ ] Users can select from 3+ public domains
- [ ] Premium domains gated behind auth/subscription
- [ ] Alias uniqueness enforced
- [ ] No regression in 0-click experience (random still default)

## Dependencies

- Domain table already exists with `isPublic` flag
- Subscription tier system exists (`SubscriptionTier` enum)
- Rate limiting already in place

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Backend: Custom alias + domain params | Pending |
| 2 | Frontend: UI controls for alias/domain | Pending |
| 3 | Premium: Domain tier gating | Pending |
| 4 | Polish: Validation, UX, error handling | Pending |
