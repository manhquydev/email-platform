---
title: "Support Ticket System Implementation"
description: "Full-featured ticket system for user support with admin management"
status: pending
priority: P2
effort: 12h
branch: main
tags: [support, tickets, admin, notifications]
created: 2026-01-22
---

# Support Ticket System - Implementation Plan

## Context Links
- [Backend Research](./research-backend-patterns.md)
- [Frontend Research](./research-frontend-patterns.md)
- [Scout Report](./scout-report.md)

## Overview
Transform the static `/support` page into a functional ticket system with:
- User ticket submission & history
- Admin ticket management dashboard
- Email notifications on updates
- Real-time status tracking

---

## Approach Comparison

### Approach A: Minimal Database + Email-Centric
**Philosophy**: Store tickets in DB, but handle replies primarily via email.

| Aspect | Details |
|--------|---------|
| **Database** | Simple `SupportTicket` only (no TicketMessage) |
| **User Flow** | Submit form → Email notification → Reply via email |
| **Admin Flow** | View tickets in admin panel → Reply via email client |
| **Tracking** | Basic status updates (OPEN/CLOSED) |

**Pros:**
- ✅ Faster implementation (~4-6h)
- ✅ Less database complexity
- ✅ Familiar email workflow for admins
- ✅ Works with existing email infrastructure

**Cons:**
- ❌ No in-app conversation history
- ❌ Email threading can break
- ❌ Less professional user experience
- ❌ Hard to track SLA/metrics

---

### Approach B: Full In-App Ticket System ⭐ RECOMMENDED
**Philosophy**: Complete ticket + message system with in-app chat interface.

| Aspect | Details |
|--------|---------|
| **Database** | `SupportTicket` + `TicketMessage` models |
| **User Flow** | Submit → View history → Reply in-app → Get notifications |
| **Admin Flow** | Dashboard → Assign/prioritize → Reply → Close |
| **Tracking** | Full conversation history, metrics, SLA |

**Pros:**
- ✅ Professional customer support experience
- ✅ Complete conversation history
- ✅ Metrics & reporting capabilities
- ✅ Scalable for team support
- ✅ Matches existing admin panel patterns

**Cons:**
- ❌ More development effort (~10-12h)
- ❌ More database migrations
- ❌ UI complexity

---

## Recommendation: Approach B

**Rationale:**
1. **Consistency**: Matches existing admin patterns (AdminReports, etc.)
2. **User Experience**: Professional support = higher user trust
3. **Metrics**: Can track response times, resolution rates
4. **Future-proof**: Easy to add features (assignments, tags, SLA)

---

## Implementation Phases (Approach B)

### Phase 1: Database Schema (1.5h)
**Files to modify:**
- `services/api/prisma/schema.prisma`

**Tasks:**
- [ ] Add `SupportTicket` model with status/priority enums
- [ ] Add `TicketMessage` model with isInternal flag
- [ ] Update `User` model relations
- [ ] Run migration

### Phase 2: Backend API (3h)
**Files to create:**
- `services/api/src/routes/support.ts`
- `services/api/src/services/supportService.ts`

**Files to modify:**
- `services/api/src/routes/index.ts` (register routes)
- `services/api/src/services/emailTemplates.ts` (notification templates)

**Endpoints:**
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/support/tickets` | User | Create ticket |
| GET | `/support/tickets` | User | List user's tickets |
| GET | `/support/tickets/:id` | User | Get ticket + messages |
| POST | `/support/tickets/:id/messages` | User | Reply to ticket |
| GET | `/admin/support/tickets` | Admin | List all tickets |
| PATCH | `/admin/support/tickets/:id` | Admin | Update status/priority |
| POST | `/admin/support/tickets/:id/messages` | Admin | Admin reply |

### Phase 3: User Frontend (3h)
**Files to create:**
- `services/web/src/pages/support-modules/` (modular structure)
  - `support-ticket-list.tsx`
  - `support-ticket-detail.tsx`
  - `support-create-form.tsx`
  - `use-support-data.ts`
  - `types.ts`
- `services/web/src/services/supportService.ts`

**Files to modify:**
- `services/web/src/pages/Support.tsx` (integrate new components)
- `services/web/src/App.tsx` (add routes)
- `services/web/src/i18n/locales/en.json` & `vi.json`

### Phase 4: Admin Frontend (3h)
**Files to create:**
- `services/web/src/pages/admin/admin-support-modules/`
  - `admin-support-page.tsx`
  - `admin-support-detail.tsx`
  - `admin-support-components.tsx`
  - `use-admin-support-data.ts`

**Files to modify:**
- `services/web/src/components/admin-panel-modules/admin-nav-items.ts`
- `services/web/src/pages/Admin.tsx` (add route)

### Phase 5: Notifications & Polish (1.5h)
**Tasks:**
- [ ] Email notifications on ticket creation
- [ ] Email notifications on admin reply
- [ ] In-app notification integration
- [ ] Loading states & error handling
- [ ] Mobile responsiveness

---

## Database Schema (Final)

```prisma
enum TicketStatus {
  OPEN
  WAITING_USER
  WAITING_SUPPORT
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum TicketCategory {
  TECHNICAL
  BILLING
  ABUSE
  OTHER
}

model SupportTicket {
  id          String         @id @default(uuid())
  userId      String
  subject     String
  category    TicketCategory
  status      TicketStatus   @default(OPEN)
  priority    TicketPriority @default(NORMAL)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  closedAt    DateTime?

  user        User           @relation(fields: [userId], references: [id])
  messages    TicketMessage[]

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model TicketMessage {
  id         String   @id @default(uuid())
  ticketId   String
  userId     String
  content    String   @db.Text
  isInternal Boolean  @default(false)
  createdAt  DateTime @default(now())

  ticket     SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user       User          @relation(fields: [userId], references: [id])

  @@index([ticketId])
}
```

---

## Success Criteria
- [ ] Users can create tickets from /support page
- [ ] Users can view their ticket history
- [ ] Users can reply to open tickets
- [ ] Admins can view all tickets in /admin/support
- [ ] Admins can change status/priority
- [ ] Admins can reply (visible to user)
- [ ] Email notifications sent on key events
- [ ] Mobile-responsive UI

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| DB migration conflicts | Run on fresh branch, test locally first |
| Email deliverability | Use existing outbound service patterns |
| UI inconsistency | Follow GlassCard + existing admin patterns |
| Performance with many tickets | Add pagination + indexes |

---

## Unresolved Questions

1. **File attachments**: Support screenshot uploads? (Recommend: Phase 2 feature)
2. **Email-to-ticket**: Parse inbound emails as replies? (Recommend: Future feature)
3. **Assignment**: Assign tickets to specific admins? (Recommend: Not for MVP)
4. **SLA alerts**: Auto-escalate old tickets? (Recommend: Future feature)
5. **Anonymous tickets**: Allow non-logged-in users? (Recommend: No, require login)

---

## Next Steps
1. Review this plan
2. Create feature branch: `feature/support-ticket-system`
3. Start Phase 1: Database Schema
