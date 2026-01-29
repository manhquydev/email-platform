# Phase 1: Database Schema & API Enhancements

## Context Links
- [Parent Plan](./plan.md)
- [Telegram Research](./research/researcher-01-telegram-bot-api.md)
- [Current Schema](../../services/api/prisma/schema.prisma)
- [Current API](../../services/api/src/routes/notifications.ts)

## Overview
- **Priority:** P1 (Foundation for all other phases)
- **Status:** pending
- **Effort:** 6h
- **Description:** Add database models for templates, delivery logs, and scheduled notifications. Create corresponding API endpoints.

## Key Insights
- Current `Notification` model lacks delivery tracking
- No template or scheduling infrastructure exists
- Need status tracking for Telegram delivery (sent/failed/acknowledged)

## Requirements

### Functional
- NotificationTemplate model with variables support
- NotificationLog model for delivery tracking per channel
- ScheduledNotification model with cron-like scheduling
- CRUD endpoints for templates
- Query endpoints for logs with filtering

### Non-Functional
- Indexes for efficient log queries
- Soft delete for templates
- JSON schema for template variables

## Architecture

```
NotificationTemplate ──┬──> Notification
                       └──> ScheduledNotification
                                    │
Notification ───────────────> NotificationLog (per channel)
```

## Related Code Files

### Modify
- `services/api/prisma/schema.prisma` - Add new models
- `services/api/src/routes/notifications.ts` - Add admin endpoints

### Create
- `services/api/src/routes/admin/notification-templates.ts`
- `services/api/src/routes/admin/notification-logs.ts`
- `services/api/src/services/notification-template-service.ts`

## Implementation Steps

### 1. Database Schema (schema.prisma)

```prisma
model NotificationTemplate {
  id          String   @id @default(uuid())
  name        String   @unique
  title       String
  message     String   @db.Text
  type        NotificationType @default(INFO)
  variables   Json?    // [{name: "username", required: true}]
  imageUrl    String?
  isArchived  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  notifications Notification[]
  scheduledNotifications ScheduledNotification[]

  @@index([isArchived])
}

model NotificationLog {
  id             String   @id @default(uuid())
  notificationId String
  channel        NotificationChannel
  status         DeliveryStatus
  errorMessage   String?
  metadata       Json?    // Telegram message_id, etc.
  sentAt         DateTime @default(now())
  acknowledgedAt DateTime?

  notification Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@index([notificationId])
  @@index([channel, status])
  @@index([sentAt])
}

model ScheduledNotification {
  id          String   @id @default(uuid())
  templateId  String?
  title       String
  message     String   @db.Text
  type        NotificationType @default(INFO)
  imageUrl    String?
  targetMode  TargetMode
  targetUserId String?
  scheduledFor DateTime
  status      ScheduleStatus @default(PENDING)
  executedAt  DateTime?
  createdBy   String
  createdAt   DateTime @default(now())

  template NotificationTemplate? @relation(fields: [templateId], references: [id])

  @@index([status, scheduledFor])
  @@index([createdBy])
}

enum NotificationChannel {
  WEB
  TELEGRAM
  PUSH
}

enum DeliveryStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  ACKNOWLEDGED
}

enum ScheduleStatus {
  PENDING
  EXECUTED
  CANCELLED
  FAILED
}

enum TargetMode {
  SPECIFIC
  ALL
  SEGMENT
}
```

### 2. Update Notification Model
Add relation to logs and optional templateId:
```prisma
model Notification {
  // ... existing fields
  templateId String?
  template   NotificationTemplate? @relation(fields: [templateId], references: [id])
  logs       NotificationLog[]
}
```

### 3. Create Template Routes

```typescript
// POST /admin/notifications/templates - Create template
// GET /admin/notifications/templates - List templates
// GET /admin/notifications/templates/:id - Get template
// PUT /admin/notifications/templates/:id - Update template
// DELETE /admin/notifications/templates/:id - Archive template
// POST /admin/notifications/templates/:id/clone - Clone template
```

### 4. Create Log Routes

```typescript
// GET /admin/notifications/logs - List with filters
// GET /admin/notifications/logs/:notificationId - Get delivery details
// POST /admin/notifications/:id/resend - Resend failed notification
```

### 5. Run Migration
```bash
cd services/api && npx prisma migrate dev --name add_notification_templates_logs
```

## Todo List
- [ ] Add NotificationTemplate model to schema
- [ ] Add NotificationLog model to schema
- [ ] Add ScheduledNotification model to schema
- [ ] Add enums (NotificationChannel, DeliveryStatus, etc.)
- [ ] Update Notification model with relations
- [ ] Create migration and apply
- [ ] Create notification-templates.ts routes
- [ ] Create notification-logs.ts routes
- [ ] Create notification-template-service.ts
- [ ] Update existing send endpoint to create logs
- [ ] Add Zod schemas for validation
- [ ] Test all endpoints

## Success Criteria
- [ ] All models created with proper indexes
- [ ] Migration runs without errors
- [ ] Templates CRUD working via API
- [ ] Logs created when notifications sent
- [ ] Delivery status tracked per channel

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Migration conflicts | Run on clean branch, backup DB |
| Breaking existing notifications | Keep backward compatible |

## Security Considerations
- All endpoints require ADMIN role
- Template variables sanitized before rendering
- Logs may contain PII - apply retention policy

## Next Steps
- Phase 2 depends on logs API for history UI
- Phase 3 depends on templates API
