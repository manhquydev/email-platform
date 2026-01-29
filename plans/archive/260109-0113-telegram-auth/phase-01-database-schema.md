# Phase 01: Database Schema Changes

**Parent**: [plan.md](./plan.md)
**Dependencies**: None
**Status**: pending
**Priority**: P1
**Effort**: 1h

## Overview

Add schema support for Telegram authentication. Extends existing User model with Telegram identity fields.

## Current State Analysis

User model already has:
- `telegramChatId` - for notifications (different from auth)
- `telegramLinkedAt` - timestamp
- `TelegramLinkToken` - for linking flow

**Key insight**: `telegramChatId` is for bot messaging. Telegram Login Widget returns `telegramId` (user ID), which is different. We need both.

## Schema Changes

### Option A: Extend User Model (Recommended)

```prisma
model User {
  // ... existing fields ...

  // Telegram Auth (Login Widget)
  telegramId        String?   @unique  // Telegram user ID (numeric string)
  telegramUsername  String?            // @username for display
  telegramFirstName String?            // First name from Telegram
  telegramPhotoUrl  String?            // Profile photo URL
  telegramAuthDate  DateTime?          // Last auth timestamp from widget

  // Existing notification fields (keep separate)
  telegramChatId    String?   @unique  // For bot messaging
  telegramLinkedAt  DateTime?          // When bot was linked
}
```

### Why Extend vs Separate Model

| Approach | Pros | Cons |
|----------|------|------|
| Extend User | Simple queries, no joins | Slightly larger User table |
| Separate TelegramAuth model | Clean separation | Extra join on every auth check |

**Decision**: Extend User model. Auth lookup must be fast; extra fields are nullable and indexed.

## Migration Steps

1. Create migration file:
```bash
npx prisma migrate dev --name add_telegram_auth_fields
```

2. Migration SQL (auto-generated):
```sql
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramFirstName" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramPhotoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramAuthDate" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
```

## Implementation Steps

1. [ ] Update `services/api/prisma/schema.prisma` - add 5 new fields to User model
2. [ ] Run `npx prisma migrate dev --name add_telegram_auth_fields`
3. [ ] Run `npx prisma generate` to update client
4. [ ] Verify migration applied: `npx prisma db pull` and compare

## Related Files

- `services/api/prisma/schema.prisma`
- `services/api/prisma/migrations/`

## Success Criteria

- [ ] Migration runs without errors
- [ ] `telegramId` has unique constraint
- [ ] Existing `telegramChatId` data preserved
- [ ] Prisma client regenerated with new types

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration conflicts | Low | Medium | Run on fresh DB first |
| Null handling in queries | Medium | Low | Use Prisma's null-safe operators |
