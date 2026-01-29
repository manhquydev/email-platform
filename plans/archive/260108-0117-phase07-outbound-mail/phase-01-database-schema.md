# Phase 01: Database Schema

**Status:** completed
**Effort:** 2h
**Dependencies:** None
**Owner:** Database/Backend

## Objective

Add Prisma models for outbound mail tracking, DKIM key storage, and bounce suppression.

## New Models

### 1. DomainDkim

Stores DKIM keypair per domain.

```prisma
model DomainDkim {
  id           String   @id @default(uuid())
  domainId     String   @unique
  selector     String   // e.g., "ephemera2026"
  privateKey   String   // Encrypted PEM (AES-256-GCM)
  publicKey    String   // For DNS TXT record display
  algorithm    String   @default("rsa-sha256")
  keySize      Int      @default(2048)
  createdAt    DateTime @default(now())
  rotatedAt    DateTime?

  domain       Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@index([domainId])
}
```

### 2. OutboundMessage

Tracks all outbound emails with delivery status.

```prisma
model OutboundMessage {
  id              String           @id @default(uuid())
  userId          String
  domainId        String
  inboxId         String?          // Optional: if sent from specific inbox
  fromAddress     String
  toAddress       String
  subject         String?
  messageId       String           @unique  // RFC 5322 Message-ID
  status          OutboundStatus   @default(QUEUED)
  attempts        Int              @default(0)
  lastAttemptAt   DateTime?
  sentAt          DateTime?
  deliveredAt     DateTime?
  bouncedAt       DateTime?
  bounceType      BounceType?
  bounceSubType   String?          // ESP-specific code
  bounceMessage   String?
  complaintType   String?          // "abuse", "fraud", etc.
  espMessageId    String?          // Provider's message ID
  espProvider     String?          // "ses", "mailgun", "smtp"
  metadata        Json?
  createdAt       DateTime         @default(now())

  user            User             @relation(fields: [userId], references: [id])
  domain          Domain           @relation(fields: [domainId], references: [id])

  @@index([userId])
  @@index([domainId])
  @@index([status])
  @@index([espMessageId])
  @@index([toAddress])
  @@index([createdAt])
}
```

### 3. BounceSuppressionList

Prevents sending to invalid/complaining addresses.

```prisma
model BounceSuppressionList {
  id           String   @id @default(uuid())
  email        String   @unique
  reason       String   // "hard_bounce", "complaint", "manual"
  sourceId     String?  // OutboundMessage.id that caused suppression
  createdAt    DateTime @default(now())
  expiresAt    DateTime? // Soft bounces can expire (e.g., 7 days)

  @@index([email])
  @@index([expiresAt])
}
```

### 4. Enums

```prisma
enum OutboundStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  BOUNCED
  COMPLAINED
  FAILED
}

enum BounceType {
  HARD      // Permanent - email doesn't exist
  SOFT      // Temporary - mailbox full, server down
  COMPLAINT // Spam complaint
}
```

## Schema Modifications

### Domain Model Extension

```prisma
model Domain {
  // ... existing fields
  dkim          DomainDkim?
  outboundMsgs  OutboundMessage[]
}
```

### User Model Extension

```prisma
model User {
  // ... existing fields
  outboundMsgs  OutboundMessage[]
}
```

## Migration Steps

1. Add models to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_outbound_models`
3. Verify migration generated correctly
4. Run `npx prisma generate`

## Acceptance Criteria

- [x] All three models added to schema.prisma
- [x] Relations to Domain and User established
- [x] Migration runs without errors
- [x] Prisma client regenerated with new types
- [x] Indexes created for query optimization

## Files Changed

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify - add 3 models, 2 enums, extend Domain/User |
| `prisma/migrations/*_add_outbound_models` | Create |

## Notes

- `privateKey` field stores AES-256-GCM encrypted data, not raw PEM
- `messageId` must be unique to enable webhook correlation
- `espMessageId` indexed for fast webhook lookups
- `expiresAt` on suppression allows soft bounce recovery
