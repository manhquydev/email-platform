---
title: "Microsoft Clarity Analytics Integration"
description: "Integrate Clarity event tracking, deep links, and Data Export API into admin dashboard"
status: pending
priority: P2
effort: 6h
branch: main
tags: [analytics, clarity, admin, frontend, backend]
created: 2026-01-11
---

# Microsoft Clarity Analytics Integration

## Overview

Enhance existing Clarity integration (project ID: `uzly2516v2`) with three capabilities:
1. **Event Tracking** - Track user actions via `clarity("event")` and `clarity("identify")`
2. **Deep Links** - Add "View in Clarity" buttons linking to filtered recordings/heatmaps
3. **Data Export API** - Backend proxy to fetch live insights, display in AdminDashboard

## Current State

- Clarity initialized in `main.tsx` using `@microsoft/clarity` package
- AdminDashboard uses `recharts` for visualizations
- AnalyticsPage tracks public inbox viewer activity via AuditLog
- Backend analytics routes at `/admin/analytics/*`

## Architecture

```
Frontend (React)                    Backend (Fastify)              Clarity
─────────────────                   ─────────────────              ───────
clarity("event", "login")  ──────────────────────────────────────> Session Recording
clarity("identify", id)    ──────────────────────────────────────> User Linking

AdminDashboard.tsx ────────> GET /admin/analytics/clarity ────────> Data Export API
  - Live insights widget            - JWT auth proxy                  (Live Insights)
  - Deep link buttons               - Cache layer (5min TTL)
```

## Phase Summary

| Phase | Focus | Effort | Files Modified |
|-------|-------|--------|----------------|
| 1 | Event Tracking | 2h | main.tsx, AuthContext, hooks/useClarity.ts (new) |
| 2 | Deep Links | 1.5h | AnalyticsPage.tsx, AdminDashboard.tsx |
| 3 | Data Export API | 2.5h | analytics.ts (backend), AdminDashboard.tsx |

## Dependencies

- Clarity JWT token (generate in Project Settings > Data Export)
- Environment variable: `CLARITY_API_TOKEN` (backend)
- Environment variable: `VITE_CLARITY_PROJECT_ID` (already exists)

## Risk Mitigation

- **CORS**: Backend proxy avoids browser CORS restrictions
- **Rate limits**: 5-min cache on API responses
- **Privacy**: Use `data-clarity-mask` on sensitive inputs

## Success Criteria

- [ ] User actions tracked in Clarity dashboard with custom events
- [ ] Admin can click to view specific user recordings in Clarity
- [ ] Live insights (active users, top pages) displayed in AdminDashboard

## Implementation Order

1. `phase-01-event-tracking.md` - Foundation for all tracking
2. `phase-02-deep-links.md` - Quick wins, no backend changes
3. `phase-03-data-export-api.md` - Most complex, backend + frontend
