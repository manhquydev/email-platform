# Prompt Template: Database Migration

## Usage
Use when adding new tables, modifying schema, or creating migrations.

---

## Template

```
# Migration: [Short Description]

## Purpose
[Why this migration is needed]

## Schema Changes

### New Models
```prisma
model NewModel {
  id        String   @id @default(uuid())
  // ... fields
  createdAt DateTime @default(now())

  @@index([...])
}
```

### Modified Models
```prisma
// Changes to existing model
model ExistingModel {
  // + newField  String?  // Added
  // - oldField           // Removed
}
```

### Enums
```prisma
enum NewStatus {
  PENDING
  ACTIVE
  COMPLETED
}
```

## Data Migration
[If data needs to be migrated, describe the strategy]
- [ ] Backfill required?
- [ ] Safe to run on live DB?
- [ ] Rollback strategy?

## Constraints
- Must not lock tables for extended periods
- Backward compatible (old code still works)
- Nullable for new required fields (temporary)

## Execution Plan
1. Add migration with prisma migrate dev
2. Deploy API with new schema
3. Run data backfill script (if needed)
4. Make field non-nullable (follow-up migration)
```

---

## Example Usage

```
# Migration: Add Outbound Message Tracking

## Purpose
Track sent emails for delivery status monitoring and bounce handling.

## Schema Changes

### New Models
```prisma
model OutboundMessage {
  id              String           @id @default(uuid())
  userId          String
  domainId        String
  fromAddress     String
  toAddress       String
  subject         String?
  messageId       String           @unique
  status          OutboundStatus   @default(QUEUED)
  attempts        Int              @default(0)
  sentAt          DateTime?
  bounceType      BounceType?
  createdAt       DateTime         @default(now())

  user            User             @relation(fields: [userId], references: [id])
  domain          Domain           @relation(fields: [domainId], references: [id])

  @@index([userId])
  @@index([status])
}
```

### Enums
```prisma
enum OutboundStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  BOUNCED
  FAILED
}

enum BounceType {
  HARD
  SOFT
  COMPLAINT
}
```

### Modified Models
```prisma
model Domain {
  // + outboundMsgs OutboundMessage[]
}

model User {
  // + outboundMsgs OutboundMessage[]
}
```

## Data Migration
- [ ] Backfill required? NO (new table)
- [x] Safe to run on live DB? YES
- [x] Rollback: DROP TABLE OutboundMessage

## Execution Plan
1. npx prisma migrate dev --name add-outbound-tracking
2. Deploy updated API
3. No backfill needed
```
