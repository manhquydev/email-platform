# Phase 5: Public Ephemeral Inbox

**Effort**: 8h | **Priority**: P1 | **Week**: 5-6

## Overview
Zero-friction public landing - instant inbox on visit, no signup required.

## Key Features
- Auto-generate email on page load
- Session persistence via localStorage
- Real-time message updates
- Upgrade prompts for persistence

## Technical Tasks

### 1. Ephemeral Inbox Service (3h)
**File**: `services/api/src/services/ephemeral-inbox.service.ts`
```typescript
interface EphemeralInbox {
  id: string;
  token: string;        // Session identifier
  address: string;      // random@ephemera.email
  expiresAt: DateTime;  // 2 hours default
}

// createEphemeralInbox(): Generate random, assign public domain
// getOrCreateByToken(): Lookup or create
// extendExpiry(): Reset TTL on interaction
```

### 2. Public Inbox Routes (2h)
**File**: `services/api/src/routes/ephemeral-inbox.ts`
```
POST /ephemeral/inbox           # Create new
GET  /ephemeral/inbox/:token    # Get by session
POST /ephemeral/inbox/:token/extend  # Extend expiry
GET  /ephemeral/inbox/:token/messages  # List messages
```

### 3. Landing Page UI (2h)
**File**: `services/web/src/app/(public)/page.tsx`
- Auto-call create endpoint on mount
- Store token in localStorage
- Display email prominently with copy button
- Countdown timer showing expiry
- Real-time inbox via WebSocket
- "Save with Passkey" upgrade prompt

### 4. Cleanup Cron (1h)
**File**: `services/api/src/jobs/cleanup-ephemeral.ts`
- Run every 5 minutes
- Delete expired inboxes + messages
- Log cleanup stats

## Upgrade Triggers
- "Email expires in 10 minutes - Save it!"
- "Create free account to keep emails 30 days"
- After 3rd inbox creation

## Success Criteria
- [ ] Inbox generated < 1 second on page load
- [ ] Messages appear real-time (< 2s latency)
- [ ] Session persists across refreshes
- [ ] Expired inboxes cleaned within 10 minutes
