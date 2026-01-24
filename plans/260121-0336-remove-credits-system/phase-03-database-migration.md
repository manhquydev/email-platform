# Phase 3: Database Migration

**Effort:** 2 hours
**Status:** pending
**Risk:** HIGH (irreversible)

## Objective

Remove credits-related fields and tables from database schema.

## Schema Changes

### 3.1 Update `services/api/prisma/schema.prisma`

**Remove from User model:**
```prisma
// DELETE THIS LINE:
credits Int @default(0)
```

**Remove from User relations:**
```prisma
// DELETE THIS LINE:
creditTransactions CreditTransaction[]
```

**Remove entire CreditTransaction model:**
```prisma
// DELETE ENTIRE MODEL:
model CreditTransaction {
  id          String                @id @default(uuid())
  userId      String
  amount      Int
  description String
  type        CreditTransactionType
  createdAt   DateTime              @default(now())
  metadata    Json?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

**Remove CreditTransactionType enum:**
```prisma
// DELETE ENTIRE ENUM:
enum CreditTransactionType {
  DEPOSIT
  WITHDRAWAL
  USAGE
  REFUND
  ADJUSTMENT
}
```

**Remove from ServicePackage:**
```prisma
// DELETE THIS LINE:
creditAmount Int?
```

### 3.2 Create Migration

```bash
cd services/api
npx prisma migrate dev --name remove_credits_system
```

### 3.3 Expected Migration SQL

```sql
-- Drop CreditTransaction table
DROP TABLE "CreditTransaction";

-- Remove credits column from User
ALTER TABLE "User" DROP COLUMN "credits";

-- Remove creditAmount from ServicePackage
ALTER TABLE "ServicePackage" DROP COLUMN "creditAmount";

-- Drop enum (handled by Prisma)
DROP TYPE "CreditTransactionType";
```

## Todo

- [ ] Update schema.prisma
- [ ] Generate migration locally
- [ ] Test migration on local DB
- [ ] Review generated SQL
- [ ] Commit migration file

## Success Criteria

- Migration runs without errors
- `npx prisma db push` works
- No credits field in User table
- No CreditTransaction table

## Rollback

```sql
-- Restore from backup
INSERT INTO "User" (id, credits)
SELECT id, credits FROM _backup_user_credits
ON CONFLICT (id) DO UPDATE SET credits = EXCLUDED.credits;
```
