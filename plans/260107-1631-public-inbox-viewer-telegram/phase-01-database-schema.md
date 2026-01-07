# Phase 01: Database Schema

## Context

- **Plan:** [plan.md](./plan.md)
- **Research:** [researcher-02-telegram-integration.md](./research/researcher-02-telegram-integration.md)

## Parallelization Info

| Can Parallel With | Depends On | Blocks |
|-------------------|------------|--------|
| None | - | 02, 03, 04, 05, 06 |

**MUST complete before any other phase.**

## Overview

| Priority | Status | Effort |
|----------|--------|--------|
| P1 | ✅ done | 1h |

Add 3 new models for inbox-based Telegram linking and notification logging.

## Key Insights

- Existing `TelegramLinkToken` is user-based; need separate inbox-based token model
- Token prefix `inbox_` distinguishes from user tokens in webhook handler
- Notification log enables debugging failed deliveries

## Requirements

1. `InboxTelegramLink` - Links inbox email to Telegram chatId
2. `InboxTelegramAuthToken` - Token for inbox-Telegram linking (24h expiry)
3. `TelegramNotificationLog` - Logs notification delivery status

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `services/api/prisma/schema.prisma` | Modify | Add 3 new models |
| `services/api/prisma/migrations/*` | Create | Generated migration |

## File Ownership

- **ONLY this phase** modifies `schema.prisma`
- Migration created here, applied before other phases start

## Implementation Steps

### 1. Add InboxTelegramLink model

```prisma
model InboxTelegramLink {
  id               String   @id @default(uuid())
  inboxEmail       String   // "john@domain.com"
  telegramChatId   String
  telegramUsername String?
  createdAt        DateTime @default(now())
  status           String   @default("ACTIVE") // ACTIVE, PAUSED, REVOKED

  @@unique([inboxEmail, telegramChatId])
  @@index([inboxEmail])
  @@index([telegramChatId])
}
```

### 2. Add InboxTelegramAuthToken model

```prisma
model InboxTelegramAuthToken {
  id         String    @id @default(uuid())
  inboxEmail String
  token      String    @unique // "inbox_XXXXXX" format
  expiresAt  DateTime  // 24h from creation
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  @@index([token])
  @@index([inboxEmail])
}
```

### 3. Add TelegramNotificationLog model

```prisma
model TelegramNotificationLog {
  id             String   @id @default(uuid())
  inboxEmail     String
  messageId      String   // References Message.id
  telegramChatId String
  status         String   // SENT, FAILED
  errorMessage   String?
  sentAt         DateTime @default(now())

  @@index([inboxEmail])
  @@index([telegramChatId])
  @@index([messageId])
}
```

### 4. Generate and apply migration

```bash
cd services/api
npx prisma migrate dev --name add-inbox-telegram-models
```

### 5. Verify Prisma client generation

```bash
npx prisma generate
```

## Todo Checklist

- [ ] Add InboxTelegramLink model to schema.prisma
- [ ] Add InboxTelegramAuthToken model to schema.prisma
- [ ] Add TelegramNotificationLog model to schema.prisma
- [ ] Run prisma migrate dev
- [ ] Verify prisma generate succeeds
- [ ] Test models in Prisma Studio

## Success Criteria

1. Migration applies without errors
2. Prisma client generated with new types
3. `InboxTelegramLink`, `InboxTelegramAuthToken`, `TelegramNotificationLog` available
4. Indexes created for query performance

## Conflict Prevention

- No other phase modifies `schema.prisma`
- Other phases wait for this migration before starting

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration conflict with pending changes | Low | Medium | Check git status before running |
| Index naming collision | Low | Low | Prisma auto-generates unique names |

## Security Considerations

- `telegramChatId` stored as string (not exposed publicly)
- `token` field unique-indexed for fast lookup
- No sensitive data in notification logs (only IDs)
