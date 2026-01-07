---
title: "Public Inbox Viewer with Telegram Notifications"
description: "Public email inbox viewer with per-inbox Telegram notification linking"
status: validated
priority: P2
effort: 16h
branch: main
tags: [feature, public-api, telegram, frontend]
created: 2026-01-07
validated: 2026-01-07
---

# Public Inbox Viewer with Per-Inbox Telegram Notifications

## Overview

Implement a public-facing email inbox viewer (no auth) with ability to link any inbox to Telegram for real-time notifications. This extends existing Telegram integration from user-based to inbox-based.

## Validation Summary

**Validated:** 2026-01-07
**Questions Asked:** 7

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Dual notifications | Yes, both user-level (ownerId) AND inbox-level fire |
| Max Telegram links per inbox | 5 links |
| Token expiry | 24 hours |
| Public access scope | All verified domains are viewable |
| CAPTCHA requirement | No CAPTCHA, rely on rate limiting |
| Delete via public viewer | No, view only |
| Notification format | Full format (same as existing - OTP extraction, preview, buttons) |

### Action Items

- [x] All decisions align with current plan - no changes needed
- [x] Plan ready for implementation

## Phase Summary

| Phase | Description | Status | Effort | Dependencies | Parallel With |
|-------|-------------|--------|--------|--------------|---------------|
| [01](./phase-01-database-schema.md) | Database Schema | ✅ done | 1h | - | - |
| [02](./phase-02-backend-public-inbox-api.md) | Backend - Public Inbox API | ✅ done | 3h | 01 | 03 |
| [03](./phase-03-backend-telegram-linking-api.md) | Backend - Telegram Linking API | ✅ done | 3h | 01 | 02 |
| [04](./phase-04-frontend-inbox-viewer.md) | Frontend - Inbox Viewer Page | ✅ done | 4h | 01, 02 | 05 |
| [05](./phase-05-frontend-telegram-modal.md) | Frontend - Telegram Link Modal | ✅ done | 2h | 01, 03 | 04 |
| [06](./phase-06-worker-integration.md) | Worker Integration + Tests | pending | 3h | 01-05 | - |

## Dependency Graph

```
Phase 01 (Database)
    │
    ├─────────────────┐
    │                 │
    v                 v
Phase 02          Phase 03
(Public API)      (Telegram API)
    │                 │
    v                 v
Phase 04          Phase 05
(Inbox Page)      (TG Modal)
    │                 │
    └────────┬────────┘
             │
             v
         Phase 06
    (Worker + Tests)
```

## Parallelization Strategy

**Parallel Group A:** Phase 02 + Phase 03 (both depend only on 01)
**Parallel Group B:** Phase 04 + Phase 05 (04 needs 02, 05 needs 03)
**Sequential:** Phase 01 first, Phase 06 last

## File Ownership Matrix

| File | Owner Phase | Type |
|------|-------------|------|
| `prisma/schema.prisma` | 01 | Modify |
| `prisma/migrations/*` | 01 | Create |
| `routes/public-inbox.ts` | 02 | Create |
| `routes/public-telegram.ts` | 03 | Create |
| `services/inbox-telegram-service.ts` | 03 | Create |
| `pages/InboxViewer.tsx` | 04 | Create |
| `components/inbox-viewer/*` | 04 | Create |
| `components/telegram-link-modal.tsx` | 05 | Create |
| `worker.ts` | 06 | Modify |
| `services/telegramBot.ts` | 06 | Modify |
| `test/public-inbox.test.ts` | 06 | Create |
| `test/inbox-telegram.test.ts` | 06 | Create |

## Feature Requirements Summary

### Feature 1: Public Inbox Viewer
- Public page at `/inbox-viewer` (no auth)
- Email search by full address (localPart@domain)
- Paginated message list (20/page, newest first)
- Full email detail view with HTML body (sanitized)
- Attachment download
- Rate limiting: 100 req/min per IP
- **No delete capability** (view only)
- **No CAPTCHA** (rely on rate limiting)

### Feature 2: Telegram Link Token Generator
- Generate token for inbox-Telegram linking (24h expiry)
- QR code + Telegram deep link
- Countdown timer UI
- Poll for success status
- Max 5 links per inbox

### Feature 3: Per-Inbox Telegram Notifications
- Hook into worker.ts email processing
- **Both user-level AND inbox-level notifications fire**
- Send notification to all linked Telegram users for inbox
- **Full format notifications** (OTP extraction, preview, action buttons)
- Notification logs for debugging

## Security Considerations

1. **Rate Limiting** - 100 req/min per IP on public endpoints
2. **HTML Sanitization** - DOMPurify for email body display
3. **No PII Exposure** - Exclude ownerId, sourceIp from responses
4. **Domain Validation** - Only allow access to VERIFIED domains
5. **Token Expiry** - 24h for inbox linking tokens
6. **Max Links** - Limit 5 Telegram accounts per inbox

## Tech Stack

- Backend: Fastify, Prisma, Zod
- Frontend: React, TailwindCSS, react-hot-toast
- QR: `qrcode` npm package
- Telegram: Existing bot service

## Resolved Questions

1. ~~Max Telegram links per inbox?~~ → **5 links**
2. ~~Rate limit storage?~~ → **Existing rateLimit plugin (in-memory)**
3. ~~User-level + inbox-level notifications?~~ → **Yes, both fire**
4. ~~Notification format?~~ → **Full format (same as existing)**
