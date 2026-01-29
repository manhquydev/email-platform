# Phase 02: WebSocket Implementation

## Context

- **Plan**: [plan.md](./plan.md)
- **Previous**: [Phase 01 - Backend Infrastructure](./phase-01-backend-infrastructure.md)
- **Next**: [Phase 03 - SSE Fallback](./phase-03-sse-fallback.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 |
| Status | pending |
| Effort | 4h |
| Description | Implement WebSocket route with JWT auth and integrate with worker for event publishing |

## Requirements

1. Register `@fastify/websocket` plugin (already installed)
2. Create `/ws/events` route with JWT authentication in `preValidation`
3. Integrate ConnectionManager with WebSocket connections
4. Modify worker.ts to publish `email.new` events after message storage
5. Handle connection lifecycle (open, close, error, ping/pong)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client                                  │
│  const ws = new WebSocket('wss://api.example.com/ws/events')   │
│  ws.onopen = () => ws.send(JSON.stringify({token: 'jwt...'}))  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /ws/events Route                             │
├─────────────────────────────────────────────────────────────────┤
│  1. preValidation: Extract token from query or first message    │
│  2. Verify JWT using app.jwt.verify()                          │
│  3. Add connection to ConnectionManager                         │
│  4. Listen for Redis events, forward to client                  │
│  5. Handle ping/pong for keepalive                             │
└─────────────────────────────────────────────────────────────────┘
```

## Related Files

| File | Action |
|------|--------|
| `services/api/src/server.ts` | Register websocket plugin |
| `services/api/src/routes/realtime-ws.ts` | **CREATE** - WebSocket route |
| `services/api/src/worker.ts` | **MODIFY** - Publish email.new events |
| `services/api/src/services/connection-manager.ts` | Use for WebSocket tracking |

## Implementation Steps

### Step 1: Register WebSocket Plugin

**File**: `services/api/src/server.ts`

Add after other plugin registrations (~line 99):

```typescript
import websocket from '@fastify/websocket';

// In buildServer(), after other app.register calls:
app.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB max message size
    clientTracking: false, // We handle tracking ourselves
  },
});
```

### Step 2: Create WebSocket Route

**File**: `services/api/src/routes/realtime-ws.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';
import { connectionManager } from '../services/connection-manager';

interface JWTPayload {
  userId: string;
  role: string;
  tier: string;
  iat: number;
  exp: number;
}

const realtimeWsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ws/events', { websocket: true }, (socket: WebSocket, request) => {
    let userId: string | null = null;
    let authenticated = false;

    // Auth timeout - disconnect if not authenticated within 10s
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        socket.close(4001, 'Authentication timeout');
      }
    }, 10000);

    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle authentication message
        if (message.type === 'auth' && message.token) {
          try {
            const decoded = app.jwt.verify<JWTPayload>(message.token);
            userId = decoded.userId;
            authenticated = true;
            clearTimeout(authTimeout);

            // Add to connection manager
            connectionManager.add(userId, {
              type: 'ws',
              socket,
              userId,
              createdAt: Date.now(),
            });

            // Send auth success
            socket.send(JSON.stringify({
              type: 'auth.success',
              userId,
              timestamp: Date.now(),
            }));

            request.log.info({ userId }, 'WebSocket authenticated');
          } catch (err) {
            socket.send(JSON.stringify({
              type: 'auth.error',
              message: 'Invalid token',
            }));
            socket.close(4002, 'Invalid token');
          }
        }

        // Handle ping from client
        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (err) {
        request.log.warn({ err }, 'Failed to parse WebSocket message');
      }
    });

    socket.on('close', (code, reason) => {
      clearTimeout(authTimeout);
      if (userId) {
        connectionManager.remove(userId, {
          type: 'ws',
          socket,
          userId,
          createdAt: 0,
        });
        request.log.info({ userId, code, reason: reason.toString() }, 'WebSocket closed');
      }
    });

    socket.on('error', (err) => {
      request.log.error({ err, userId }, 'WebSocket error');
      if (userId) {
        connectionManager.remove(userId, {
          type: 'ws',
          socket,
          userId,
          createdAt: 0,
        });
      }
    });

    // Handle pong responses (from our server-side pings)
    socket.on('pong', () => {
      // Connection is alive, nothing to do
    });
  });
};

export default realtimeWsRoutes;
```

### Step 3: Register Route in Server

**File**: `services/api/src/server.ts`

Add import and registration:

```typescript
import realtimeWsRoutes from './routes/realtime-ws';

// In buildServer(), after other route registrations:
app.register(realtimeWsRoutes);
```

### Step 4: Modify Worker to Publish Events

**File**: `services/api/src/worker.ts`

Add import at top:

```typescript
import { realtimeEvents } from './services/realtime-events';
```

Add after message storage (after line ~346, after `logger.info({ inboxId: inbox.id, messageId: message.id...`):

```typescript
// Publish realtime event for new email
try {
    if (messageWithRelations?.inbox?.ownerId) {
        await realtimeEvents.publishEmailNew(
            messageWithRelations.inbox.ownerId,
            {
                inboxId: inbox.id,
                messageId: message.id,
                from: fromAddress ?? null,
                subject: message.subject ?? null,
                receivedAt: message.receivedAt.toISOString(),
            }
        );
        logger.info({ messageId: message.id }, 'published realtime email.new event');
    }
} catch (realtimeErr) {
    logger.warn({ err: realtimeErr }, 'failed to publish realtime event');
}
```

### Step 5: Update ConnectionManager for Proper Comparison

**File**: `services/api/src/services/connection-manager.ts`

Update the `remove` method to use socket reference:

```typescript
remove(userId: string, connection: Connection): void {
  const userConns = this.connections.get(userId);
  if (userConns) {
    // Find and remove by socket/reply reference
    for (const conn of userConns) {
      if (conn.type === 'ws' && connection.type === 'ws') {
        if (conn.socket === connection.socket) {
          userConns.delete(conn);
          break;
        }
      } else if (conn.type === 'sse' && connection.type === 'sse') {
        if (conn.reply === connection.reply) {
          userConns.delete(conn);
          break;
        }
      }
    }
    if (userConns.size === 0) {
      this.connections.delete(userId);
    }
  }
  console.log(`[ConnectionManager] User ${userId} disconnected. Total: ${this.getConnectionCount()}`);
}
```

### Step 6: Add Health Check for WebSocket Connections

**File**: `services/api/src/routes/health.ts`

Add realtime stats to health endpoint:

```typescript
import { connectionManager } from '../services/connection-manager';

// In the health route handler, add to response:
realtimeConnections: connectionManager.getConnectionCount(),
```

## WebSocket Protocol

### Client to Server Messages

```typescript
// Authentication (required first message)
{ type: 'auth', token: 'jwt-token-here' }

// Keepalive ping
{ type: 'ping' }
```

### Server to Client Messages

```typescript
// Auth success
{ type: 'auth.success', userId: 'user-id', timestamp: 1234567890 }

// Auth error
{ type: 'auth.error', message: 'Invalid token' }

// Pong response
{ type: 'pong', timestamp: 1234567890 }

// Email events (from RealtimeEvent types)
{
  type: 'email.new',
  timestamp: 1234567890,
  userId: 'user-id',
  payload: {
    inboxId: 'inbox-id',
    messageId: 'msg-id',
    from: 'sender@example.com',
    subject: 'Email subject',
    receivedAt: '2026-01-13T12:00:00Z'
  }
}
```

### Close Codes

| Code | Meaning |
|------|---------|
| 1000 | Normal closure |
| 1001 | Server shutting down |
| 4001 | Authentication timeout |
| 4002 | Invalid token |
| 4003 | Rate limited |

## Todo List

- [ ] Register `@fastify/websocket` plugin in server.ts
- [ ] Create `routes/realtime-ws.ts` with WebSocket handler
- [ ] Implement JWT authentication via first message
- [ ] Add authentication timeout (10s)
- [ ] Integrate with ConnectionManager
- [ ] Modify worker.ts to publish email.new events
- [ ] Add ping/pong handling for keepalive
- [ ] Add WebSocket connection count to health endpoint
- [ ] Test with wscat or browser DevTools
- [ ] Handle reconnection scenarios

## Success Criteria

- [ ] WebSocket connects successfully at `/ws/events`
- [ ] JWT auth works via first message
- [ ] Unauthenticated connections timeout after 10s
- [ ] Invalid tokens result in close code 4002
- [ ] ConnectionManager tracks connections correctly
- [ ] New emails trigger `email.new` events to connected clients
- [ ] Ping/pong keepalive works every 30s
- [ ] Connections cleaned up on close/error
- [ ] Health endpoint shows connection count

## Security Considerations

- JWT must be verified before accepting connection
- Token in WebSocket message (not URL) to avoid logging
- Authentication timeout prevents resource exhaustion
- Rate limit connections per user (max 5 suggested)
- Close connections with expired tokens
- Don't expose internal errors to clients

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Token in URL logged | Low | High | Use message-based auth |
| DoS via many connections | Medium | Medium | Rate limit per IP/user |
| Stale connections | Medium | Low | Heartbeat with cleanup |
| Memory exhaustion | Low | High | Max connections limit |

## Testing Commands

```bash
# Test with wscat
npm install -g wscat
wscat -c ws://localhost:3001/ws/events

# Send auth message
{"type":"auth","token":"your-jwt-token"}

# Send ping
{"type":"ping"}
```
