# Phase 01: Backend Infrastructure

## Context

- **Plan**: [plan.md](./plan.md)
- **Next**: [Phase 02 - WebSocket Implementation](./phase-02-websocket-implementation.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 |
| Status | pending |
| Effort | 3h |
| Description | Setup dependencies, Redis Pub/Sub service, and realtime infrastructure |

## Requirements

1. Install `web-push` package for Push API
2. Create Redis Pub/Sub client (separate from BullMQ connection)
3. Create realtime event service for publishing events
4. Create connection manager for tracking WebSocket/SSE clients

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Server                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │ Redis Pub/Sub   │  │  ConnectionManager           │ │
│  │ - subscriber    │  │  - Map<userId, Set<conn>>    │ │
│  │ - publisher     │  │  - add/remove/broadcast      │ │
│  └────────┬────────┘  └──────────────────────────────┘ │
│           │                                             │
│  ┌────────▼────────┐  ┌──────────────────────────────┐ │
│  │ RealtimeService │  │  EventTypes                  │ │
│  │ - publish()     │  │  - email.new                 │ │
│  │ - subscribe()   │  │  - email.read                │ │
│  └─────────────────┘  │  - email.deleted             │ │
│                       │  - inbox.created             │ │
│                       │  - notification.new          │ │
│                       └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Related Files

| File | Action |
|------|--------|
| `services/api/package.json` | Add web-push dependency |
| `services/api/src/config/redis.ts` | Existing Redis config |
| `services/api/src/services/realtime-pubsub.ts` | **CREATE** - Redis Pub/Sub wrapper |
| `services/api/src/services/connection-manager.ts` | **CREATE** - Track active connections |
| `services/api/src/services/realtime-events.ts` | **CREATE** - Event publishing service |
| `services/api/src/types/realtime.ts` | **CREATE** - Event type definitions |

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd services/api
npm install web-push
npm install -D @types/web-push
```

### Step 2: Create Event Type Definitions

**File**: `services/api/src/types/realtime.ts`

```typescript
// Event types for realtime system
export type RealtimeEventType =
  | 'email.new'
  | 'email.read'
  | 'email.deleted'
  | 'inbox.created'
  | 'notification.new';

export interface BaseEvent {
  type: RealtimeEventType;
  timestamp: number;
  userId: string;
}

export interface EmailNewEvent extends BaseEvent {
  type: 'email.new';
  payload: {
    inboxId: string;
    messageId: string;
    from: string | null;
    subject: string | null;
    receivedAt: string;
  };
}

export interface EmailReadEvent extends BaseEvent {
  type: 'email.read';
  payload: {
    messageId: string;
    isRead: boolean;
  };
}

export interface EmailDeletedEvent extends BaseEvent {
  type: 'email.deleted';
  payload: {
    messageId: string;
    inboxId: string;
  };
}

export interface InboxCreatedEvent extends BaseEvent {
  type: 'inbox.created';
  payload: {
    inboxId: string;
    email: string;
    domainId: string;
  };
}

export interface NotificationNewEvent extends BaseEvent {
  type: 'notification.new';
  payload: {
    id: string;
    title: string;
    message: string;
    type: string;
  };
}

export type RealtimeEvent =
  | EmailNewEvent
  | EmailReadEvent
  | EmailDeletedEvent
  | InboxCreatedEvent
  | NotificationNewEvent;
```

### Step 3: Create Redis Pub/Sub Service

**File**: `services/api/src/services/realtime-pubsub.ts`

```typescript
import Redis from 'ioredis';
import { redisConfig } from '../config/redis';
import type { RealtimeEvent } from '../types/realtime';

const CHANNEL = 'realtime:events';

class RealtimePubSub {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private handlers: Map<string, (event: RealtimeEvent) => void> = new Map();
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);

    this.subscriber.on('message', (channel, message) => {
      if (channel !== CHANNEL) return;
      try {
        const event: RealtimeEvent = JSON.parse(message);
        this.handlers.forEach((handler) => handler(event));
      } catch (err) {
        console.error('[RealtimePubSub] Failed to parse message:', err);
      }
    });

    await this.subscriber.subscribe(CHANNEL);
    this.isConnected = true;
    console.log('[RealtimePubSub] Connected to Redis');
  }

  async publish(event: RealtimeEvent): Promise<void> {
    if (!this.publisher) {
      throw new Error('RealtimePubSub not connected');
    }
    await this.publisher.publish(CHANNEL, JSON.stringify(event));
  }

  onMessage(id: string, handler: (event: RealtimeEvent) => void): void {
    this.handlers.set(id, handler);
  }

  removeHandler(id: string): void {
    this.handlers.delete(id);
  }

  async disconnect(): Promise<void> {
    await this.subscriber?.unsubscribe(CHANNEL);
    await this.subscriber?.quit();
    await this.publisher?.quit();
    this.handlers.clear();
    this.isConnected = false;
  }
}

export const realtimePubSub = new RealtimePubSub();
```

### Step 4: Create Connection Manager

**File**: `services/api/src/services/connection-manager.ts`

```typescript
import type { WebSocket } from 'ws';
import type { FastifyReply } from 'fastify';
import type { RealtimeEvent } from '../types/realtime';

interface WebSocketConnection {
  type: 'ws';
  socket: WebSocket;
  userId: string;
  createdAt: number;
}

interface SSEConnection {
  type: 'sse';
  reply: FastifyReply;
  userId: string;
  createdAt: number;
}

type Connection = WebSocketConnection | SSEConnection;

class ConnectionManager {
  private connections: Map<string, Set<Connection>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  add(userId: string, connection: Connection): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(connection);
    console.log(`[ConnectionManager] User ${userId} connected (${connection.type}). Total: ${this.getConnectionCount()}`);
  }

  remove(userId: string, connection: Connection): void {
    const userConns = this.connections.get(userId);
    if (userConns) {
      userConns.delete(connection);
      if (userConns.size === 0) {
        this.connections.delete(userId);
      }
    }
    console.log(`[ConnectionManager] User ${userId} disconnected. Total: ${this.getConnectionCount()}`);
  }

  broadcast(event: RealtimeEvent): void {
    const userConns = this.connections.get(event.userId);
    if (!userConns) return;

    const message = JSON.stringify(event);

    userConns.forEach((conn) => {
      try {
        if (conn.type === 'ws' && conn.socket.readyState === 1) {
          conn.socket.send(message);
        } else if (conn.type === 'sse') {
          conn.reply.raw.write(`data: ${message}\n\n`);
        }
      } catch (err) {
        console.error('[ConnectionManager] Failed to send:', err);
        this.remove(event.userId, conn);
      }
    });
  }

  getConnectionCount(): number {
    let count = 0;
    this.connections.forEach((set) => (count += set.size));
    return count;
  }

  getUserConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size ?? 0;
  }

  private startHeartbeat(): void {
    // Ping WebSocket connections every 30s
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((userConns, userId) => {
        userConns.forEach((conn) => {
          if (conn.type === 'ws') {
            try {
              if (conn.socket.readyState === 1) {
                conn.socket.ping();
              } else {
                this.remove(userId, conn);
              }
            } catch {
              this.remove(userId, conn);
            }
          }
        });
      });
    }, 30000);
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.connections.forEach((userConns) => {
      userConns.forEach((conn) => {
        if (conn.type === 'ws') {
          conn.socket.close(1001, 'Server shutting down');
        }
      });
    });
    this.connections.clear();
  }
}

export const connectionManager = new ConnectionManager();
```

### Step 5: Create Realtime Events Service

**File**: `services/api/src/services/realtime-events.ts`

```typescript
import { realtimePubSub } from './realtime-pubsub';
import { connectionManager } from './connection-manager';
import type {
  RealtimeEvent,
  EmailNewEvent,
  EmailReadEvent,
  EmailDeletedEvent,
  InboxCreatedEvent,
  NotificationNewEvent,
} from '../types/realtime';

class RealtimeEventsService {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    await realtimePubSub.connect();

    // Subscribe to events and broadcast to connected clients
    realtimePubSub.onMessage('broadcast', (event: RealtimeEvent) => {
      connectionManager.broadcast(event);
    });

    this.initialized = true;
    console.log('[RealtimeEvents] Service initialized');
  }

  async publishEmailNew(
    userId: string,
    payload: EmailNewEvent['payload']
  ): Promise<void> {
    const event: EmailNewEvent = {
      type: 'email.new',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  async publishEmailRead(
    userId: string,
    payload: EmailReadEvent['payload']
  ): Promise<void> {
    const event: EmailReadEvent = {
      type: 'email.read',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  async publishEmailDeleted(
    userId: string,
    payload: EmailDeletedEvent['payload']
  ): Promise<void> {
    const event: EmailDeletedEvent = {
      type: 'email.deleted',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  async publishInboxCreated(
    userId: string,
    payload: InboxCreatedEvent['payload']
  ): Promise<void> {
    const event: InboxCreatedEvent = {
      type: 'inbox.created',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  async publishNotification(
    userId: string,
    payload: NotificationNewEvent['payload']
  ): Promise<void> {
    const event: NotificationNewEvent = {
      type: 'notification.new',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  shutdown(): void {
    connectionManager.shutdown();
    realtimePubSub.disconnect();
  }
}

export const realtimeEvents = new RealtimeEventsService();
```

### Step 6: Update Server Initialization

Add to `services/api/src/server.ts` (after buildServer):

```typescript
// In startHttpServer function, after app.listen():
import { realtimeEvents } from './services/realtime-events';

// Add before return app:
await realtimeEvents.init();
app.log.info('Realtime events service initialized');

// Add graceful shutdown
process.on('SIGTERM', () => {
  realtimeEvents.shutdown();
});
```

## Todo List

- [ ] Install web-push package
- [ ] Create `types/realtime.ts` with event definitions
- [ ] Create `services/realtime-pubsub.ts` for Redis Pub/Sub
- [ ] Create `services/connection-manager.ts` for tracking connections
- [ ] Create `services/realtime-events.ts` for event publishing
- [ ] Update `server.ts` to initialize realtime service
- [ ] Add graceful shutdown handling
- [ ] Test Redis connection with local Redis

## Success Criteria

- [ ] `web-push` installed and types available
- [ ] Redis Pub/Sub connects successfully on server start
- [ ] ConnectionManager can track connections by userId
- [ ] RealtimeEvents service can publish events to Redis
- [ ] No memory leaks when connections are added/removed
- [ ] Graceful shutdown closes all connections

## Security Considerations

- Redis connection should use password in production
- ConnectionManager must validate userId before adding
- Event payloads should not contain sensitive data (passwords, tokens)
- Rate limit event publishing to prevent abuse

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Redis connection failure | Medium | High | Reconnection logic with exponential backoff |
| Memory leak from orphaned connections | Medium | Medium | Heartbeat + cleanup on disconnect |
| Event storm overwhelming clients | Low | Medium | Debounce/throttle in frontend |
