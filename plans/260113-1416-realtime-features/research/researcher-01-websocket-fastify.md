# Research: WebSocket Implementation with Fastify

**Date:** 2026-01-13
**Subject:** Real-time Email Notifications via WebSockets
**Context:** Fastify 5.6, Node.js, Redis, PostgreSQL

## 1. Fastify Integration
Use **`@fastify/websocket`** (v11+ for Fastify v5). It allows handling WebSocket connections on standard routes.

```typescript
import websocket from '@fastify/websocket';

// Register plugin
await fastify.register(websocket);

// Define route
fastify.get('/ws/notifications', { websocket: true }, (connection, req) => {
  connection.socket.on('message', (message) => {
    // Handle incoming messages
  });

  connection.socket.on('close', () => {
    // Cleanup
  });
});
```

## 2. Authentication (JWT)
Perform authentication **before** the upgrade using the `preValidation` hook. This prevents unauthorized connections from establishing a socket.

```typescript
fastify.get('/ws/notifications', {
  websocket: true,
  preValidation: [fastify.authenticate] // Re-use existing JWT decorator
}, (connection, req) => {
  const userId = req.user.id; // access authenticated user
  // ...
});
```

## 3. Scaling (Redis Pub/Sub)
Since the app uses BullMQ (Redis), use **Redis Pub/Sub** to broadcast events across multiple API instances.

**Architecture:**
1. **Publisher:** When an email arrives (SMTP/Worker), publish event to Redis channel `email:events`.
   `redis.publish('email:events', JSON.stringify({ userId: '...', type: 'NEW_EMAIL', data: headerData }))`
2. **Subscriber:** All API instances subscribe to `email:events`.
3. **Dispatch:** On receive, instance checks if `userId` has active local connections. If yes, send frame.

**Local State Management:**
Maintain a map of `UserId -> Set<WebSocket>` in memory on each instance.

```typescript
const connections = new Map<string, Set<WebSocket>>();

// On connect
if (!connections.has(userId)) connections.set(userId, new Set());
connections.get(userId).add(socket);

// On Redis message
sub.on('message', (channel, msg) => {
  const { userId, payload } = JSON.parse(msg);
  const userConns = connections.get(userId);
  if (userConns) {
    userConns.forEach(ws => ws.send(JSON.stringify(payload)));
  }
});
```

## 4. Connection Management & Heartbeat
Prevent stale connections (zombies) using a Ping/Pong heartbeat.

*   **Server:** Run a `setInterval` (e.g., 30s) to ping all active clients. Terminate if no pong received after timeout.
*   **Client:** Should automatically reply to Pings (browser standard behavior) or implement explicit Pong.

## 5. Message Format
Use a standardized JSON envelope.

```json
{
  "event": "EMAIL_RECEIVED",
  "data": {
    "id": "msg_123",
    "subject": "Hello",
    "from": "sender@example.com",
    "snippet": "..."
  },
  "timestamp": "2026-01-13T10:00:00Z"
}
```

## Recommended Packages
*   `@fastify/websocket`: ^11.0.0 (Core functionality)
*   `ioredis`: ^5.3.0 (Already in use, need dedicated instance for Sub)
*   `@fastify/jwt`: (Already in use)

## Security Considerations
1.  **Authentication**: Enforce strict JWT validation on handshake.
2.  **Rate Limiting**: Apply `@fastify/rate-limit` to the `/ws` route to prevent connection flooding.
3.  **Payload Validation**: Validate any incoming messages (though client->server traffic is minimal here) using Zod.
4.  **Origin Check**: Verify `Origin` header if necessary to prevent CSWSH (Cross-Site WebSocket Hijacking), though JWT auth mitigates this impact.

## Performance Tips
*   **Binary vs Text**: JSON (text) is fine for notifications. Use Binary only for high-throughput data.
*   **Compression**: Fastify/ws supports permessage-deflate, but disable it if CPU is a bottleneck and payloads are small.
*   **Redis**: Use a separate Redis connection for the Subscriber (blocking) vs Publisher/General commands.

## Unresolved Questions
*   **Mobile Push**: WebSockets won't work for background mobile apps. Need FCM/APNS integration eventually? (Out of scope for this specific task).
