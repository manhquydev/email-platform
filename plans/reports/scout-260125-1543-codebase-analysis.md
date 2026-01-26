# Scout Report: Ephemera Codebase Analysis for Extension Points
**Date:** 2026-01-25
**Scope:** Public Inbox, Ephemeral Storage, Realtime, Payments, Rate Limiting

## Executive Summary
The codebase is a modern TypeScript monorepo (Fastify backend, React frontend). 
- **Public Inboxes**: Partially implemented (viewing verified inboxes), but "ephemeral/anonymous creation" is missing.
- **Realtime**: robustly implemented via WebSocket/PubSub.
- **Rate Limiting**: Tier-based limiting is already structured.
- **Payments**: Basic subscription routes exist (`sepay`, `subscription`).

## 1. Public Anonymous Inbox & Ephemeral Storage
**Goal:** Allow users to create instant temporary inboxes without auth.

**Critical Files:**
- `services/api/src/routes/public-inbox.ts`: Currently handles *viewing* public inboxes.
  - **Action**: Add `POST /public/inbox/create` to generate ephemeral addresses.
- `services/api/src/utils/session.ts`: Handles session IDs.
  - **Action**: Bind ephemeral inboxes to these session IDs instead of User IDs.
- `services/api/src/services/cleanup.ts` (or similar):
  - **Action**: Ensure a cron job cleans up ephemeral inboxes/messages after X hours (Session-based TTL).

**Database Impact (Prisma):**
- Need to verify `Inbox` model supports a "type" (`EPHEMERAL` vs `PERMANENT`) and `expiresAt` field.

## 2. Real-time Updates (WebSocket/SSE)
**Goal:** Live updates for new emails.

**Critical Files:**
- `services/api/src/services/realtime-events.ts`: Central event bus.
  - **Status**: **Good**. Already supports `email.new`, `inbox.created`.
  - **Action**: Ensure ephemeral inboxes trigger these events to the correct anonymous session socket.
- `services/api/src/routes/realtime-ws.ts`: WebSocket route handler.
- `services/web/src/hooks/use-realtime.ts`: Frontend hook (inferred).

## 3. Subscription & Payment Integration
**Goal:** Paid tiers for persistent inboxes/custom domains.

**Critical Files:**
- `services/api/src/routes/subscription.ts`: Subscription management endpoints.
- `services/api/src/routes/sepay.ts`: Payment gateway webhooks.
- `services/api/src/services/tier-limits.service.ts`: Defines limits per tier.
  - **Status**: **Good**. Defines `TierLimits` interface and fetch logic.

## 4. API Rate Limiting per Tier
**Goal:** Enforce usage limits based on subscription.

**Critical Files:**
- `services/api/src/middleware/rate-limit-config.ts`: Core configuration.
  - **Status**: **Excellent**. Already has `TIER_RATE_LIMITS` dictionary (Free: 100, Enterprise: 10000) and `getTierBasedMax` helper.
- `services/api/src/server.ts`: Registers the rate limit plugin.
  - **Action**: Verify `userKeyGenerator` correctly handles API keys vs. Session IDs for accurate counting.

## Summary of Work Required
1.  **Backend**: Extend `public-inbox.ts` for creation; update Prisma schema for ephemeral support.
2.  **Frontend**: Create "Landing/Instant Inbox" view in `services/web/src/pages`.
3.  **Infra**: Verify Redis is active for rate limiting (fallback to memory is present but risky for prod).

## Unresolved Questions
1.  **Prisma Schema Access**: Could not read `prisma/schema.prisma` directly. Need to confirm `Inbox` model structure manually.
2.  **Ephemeral TTL Strategy**: Is it purely DB-based (cron cleanup) or Redis-based? (Recommendation: DB `expiresAt` + Cron).
