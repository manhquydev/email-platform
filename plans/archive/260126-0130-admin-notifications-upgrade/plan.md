---
title: "Admin Notifications Upgrade"
description: "Transform admin notifications into a comprehensive command center with history, templates, scheduling, and analytics"
status: done
priority: P2
effort: 32h
branch: main
tags: [admin, notifications, telegram, templates, analytics]
created: 2026-01-26
completed: 2026-01-26
---

# Admin Notifications Upgrade

## Overview
Upgrade `/admin/notifications` from basic send form to full notification management system with history, templates, scheduling, Telegram enhancements, and analytics.

## Research Reports
- [Telegram Bot API](./research/researcher-01-telegram-bot-api.md)
- [UI/UX Patterns](./research/researcher-02-notification-ui-patterns.md)

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Database Schema & API | ✅ done | 6h | [phase-01](./phase-01-database-schema-api.md) |
| 2 | Notification History UI | ✅ done | 6h | [phase-02](./phase-02-notification-history-ui.md) |
| 3 | Template Management | ✅ done | 6h | [phase-03](./phase-03-template-management.md) |
| 4 | Scheduled Notifications | ✅ done | 5h | [phase-04](./phase-04-scheduled-notifications.md) |
| 5 | Telegram Enhancements | ✅ done | 5h | [phase-05](./phase-05-telegram-enhancements.md) |
| 6 | Analytics Dashboard | ✅ done | 4h | [phase-06](./phase-06-analytics-dashboard.md) |

## Key Dependencies
- Existing: Prisma, Fastify, React 19, TailwindCSS, Telegram service
- New: TanStack Table, TipTap editor, Recharts, node-cron

## Architecture Summary
```
┌─────────────────────────────────────────────────────────┐
│                  Admin Notification UI                   │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ History  │ Templates│ Schedule │ Compose  │  Analytics  │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬──────┘
     │          │          │          │            │
     └──────────┴──────────┴──────────┴────────────┘
                           │
              ┌────────────┴────────────┐
              │    Notification API      │
              ├──────────────────────────┤
              │ • Templates CRUD         │
              │ • Logs & History         │
              │ • Scheduling             │
              │ • Send (Web + Telegram)  │
              └────────────┬─────────────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
┌────┴────┐         ┌──────┴──────┐       ┌─────┴─────┐
│ Database │         │  Telegram   │       │   Cron    │
│ (Prisma) │         │   Service   │       │  Service  │
└──────────┘         └─────────────┘       └───────────┘
```

## Success Criteria
- [x] Full notification history with filters/search
- [x] Template CRUD with variable insertion
- [x] Scheduled notifications with cron execution
- [x] Telegram inline keyboards + delivery tracking
- [x] Analytics dashboard with KPI cards and charts

## Validation Summary

**Validated:** 2026-01-26
**Questions asked:** 7

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| **MVP Scope** | All 6 phases (32h) - Full implementation |
| **Bulk Send Rate Limiting** | Add Redis queue with Bull for proper rate limiting |
| **Template Editor** | TipTap with variable chips - rich UX |
| **Log Privacy** | IDs only with lookup - GDPR compliant |
| **Telegram Acknowledge** | Yes, add button for read tracking |
| **Scheduling Backend** | node-cron in API process |
| **Charts Library** | Recharts for analytics |

### Action Items (Plan Updates Needed)
- [ ] Phase 1: Add Bull queue dependency and NotificationQueue service
- [ ] Phase 1: Ensure NotificationLog uses userId only (no denormalized PII)
- [ ] Phase 5: Confirm Acknowledge button implementation with callback handler
- [ ] Phase 6: Use Recharts for all visualizations

### Dependencies Update
Add to new dependencies:
- `bull` + `@types/bull` - Redis-based job queue for bulk sends
- `ioredis` - Redis client for Bull (if not already present)
