# Phase 1: Anonymous Identity Layer

**Effort**: 8h | **Priority**: P0 | **Week**: 1-2

## Overview
Implement Mullvad-style anonymous accounts - Passkey-only signup with zero PII collection.

## Key Features
- Passkey-only registration (no email/username required)
- Random 16-digit account ID (format: `1234-5678-90ab-cdef`)
- Instant session creation on first visit
- Account recovery via same Passkey device

## Technical Tasks

### 1. Complete Passkey Registration Flow (3h)
**File**: `services/api/src/routes/passkey-auth.ts`
- Leverage existing `PasskeyCredential` model
- Remove email requirement from registration
- Generate random accountCode on success
- Return session token

### 2. Anonymous Account Model (1h)
**File**: `services/api/prisma/schema.prisma`
```prisma
model AnonymousAccount {
  id          String   @id @default(uuid())
  accountCode String   @unique // "1234-5678-90ab-cdef"
  passkeyId   String?  @unique
  passkey     PasskeyCredential? @relation(...)
  inboxes     Inbox[]
  tier        String   @default("FREE")
  createdAt   DateTime @default(now())
}
```

### 3. Session Service (2h)
**File**: `services/api/src/services/anonymous-session.service.ts`
- Create session from Passkey credential
- No PII stored - only credential reference
- Session persistence via JWT

### 4. Frontend Registration UI (2h)
**File**: `services/web/src/app/(auth)/register/page.tsx`
- "Create Anonymous Account" button
- Passkey prompt modal
- Display generated account code
- "Save this code" reminder

## Success Criteria
- [ ] User can signup with ONLY Passkey (no email)
- [ ] Account code displayed after registration
- [ ] Same Passkey can recover account
- [ ] Zero PII in database

## Dependencies
- WebAuthn library (already installed)
- PasskeyCredential model (exists)
