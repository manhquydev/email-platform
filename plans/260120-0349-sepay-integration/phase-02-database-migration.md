# Phase 02: Database Migration

## Priority: HIGH | Status: PENDING

## Overview
Add SePay-specific fields to Payment model and create PendingPayment table.

## Files to Modify
- `services/api/prisma/schema.prisma`

## Schema Changes

### 1. Update Payment model
```prisma
model Payment {
  id              String   @id @default(uuid())
  userId          String
  amount          Decimal
  currency        String
  status          String   // PENDING, SUCCEEDED, FAILED

  // Stripe fields (optional now)
  stripePaymentId String?  @unique

  // SePay fields (new)
  sepayTransactionId String? @unique
  sepayReferenceCode String?
  paymentMethod      String  @default("STRIPE") // STRIPE, SEPAY

  packageId       String?
  createdAt       DateTime @default(now())
  paidAt          DateTime?

  user User @relation(fields: [userId], references: [id])
}
```

### 2. Create PendingPayment model
```prisma
model PendingPayment {
  id          String   @id @default(uuid())
  userId      String
  packageId   String
  amount      Decimal
  currency    String   @default("VND")
  orderCode   String   @unique  // Unique code for matching: EP_XXXXXX
  status      String   @default("PENDING") // PENDING, COMPLETED, EXPIRED
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  completedAt DateTime?

  user    User           @relation(fields: [userId], references: [id])
  package ServicePackage @relation(fields: [packageId], references: [id])

  @@index([orderCode])
  @@index([userId])
  @@index([status, expiresAt])
}
```

## Migration Steps
1. Update schema.prisma
2. Run `npx prisma migrate dev --name add_sepay_payment_fields`
3. Update Prisma client

## Success Criteria
- [ ] Migration runs without errors
- [ ] Payment model has paymentMethod field
- [ ] PendingPayment table created
