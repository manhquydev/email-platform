# Implementation Plan: Settings Tabs Completion

## Overview

**Objective:** Hoàn thiện 4 tab Settings: Filters, Labels, Retention, Teams
**Approach:** Phased Rollout - Debug → Fix → Enhance → Test cho mỗi tab
**Estimated Time:** 8-12 ngày (2-3 ngày/phase)

## Current State Analysis

### ✅ Đã Có (Working)

| Component | Frontend | Backend | Database |
|-----------|----------|---------|----------|
| **Filters** | FiltersTab.tsx + modules | filters.ts routes | EmailFilter model |
| **Labels** | LabelsTab.tsx + modules | filters.ts (labels section) | Label, MessageLabel models |
| **Retention** | RetentionSettings.tsx + modules | retention.ts sweep job | User.retentionDays, Inbox.retentionDays |
| **Teams** | TeamSettings.tsx + modules | teams.ts routes | Team, TeamMember, TeamInbox models |

### ❌ Cần Debug/Fix

1. **Filters**: `processFiltersForMessage` được import trong worker.ts nhưng cần verify được gọi đúng
2. **Labels**: Labels sync với message view chưa verify
3. **Retention**: Sweep job chạy nhưng PATCH `/auth/me` cần verify hỗ trợ `retentionDays`
4. **Teams**: Shared inbox access check thiếu trong messages query

## Phases

| Phase | Tab | Focus | File |
|-------|-----|-------|------|
| 1 | Filters | Debug filter execution + test preview | [phase-01-filters.md](./phase-01-filters.md) |
| 2 | Labels | Sync message view + bulk operations | [phase-02-labels.md](./phase-02-labels.md) |
| 3 | Retention | Verify sweep + manual purge | [phase-03-retention.md](./phase-03-retention.md) |
| 4 | Teams | Fix shared inbox permissions | [phase-04-teams.md](./phase-04-teams.md) |

## Key Files Reference

### Frontend
- `services/web/src/components/settings/FiltersTab.tsx`
- `services/web/src/components/settings/LabelsTab.tsx`
- `services/web/src/components/settings/RetentionSettings.tsx`
- `services/web/src/components/settings/TeamSettings.tsx`
- `services/web/src/components/settings/*-modules/`

### Backend
- `services/api/src/routes/filters.ts` - Filters + Labels CRUD
- `services/api/src/routes/teams.ts` - Teams CRUD
- `services/api/src/routes/auth.ts` - User profile update
- `services/api/src/routes/inboxes.ts` - Inbox settings
- `services/api/src/services/emailFilters.ts` - Filter execution engine
- `services/api/src/retention.ts` - Retention sweep job
- `services/api/src/worker.ts` - Email processing worker

### Database
- `services/api/prisma/schema.prisma` - All models defined

## Success Criteria

- [ ] Filters được áp dụng khi email đến (verify via logs)
- [ ] Labels hiển thị trong message list
- [ ] Retention settings apply đúng theo tier/inbox
- [ ] Team members có thể xem shared inbox messages

## Dependencies

- Node.js 18+
- PostgreSQL với Prisma migrations đã apply
- Redis cho BullMQ worker

## Status

- **Created:** 2026-01-19
- **Status:** Planning
- **Branch:** main
