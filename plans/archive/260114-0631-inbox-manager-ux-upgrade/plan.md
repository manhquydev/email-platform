# Inbox Manager UX Upgrade Plan

**Date:** 2026-01-14
**Status:** Planning
**Priority:** High
**Target:** `/app/manager` page

## Overview

Comprehensive UX upgrade for the InboxManager page covering UI improvements, new features, and enhanced user experience for disposable email management.

## Current State Analysis

### Strengths
- Real-time WebSocket updates for new emails
- Tab navigation (Inboxes/Messages)
- Keyboard navigation support (j/k, Enter, Space)
- Batch selection and operations
- OTP extraction from emails
- Visibility rules panel

### Pain Points Identified
1. **Layout:** Tab-based switching loses context between inboxes and messages
2. **Email Viewer:** Modal overlay blocks workflow, no split-pane option
3. **Mobile UX:** No swipe gestures, limited touch optimization
4. **Search:** Basic search, no smart filters/chips
5. **Actions:** Limited quick actions, no snooze/pin visible in UI
6. **Empty States:** Generic, not actionable
7. **Loading:** Basic skeletons, no progressive loading

## Phases

| Phase | Name | Status | Priority | Link |
|-------|------|--------|----------|------|
| 01 | Split-Pane Layout | ✅ Complete | High | [phase-01](./phase-01-split-pane-layout.md) |
| 02 | Enhanced Email Viewer | ✅ Complete | High | [phase-02](./phase-02-enhanced-email-viewer.md) |
| 03 | Smart Search & Filters | Pending | Medium | [phase-03](./phase-03-smart-search.md) |
| 04 | Mobile UX Optimization | Pending | Medium | [phase-04](./phase-04-mobile-ux.md) |
| 05 | Quick Actions & Shortcuts | Pending | Medium | [phase-05](./phase-05-quick-actions.md) |
| 06 | Copy-First UX | ✅ Complete | High | [phase-06](./phase-06-copy-first-ux.md) |

## Success Metrics
- Time to copy email address: < 1 second
- Time to copy OTP: < 2 seconds
- Mobile usability score: > 90
- Keyboard navigation coverage: 100%

## Research Reports
- [Email UX Patterns](../reports/researcher-260114-0631-email-ux-patterns.md)
- [Inbox Card Patterns](../reports/researcher-260114-0631-inbox-card-patterns.md)
- [Email Viewer Patterns](../reports/researcher-260114-0631-email-viewer-patterns.md)

## Related Files
- `services/web/src/pages/InboxManager.tsx` (826 lines)
- `services/web/src/components/InboxCard.tsx`
- `services/web/src/components/EmailStream.tsx`
- `services/web/src/layouts/FocusStreamLayout.tsx`
- `services/api/src/routes/messages.ts`
- `services/api/src/routes/inboxes.ts`
