# Phase 03: SSE Fallback

## Context

- **Plan**: [plan.md](./plan.md)
- **Previous**: [Phase 02 - WebSocket Implementation](./phase-02-websocket-implementation.md)
- **Next**: [Phase 04 - Push Notifications](./phase-04-push-notifications.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P2 |
| Status | pending |
| Effort | 2h |
| Description | Implement Server-Sent Events as fallback for WebSocket-blocked environments |

## Requirements

1. Create `/api/events` SSE endpoint with JWT authentication
2. Use same ConnectionManager as WebSocket
3. Disable compression for SSE responses (required for streaming)
4. Handle connection lifecycle and cleanup
5. Support same event types as WebSocket

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client                                  │
│  const es = new EventSource('/api/events?token=jwt...')        │
│  es.onmessage = (e) => console.log(JSON.parse(e.data))         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/events Route                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Extract token from query or Authorization header            │
│  2. Verify JWT using app.jwt.verify()                          │
│  3. Set SSE headers (text/event-stream, no-cache)              │
│  4. Add connection to ConnectionManager                         │
│  5. Send keepalive comments every 15s                          │
│  6. Forward events from Redis to client                         │
└─────────────────────────────────────────────────────────────────┘
```

## Related Files

| File | Action |
|------|--------|
| `services/api/src/routes/realtime-sse.ts` | **CREATE** - SSE route |
| `services/api/src/server.ts` | Register SSE route |
| `services/api/src/services/connection-manager.ts` | Already supports SSE |

## Implementation Steps

### Step 1: Create SSE Route

**File**: `services/api/src/routes/realtime-sse.ts`

```typescript
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { connectionManager } from '../services/connection-manager';

interface JWTPayload {
  userId: string;
  role: string;
  tier: string;
  iat: number;
  exp: number;
}

const realtimeSseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/events', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { token?: string } }>, reply: FastifyReply) => {
    // Extract token from query or Authorization header
    let token = request.query.token;
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return reply.status(401).send({ error: 'Token required' });
    }

    // Verify JWT
    let userId: string;
    try {
      const decoded = app.jwt.verify<JWTPayload>(token);
      userId = decoded.userId;
    } catch (err) {
      request.log.warn({ err }, 'SSE auth failed');
      return reply.status(401).send({ error: 'Invalid token' });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial connection event
    reply.raw.write(`data: ${JSON.stringify({
      type: 'connected',
      userId,
      timestamp: Date.now(),
    })}\n\n`);

    // Create SSE connection object
    const connection = {
      type: 'sse' as const,
      reply,
      userId,
      createdAt: Date.now(),
    };

    // Add to connection manager
    connectionManager.add(userId, connection);
    request.log.info({ userId }, 'SSE connected');

    // Keepalive: send comment every 15s to prevent timeout
    const keepaliveInterval = setInterval(() => {
      try {
        reply.raw.write(': keepalive\n\n');
      } catch {
        clearInterval(keepaliveInterval);
      }
    }, 15000);

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(keepaliveInterval);
      connectionManager.remove(userId, connection);
      request.log.info({ userId }, 'SSE disconnected');
    });

    request.raw.on('error', (err) => {
      clearInterval(keepaliveInterval);
      connectionManager.remove(userId, connection);
      request.log.error({ err, userId }, 'SSE error');
    });

    // Keep connection open (don't call reply.send())
    // Fastify will handle the response lifecycle
  });
};

export default realtimeSseRoutes;
```

### Step 2: Update ConnectionManager for SSE Broadcasting

**File**: `services/api/src/services/connection-manager.ts`

Update the broadcast method to handle SSE format correctly:

```typescript
broadcast(event: RealtimeEvent): void {
  const userConns = this.connections.get(event.userId);
  if (!userConns) return;

  const message = JSON.stringify(event);

  userConns.forEach((conn) => {
    try {
      if (conn.type === 'ws' && conn.socket.readyState === 1) {
        conn.socket.send(message);
      } else if (conn.type === 'sse') {
        // SSE format: data: {json}\n\n
        conn.reply.raw.write(`data: ${message}\n\n`);
      }
    } catch (err) {
      console.error('[ConnectionManager] Failed to send:', err);
      this.remove(event.userId, conn);
    }
  });
}
```

### Step 3: Register SSE Route in Server

**File**: `services/api/src/server.ts`

Add import and registration:

```typescript
import realtimeSseRoutes from './routes/realtime-sse';

// In buildServer(), after other route registrations:
app.register(realtimeSseRoutes);
```

### Step 4: Disable Compression for SSE

If using compression middleware, ensure SSE responses are not compressed. Add to server.ts if compression is enabled:

```typescript
// If you add @fastify/compress later, configure it to skip SSE:
app.register(compress, {
  encodings: ['gzip', 'deflate'],
  // Skip compression for SSE
  customFilter: (request) => {
    return !request.url?.includes('/api/events');
  },
});
```

## SSE Protocol

### Event Format

SSE uses a specific text format:

```
data: {"type":"email.new","timestamp":1234567890,"userId":"user-id","payload":{...}}

: keepalive

data: {"type":"notification.new","timestamp":1234567890,"userId":"user-id","payload":{...}}

```

- `data:` prefix for actual events
- `:` prefix for comments (keepalive)
- Double newline `\n\n` to end each message

### Client Usage

```javascript
// Browser client
const token = 'your-jwt-token';
const eventSource = new EventSource(`/api/events?token=${token}`);

eventSource.onopen = () => {
  console.log('SSE connected');
};

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  // EventSource will auto-reconnect
};

// Close connection
eventSource.close();
```

## Todo List

- [ ] Create `routes/realtime-sse.ts` with SSE handler
- [ ] Implement JWT auth via query param or header
- [ ] Set correct SSE headers (Content-Type, Cache-Control)
- [ ] Add keepalive comments every 15s
- [ ] Integrate with ConnectionManager
- [ ] Handle client disconnect cleanup
- [ ] Register route in server.ts
- [ ] Test with curl or browser EventSource
- [ ] Ensure compression is disabled for SSE

## Success Criteria

- [ ] SSE connects successfully at `/api/events`
- [ ] JWT auth works via query param or Authorization header
- [ ] Invalid tokens return 401
- [ ] Events received in correct SSE format
- [ ] Keepalive comments sent every 15s
- [ ] Connection cleaned up on client disconnect
- [ ] Same events received as WebSocket
- [ ] Works behind nginx/CDN (X-Accel-Buffering: no)

## Security Considerations

- Token in query string may be logged by proxies
  - Prefer Authorization header when possible
  - Tokens should be short-lived
- Rate limit SSE connections per user
- Close connections with expired tokens (check periodically)
- Don't expose internal errors in event stream

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Token logged in URL | Medium | Medium | Use short-lived tokens, prefer header |
| Proxy buffering | Medium | High | X-Accel-Buffering header, no compression |
| Connection timeout | Medium | Low | Keepalive every 15s |
| Memory leak | Low | Medium | Cleanup on disconnect |

## Testing Commands

```bash
# Test with curl
curl -N -H "Authorization: Bearer your-jwt-token" http://localhost:3001/api/events

# Or with token in query
curl -N "http://localhost:3001/api/events?token=your-jwt-token"

# Expected output:
# data: {"type":"connected","userId":"user-id","timestamp":1234567890}
#
# : keepalive
#
# data: {"type":"email.new",...}
```

## Comparison: WebSocket vs SSE

| Feature | WebSocket | SSE |
|---------|-----------|-----|
| Direction | Bidirectional | Server to client only |
| Protocol | ws:// / wss:// | http:// / https:// |
| Reconnection | Manual | Automatic |
| Binary data | Yes | No (text only) |
| Proxy support | Varies | Good |
| Browser support | All modern | All modern |
| Use case | Primary | Fallback |
