---
title: "Ephemera Frontend Sync"
description: "Frontend implementation for Ephemera Master Plan backend features"
status: pending
priority: P1
effort: 36h
branch: main
tags: [frontend, ephemera, react, typescript]
created: 2026-01-26
---

# Ephemera Frontend Sync Plan

## Overview

Backend features from Ephemera Master Plan (Phases 2-6) lack frontend UI. This plan implements frontend components to expose these features to users.

## Backend APIs Available

| Feature | Endpoint | Auth |
|---------|----------|------|
| Ephemeral Inbox | `POST/GET /ephemeral/inbox` | None |
| Aliases | `/api/aliases` | Required |
| Breach Monitor | `/api/breach-monitor` | Required |
| Privacy Score | `/api/privacy-score` | Required |
| Bundles | `/api/bundles` | None |
| Referrals | Via audit logs | Required |

## Frontend Stack

- **UI**: Custom components + Tailwind CSS (Nebula theme)
- **Routing**: React Router DOM
- **State**: React hooks + Context
- **API**: Custom `api()` utility in `utils/api.ts`
- **i18n**: react-i18next

## Phases

| Phase | Feature | Effort | Priority |
|-------|---------|--------|----------|
| 1 | [Public Ephemeral Inbox](./phase-01-ephemeral-inbox-public-page.md) | 8h | P1 |
| 2 | [AI Gatekeeper UI](./phase-02-ai-gatekeeper-ui.md) | 4h | P2 |
| 3 | [Identity Suite Dashboard](./phase-03-identity-suite-dashboard.md) | 12h | P1 |
| 4 | [Developer Portal](./phase-04-developer-portal.md) | 8h | P2 |
| 5 | [Referral & Community](./phase-05-referral-community.md) | 4h | P3 |

## Dependencies

- Existing UI components in `services/web/src/components/`
- API utility in `services/web/src/utils/api.ts`
- Auth context in `services/web/src/context/AuthContext`
- Nebula theme CSS classes

## Success Criteria

- [ ] All backend features accessible via UI
- [ ] Mobile-responsive design
- [ ] Accessible (WCAG 2.1 AA)
- [ ] TypeScript strict mode compliant
- [ ] No console errors
