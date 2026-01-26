# Approach B: Full Feature Parity

## Overview

**Effort**: 20-28 hours
**Priority**: P1
**Risk Level**: Medium
**ROI**: High long-term (competitive advantage)

Complete overhaul to match/exceed Boomlify and temp-mail.org. Includes multi-inbox, OTP parsing UI, extended retention, and API tiers for developer monetization.

## Pros & Cons

| Pros | Cons |
|------|------|
| Full competitive parity | Higher development effort |
| Multiple revenue streams | More complex architecture |
| Developer API = B2B revenue | Longer time-to-market (7-10 days) |
| Strong differentiation | Higher testing burden |

---

## Phase 1: Backend - Enhanced Ephemeral System (6-8h)

### Context Links
- [Current Service](../../services/api/src/services/ephemeral-inbox.service.ts)
- [API Routes](../../services/api/src/routes/ephemeral-inbox.ts)
- [Prisma Schema](../../services/api/prisma/schema.prisma)
- [Boomlify Research](./research-boomlify.md)

### Requirements

**Functional**:
- Custom alias with validation (same as Approach A)
- Multi-domain selection with tier gating
- **Multi-inbox support**: Up to 5 simultaneous inboxes per session
- **Extended retention**: 2h free → 24h premium → 14 days pro
- **OTP extraction API**: Return parsed OTP codes prominently

**Non-functional**:
- Session-based inbox grouping
- Efficient batch queries for multi-inbox

### Database Changes

```prisma
// Add to schema.prisma

model EphemeralSession {
  id        String   @id @default(uuid())
  token     String   @unique
  createdAt DateTime @default(now())
  expiresAt DateTime
  tier      String   @default("FREE") // FREE, PREMIUM, PRO

  inboxes   Inbox[]  @relation("SessionInboxes")

  @@index([token])
  @@index([expiresAt])
}

// Modify Inbox model
model Inbox {
  // ... existing fields
  sessionId String?
  session   EphemeralSession? @relation("SessionInboxes", fields: [sessionId], references: [id])
}

// Modify Domain model
model Domain {
  // ... existing fields
  minTier           SubscriptionTier?
  isEphemeralPublic Boolean @default(false) // Separate from isPublic
}
```

### Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `schema.prisma` | Modify | Add EphemeralSession, update Inbox/Domain |
| `ephemeral-inbox.service.ts` | Major Rewrite | Session management, multi-inbox |
| `ephemeral-inbox.ts` routes | Modify | New endpoints for session/multi-inbox |
| `ephemeral-session.service.ts` | Create | Session lifecycle management |
| `otp-extractor.service.ts` | Modify | Expose OTP in API responses |

### New API Endpoints

```typescript
// Session management
POST   /ephemeral/session              // Create session (returns token)
GET    /ephemeral/session/:token       // Get session with all inboxes
DELETE /ephemeral/session/:token       // Delete session + all inboxes

// Multi-inbox within session
POST   /ephemeral/session/:token/inbox        // Add inbox to session
DELETE /ephemeral/session/:token/inbox/:id    // Remove specific inbox

// Enhanced inbox
GET    /ephemeral/inbox/:token/messages       // Include extractedOtp prominently
GET    /ephemeral/domains                      // List with tier info

// Stats (existing, enhanced)
GET    /ephemeral/stats                        // Include session counts
```

### Implementation Steps

1. **Create EphemeralSession model and migration**
2. **Create ephemeral-session.service.ts**
   - `createSession()`: Generate token, set tier-based limits
   - `getSession()`: Return session with populated inboxes
   - `addInbox()`: Validate limit, create inbox linked to session
   - `removeInbox()`: Soft delete inbox from session
3. **Update ephemeral-inbox.service.ts**
   - Refactor to support session-based creation
   - Add tier-based retention calculation
4. **Enhance message response** to prominently include OTP
5. **Update routes** with new endpoints

### Todo List

- [ ] Design EphemeralSession schema
- [ ] Run Prisma migration
- [ ] Create ephemeral-session.service.ts
- [ ] Implement session CRUD operations
- [ ] Add multi-inbox support (limit by tier)
- [ ] Implement tier-based retention (2h/24h/14d)
- [ ] Enhance OTP in message responses
- [ ] Add session-based rate limiting
- [ ] Write unit tests for session service

---

## Phase 2: Frontend - Multi-Inbox Dashboard (6-8h)

### Requirements

**Functional**:
- Dashboard view showing all active inboxes
- Quick-add inbox button
- Unified message preview across inboxes
- OTP display with copy button
- Inbox management (delete, rename alias)

**Non-functional**:
- Real-time updates via polling/SSE
- Mobile-first responsive design
- Keyboard shortcuts for power users

### Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `ephemeral-dashboard.tsx` | Create | Multi-inbox dashboard page |
| `ephemeral-inbox-card.tsx` | Create | Individual inbox card component |
| `ephemeral-message-preview.tsx` | Create | Unified message list |
| `otp-display.tsx` | Create | OTP extraction display |
| `ephemeralService.ts` | Modify | Session API methods |
| `useEphemeralSession.ts` | Create | React hook for session |

### UI Layout (Text Mockup)

```
┌─────────────────────────────────────────────────────────────┐
│ Ephemeral Dashboard                    ⏱ Session: 01:45:23  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ + Thêm Email Mới (3/5)                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐             │
│ │ john@ephemera.email │ │ test@tempbox.io     │ + Add      │
│ │ 📧 3 messages       │ │ 📧 0 messages       │             │
│ │ 🔢 OTP: 847291  📋  │ │ Waiting...          │             │
│ └─────────────────────┘ └─────────────────────┘             │
├─────────────────────────────────────────────────────────────┤
│ All Messages (3)                                   🔄 Live  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📧 GitHub <noreply@github.com>          2 min ago      │ │
│ │    Your verification code is 847291     🔢 Copy OTP    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 📧 Amazon <auto@amazon.com>             5 min ago      │ │
│ │    Order confirmation #123-456                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Steps

1. **Create session management hook**
   ```typescript
   // useEphemeralSession.ts
   export function useEphemeralSession() {
     // Manage session token in localStorage
     // CRUD for inboxes within session
     // Polling for all inbox messages
   }
   ```

2. **Build dashboard page** with inbox cards grid
3. **Create unified message feed** aggregating all inboxes
4. **Implement OTP display component** with prominent styling
5. **Add quick-add inbox flow** (inline form in card)
6. **Implement inbox deletion** with confirmation

### Todo List

- [ ] Create useEphemeralSession hook
- [ ] Build EphemeralDashboard page
- [ ] Create InboxCard component
- [ ] Create UnifiedMessageFeed component
- [ ] Create OTPDisplay component with copy
- [ ] Add quick-add inbox inline form
- [ ] Implement inbox deletion flow
- [ ] Add keyboard shortcuts (Ctrl+N for new)
- [ ] Mobile responsive layout
- [ ] Integrate with hero widget (link to dashboard)

---

## Phase 3: Premium Tiers & Monetization (4-5h)

### Requirements

- **Free tier**: 2 inboxes, 2h retention, public domains only
- **Premium tier** ($3/mo): 5 inboxes, 24h retention, all domains
- **Pro tier** ($10/mo): 10 inboxes, 14d retention, API access, webhooks

### Tier Limits

| Feature | Free | Premium | Pro |
|---------|------|---------|-----|
| Simultaneous Inboxes | 2 | 5 | 10 |
| Retention | 2 hours | 24 hours | 14 days |
| Custom Alias | Yes | Yes | Yes |
| Premium Domains | No | Yes | Yes |
| API Access | No | No | Yes |
| Webhooks | No | No | Yes |
| Daily Inbox Creations | 10 | 50 | Unlimited |

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `schema.prisma` | Modify | Add limits to ServicePackage |
| `ephemeral-session.service.ts` | Modify | Enforce tier limits |
| `pricing-page.tsx` | Modify | Add ephemeral tier cards |
| `upgrade-modal.tsx` | Create | Inline upgrade prompt |

### Implementation Steps

1. **Define tier limits in ServicePackage.limits JSON**
2. **Implement limit checking in session service**
3. **Create upgrade modal for limit hits**
4. **Add ephemeral tiers to pricing page**
5. **Integrate with existing Stripe/SePay payment**

### Todo List

- [ ] Define ephemeral limits in ServicePackage
- [ ] Seed ephemeral tier packages
- [ ] Implement limit enforcement in backend
- [ ] Create UpgradeModal component
- [ ] Add ephemeral section to pricing page
- [ ] Test payment flow for ephemeral upgrade

---

## Phase 4: Developer API (3-4h)

### Requirements

- RESTful API for automated inbox creation
- API key authentication
- Rate limiting by tier
- Webhook support for new emails

### API Endpoints (Authenticated)

```typescript
// API Key required (header: X-API-Key)
POST   /api/v1/ephemeral/inbox          // Create inbox
GET    /api/v1/ephemeral/inbox/:id      // Get inbox + messages
DELETE /api/v1/ephemeral/inbox/:id      // Delete inbox
GET    /api/v1/ephemeral/inbox/:id/messages/:msgId  // Get full message

// Webhook configuration
POST   /api/v1/ephemeral/webhooks       // Register webhook
DELETE /api/v1/ephemeral/webhooks/:id   // Remove webhook
```

### Implementation Steps

1. **Create API key validation middleware for ephemeral routes**
2. **Implement rate limiting by API key tier**
3. **Add webhook registration for ephemeral inboxes**
4. **Create API documentation page**

### Todo List

- [ ] Create ephemeral API middleware
- [ ] Implement API key rate limiting
- [ ] Add webhook support for ephemeral
- [ ] Create API docs page
- [ ] Add code examples (curl, Python, Node)

---

## Phase 5: Polish & QA (3-4h)

### Todo List

- [ ] Comprehensive error handling
- [ ] Loading states and skeletons
- [ ] Empty states design
- [ ] E2E tests for all flows
- [ ] Performance testing (multi-inbox queries)
- [ ] Security audit (session tokens, rate limits)
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Documentation update

---

## Success Criteria

- [ ] Multi-inbox (up to 10) functional
- [ ] Session-based management working
- [ ] Tier-based limits enforced
- [ ] OTP prominently displayed with copy
- [ ] Premium domains gated correctly
- [ ] Extended retention working (24h/14d)
- [ ] Developer API functional with rate limits
- [ ] Webhook notifications working
- [ ] All tiers purchasable via Stripe/SePay
- [ ] Mobile-responsive dashboard
- [ ] Performance: <200ms for dashboard load

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | High | Strict phase boundaries |
| Session token leakage | Medium | High | Secure token generation, HTTPS only |
| Database bloat (14d retention) | Medium | Medium | Scheduled cleanup jobs |
| API abuse | Medium | Medium | Strict rate limits, abuse detection |
| Payment integration issues | Low | High | Reuse existing Stripe/SePay |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Hero Widget  │  │  Dashboard   │  │ Pricing Page │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Fastify)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Ephemeral   │  │   Session    │  │   Webhook    │       │
│  │   Routes     │  │   Routes     │  │   Routes     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Ephemeral   │  │   Session    │  │    OTP       │       │
│  │   Service    │  │   Service    │  │  Extractor   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘       │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database (PostgreSQL)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Inbox   │  │ Session  │  │  Domain  │  │ Message  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Rollout Strategy

1. **Week 1**: Backend (Phases 1, 3)
2. **Week 2**: Frontend (Phase 2), API (Phase 4)
3. **Week 3**: QA, Beta (10% users)
4. **Week 4**: Full rollout, monitoring
