# Inbox Viewer Search Limits

**Date:** 2026-01-12
**Status:** In Progress
**Priority:** High

## Overview

Add admin-configurable system to limit email display in `/inbox-viewer` public page. Admin can set limits by:
- Number of recent emails
- Number of recent days
- Both constraints
- No limits (all emails)

## Phases

| Phase | Description | Status | File |
|-------|-------------|--------|------|
| 01 | Backend: System settings & API | Pending | [phase-01-backend.md](./phase-01-backend.md) |
| 02 | Frontend: Admin UI settings panel | Pending | [phase-02-admin-ui.md](./phase-02-admin-ui.md) |
| 03 | Apply limits to public inbox API | Pending | [phase-03-apply-limits.md](./phase-03-apply-limits.md) |
| 04 | Testing & Deployment | Pending | [phase-04-testing.md](./phase-04-testing.md) |

## System Settings Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `PUBLIC_INBOX_LIMIT_MODE` | enum | `none` | Mode: `count`, `days`, `both`, `none` |
| `PUBLIC_INBOX_MAX_EMAILS` | number | `100` | Max emails to show (when mode includes count) |
| `PUBLIC_INBOX_MAX_DAYS` | number | `7` | Max days back (when mode includes days) |

## Architecture

```
Admin Settings Page
       ↓
POST /admin/system/settings
       ↓
SystemSetting table (key-value)
       ↓
GET /public/inbox/:email/messages
       ↓
Apply limits based on settings
       ↓
Return filtered messages
```

## Success Criteria

- [ ] Admin can configure limit mode via UI
- [ ] Admin can set max emails count
- [ ] Admin can set max days
- [ ] Public inbox API respects these limits
- [ ] Changes take effect immediately (no restart)
- [ ] Tests pass
- [ ] Deployed to production
