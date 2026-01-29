# Implementation Plan: Real-time Email Notifications

## Context
Based on research findings, we will implement WebSocket support using `@fastify/websocket` with Redis Pub/Sub for horizontal scaling.

## 1. Dependencies & Infrastructure
- [ ] Install `@fastify/websocket` in `services/api`.
- [ ] Verify Redis configuration (ensure we can create a dedicated subscriber connection).

## 2. Backend Implementation (`services/api`)

### A. WebSocket Plugin (`src/plugins/websocket.ts`)
- Register `@fastify/websocket`.
- Ensure it handles the upgrade handshake.
- Integrate with existing JWT authentication (`@fastify/jwt`) using `preValidation` hook.

### B. Socket Manager Service (`src/services/socket-manager.ts`)
- **State**: Maintain `Map<UserId, Set<WebSocket>>` for local connections.
- **Redis Subscriber**:
  - Connect to Redis (separate instance from BullMQ to avoid blocking).
  - Subscribe to `events:email`.
  - On message: Parse JSON, lookup `UserId` in local state, send to matching sockets.
- **Heartbeat**: Implement `setInterval` (30s) to ping clients and prune dead connections.

### C. WebSocket Route (`src/routes/websocket.ts`)
- Endpoint: `GET /ws` (or `/api/v1/ws`).
- Handler: Delegate connection registration to `SocketManager`.

### D. Event Publishing
- Modify `services/api/src/worker.ts` (or where email ingestion completes).
- Action: When email is stored/processed, publish event to `events:email`.
  - Payload: `{ "type": "EMAIL_RECEIVED", "userId": "...", "data": { ... } }`

## 3. Frontend Integration (Web Client)
- [ ] Create `useWebSocket` hook or context.
- [ ] Connect to `/ws` with Auth header (or ticket mechanism if headers not supported by client lib, though query param token is common for WS).
- [ ] Handle `EMAIL_RECEIVED` event to trigger React Query invalidation or direct UI update.

## 4. Testing & Verification
- [ ] Unit test `SocketManager` logic.
- [ ] Integration test using a WebSocket client (e.g., `ws` in tests) to verify handshake and message receipt.
- [ ] Load test (optional) to verify Redis Pub/Sub lag.

## 5. Security Checklist
- [ ] Ensure `preValidation` rejects invalid tokens before upgrade.
- [ ] Rate limit the `/ws` endpoint.
- [ ] Validate outgoing JSON payloads.
