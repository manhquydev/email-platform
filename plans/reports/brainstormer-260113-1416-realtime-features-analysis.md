# Real-time Features Analysis Report

**Date:** 2026-01-13
**Type:** Brainstorm / Research
**Status:** Complete

---

## Executive Summary

Dự án email-platform hiện **KHÔNG có real-time thực sự** - chỉ sử dụng **polling** với intervals 5-60s. Cần triển khai WebSocket, SSE, và Browser Push Notifications để nâng cấp UX.

---

## 1. Tình Trạng Hiện Tại

### 1.1 Polling-based "Real-time" (Fake Real-time)

| Component | Interval | File |
|-----------|----------|------|
| Dashboard Messages | 10s | `useDashboardData.ts:187` |
| FocusDashboard | 10s | `FocusDashboard.tsx:121` |
| Dashboard.tsx | 10s | `Dashboard.tsx:218` |
| NotificationCenter | 60s | `NotificationCenter.tsx:106` |
| AdminSystem | 5s | `AdminSystem.tsx:73` |
| AdminDashboard | auto | `AdminDashboard.tsx:277` |
| AdminBackup | 30s | `AdminBackup.tsx:50` |
| AdminPanel | 60s | `AdminPanel.tsx:157` |
| TelegramLinkModal | 3s | `telegram-link-modal.tsx:111` |

**Vấn đề:**
- Latency 3-60s cho updates
- Wasted API calls khi không có data mới
- Battery drain trên mobile
- Server load không cần thiết

### 1.2 Push Mechanisms Hiện Có (External)

| Mechanism | Purpose | Trigger |
|-----------|---------|---------|
| Telegram Bot | Email notifications | `worker.ts:277,304` |
| Webhooks (BullMQ) | External integrations | `webhookService.ts` |

### 1.3 Không Có

- ❌ WebSocket server
- ❌ SSE endpoints
- ❌ Redis pub/sub cho real-time
- ❌ Browser Push Notifications
- ❌ Service Worker

---

## 2. Real-time Features Cần Triển Khai

### 2.1 WebSocket (Full-duplex)

**Use Cases:**
- Instant email arrival notification
- Live inbox sync across tabs/devices
- Typing indicators (nếu có chat)
- Real-time read/unread sync
- Admin live monitoring

**Architecture:**
```
Client <--WebSocket--> Fastify (@fastify/websocket)
                            |
                      Redis Pub/Sub
                            |
                      Email Worker
```

**Implementation:**
```typescript
// @fastify/websocket integration
import websocket from '@fastify/websocket';

app.register(websocket);

app.get('/ws', { websocket: true }, (socket, req) => {
  // Auth check via JWT in query/header
  const userId = verifyToken(req);

  // Subscribe to user's Redis channel
  redisSubscriber.subscribe(`user:${userId}:events`);

  redisSubscriber.on('message', (channel, message) => {
    socket.send(message);
  });
});
```

**Events to broadcast:**
- `email.new` - New email received
- `email.read` - Email marked as read
- `email.deleted` - Email deleted
- `inbox.created` - New inbox created
- `notification.new` - System notification

### 2.2 Server-Sent Events (SSE) - Simpler Alternative

**Use Cases:**
- One-way server→client updates
- Fallback khi WebSocket blocked
- Simpler implementation

**Implementation:**
```typescript
app.get('/events', async (req, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  const userId = req.user.id;

  // Subscribe to Redis
  const subscriber = redis.duplicate();
  await subscriber.subscribe(`user:${userId}:events`);

  subscriber.on('message', (channel, data) => {
    reply.raw.write(`data: ${data}\n\n`);
  });

  req.raw.on('close', () => subscriber.disconnect());
});
```

### 2.3 Browser Push Notifications (Web Push)

**Use Cases:**
- Notify user khi tab đóng/minimized
- Mobile-like notification experience
- Background sync

**Requirements:**
- Service Worker
- VAPID keys
- Push subscription storage

**Implementation Overview:**
```
1. Generate VAPID keys (server)
2. Register Service Worker (client)
3. Request push permission
4. Subscribe to push service
5. Store subscription in DB
6. Send push from worker when email arrives
```

**Libraries:**
- `web-push` (server)
- Native Push API (client)

---

## 3. Recommended Architecture

### 3.1 Hybrid Approach

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT                              │
├─────────────────────────────────────────────────────────┤
│  WebSocket (primary)  │  SSE (fallback)  │  Push API    │
│     ↕ real-time       │   ↕ real-time    │  ↕ offline   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    FASTIFY API                           │
├─────────────────────────────────────────────────────────┤
│  /ws endpoint  │  /events (SSE)  │  Push dispatcher     │
│       │                │                   │             │
│       └────────────────┼───────────────────┘             │
│                        ▼                                 │
│              Redis Pub/Sub Hub                           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   EMAIL WORKER                           │
│  On new email → Publish to Redis → Trigger Push         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Redis Pub/Sub Channels

```
user:{userId}:events     - User-specific events
inbox:{inboxId}:events   - Inbox-specific events
broadcast:system         - System-wide announcements
admin:events             - Admin dashboard events
```

### 3.3 Client-side Strategy

```typescript
// Real-time connection manager
class RealtimeManager {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;

  connect() {
    // Try WebSocket first
    this.ws = new WebSocket(`wss://api.domain/ws?token=${token}`);

    this.ws.onerror = () => {
      // Fallback to SSE
      this.sse = new EventSource(`/events?token=${token}`);
    };
  }

  onMessage(handler: (event: RealtimeEvent) => void) {
    // Unified handler for both WS and SSE
  }
}
```

---

## 4. Implementation Priority

### Phase 1: WebSocket Foundation (High Priority)
1. Add `@fastify/websocket` dependency
2. Create WebSocket route with JWT auth
3. Setup Redis pub/sub infrastructure
4. Modify `worker.ts` to publish events on email arrival
5. Create client-side WebSocket hook

### Phase 2: SSE Fallback (Medium Priority)
1. Create SSE endpoint
2. Add client-side SSE fallback
3. Unified event handler

### Phase 3: Browser Push (Medium Priority)
1. Generate VAPID keys
2. Create Service Worker
3. Push subscription management
4. Integrate with email worker

### Phase 4: Enhanced Features (Low Priority)
- Typing indicators
- Presence (online/offline)
- Multi-device sync
- Read receipts sync

---

## 5. Technical Considerations

### 5.1 Dependencies to Add

```json
{
  "@fastify/websocket": "^10.0.0",
  "web-push": "^3.6.0",
  "ioredis": "^5.4.0"  // Already have via bullmq
}
```

### 5.2 Database Changes

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

### 5.3 Security

- JWT validation on WebSocket upgrade
- Rate limiting per connection
- Message size limits
- Connection timeout
- Origin validation

### 5.4 Scaling

- Redis pub/sub cho multi-instance
- Sticky sessions hoặc Redis adapter
- Connection pooling
- Graceful shutdown handling

---

## 6. Estimated Effort

| Phase | Complexity | Backend | Frontend |
|-------|------------|---------|----------|
| WebSocket | Medium | 4-6h | 3-4h |
| SSE | Low | 2-3h | 1-2h |
| Push Notifications | Medium | 4-5h | 3-4h |
| Integration/Testing | Medium | 3-4h | 2-3h |

**Total: ~20-30 hours**

---

## 7. Comparison: Current vs Proposed

| Metric | Current (Polling) | Proposed (WebSocket+SSE+Push) |
|--------|-------------------|-------------------------------|
| Latency | 3-60 seconds | <100ms |
| API Calls | Constant (wasteful) | On-demand |
| Battery | Higher drain | Optimized |
| Offline | No support | Push notifications |
| UX | Outdated | Modern, instant |

---

## 8. Sources

- [Plain English - WebSocket Best Practices](https://plainenglish.io)
- [VideoSDK - Real-time Architecture 2025](https://videosdk.live)
- [Debut Infotech - Node.js WebSocket](https://debutinfotech.com)
- [Codefinity - Fastify WebSocket Guide](https://codefinity.com)
- [Medium - SSE vs WebSocket](https://medium.com)

---

## Unresolved Questions

1. **Scaling strategy**: Cần Redis Cluster hay single instance đủ cho current load?
2. **Push notification content**: Hiển thị preview email hay chỉ title?
3. **Connection limits**: Max concurrent WebSocket connections per user?
4. **Fallback priority**: SSE trước hay long-polling?
