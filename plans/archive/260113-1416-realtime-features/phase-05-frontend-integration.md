# Phase 05: Frontend Integration

## Context

- **Plan**: [plan.md](./plan.md)
- **Previous**: [Phase 04 - Push Notifications](./phase-04-push-notifications.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 |
| Status | pending |
| Effort | 3h |
| Description | Create React hooks and context, replace polling with realtime updates |

## Requirements

1. Create `useRealtime` hook for WebSocket/SSE connection
2. Create `RealtimeContext` for app-wide event distribution
3. Update Dashboard.tsx to use realtime instead of polling
4. Update FocusDashboard.tsx to use realtime
5. Update NotificationCenter.tsx to use realtime
6. Update useDashboardData.ts to integrate realtime events
7. Remove all polling intervals

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React App                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  RealtimeProvider (wraps App)                           │   │
│  │  - Manages WebSocket/SSE connection                     │   │
│  │  - Provides event subscription API                      │   │
│  │  - Auto-reconnect with exponential backoff              │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│     ┌─────────────────────┼─────────────────────────────────┐  │
│     │                     │                                 │  │
│     ▼                     ▼                                 ▼  │
│  Dashboard.tsx    FocusDashboard.tsx    NotificationCenter.tsx │
│  useRealtime()    useRealtime()         useRealtime()          │
│  onEvent →        onEvent →             onEvent →              │
│  update state     update state          update state           │
└─────────────────────────────────────────────────────────────────┘
```

## Related Files

| File | Action |
|------|--------|
| `services/web/src/context/RealtimeContext.tsx` | **CREATE** |
| `services/web/src/hooks/useRealtime.ts` | **CREATE** |
| `services/web/src/hooks/useDashboardData.ts` | **MODIFY** - Add realtime |
| `services/web/src/pages/Dashboard.tsx` | **MODIFY** - Remove polling |
| `services/web/src/pages/FocusDashboard.tsx` | **MODIFY** - Remove polling |
| `services/web/src/components/NotificationCenter.tsx` | **MODIFY** - Remove polling |
| `services/web/src/App.tsx` | **MODIFY** - Add RealtimeProvider |

## Implementation Steps

### Step 1: Create Realtime Types

**File**: `services/web/src/types/realtime.ts`

```typescript
export type RealtimeEventType =
  | 'email.new'
  | 'email.read'
  | 'email.deleted'
  | 'inbox.created'
  | 'notification.new';

export interface RealtimeEvent {
  type: RealtimeEventType;
  timestamp: number;
  userId: string;
  payload: Record<string, unknown>;
}

export interface EmailNewPayload {
  inboxId: string;
  messageId: string;
  from: string | null;
  subject: string | null;
  receivedAt: string;
}

export interface EmailReadPayload {
  messageId: string;
  isRead: boolean;
}

export interface EmailDeletedPayload {
  messageId: string;
  inboxId: string;
}

export interface InboxCreatedPayload {
  inboxId: string;
  email: string;
  domainId: string;
}

export interface NotificationNewPayload {
  id: string;
  title: string;
  message: string;
  type: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
```

### Step 2: Create useRealtime Hook

**File**: `services/web/src/hooks/useRealtime.ts`

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { RealtimeEvent, RealtimeEventType, ConnectionStatus } from '../types/realtime';

interface UseRealtimeOptions {
  onEvent?: (event: RealtimeEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  eventTypes?: RealtimeEventType[];
}

interface UseRealtimeReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  reconnect: () => void;
}

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/events`;
const SSE_URL = '/api/events';
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const { token } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const mountedRef = useRef(true);

  const { onEvent, onConnect, onDisconnect, eventTypes } = options;

  const handleEvent = useCallback((event: RealtimeEvent) => {
    if (eventTypes && !eventTypes.includes(event.type)) return;
    onEvent?.(event);
  }, [onEvent, eventTypes]);

  const connectWebSocket = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send auth message
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'auth.success') {
          setStatus('connected');
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
          onConnect?.();
          return;
        }

        if (data.type === 'auth.error') {
          console.error('[Realtime] Auth failed:', data.message);
          ws.close();
          return;
        }

        if (data.type === 'pong') return;

        // Handle realtime event
        handleEvent(data as RealtimeEvent);
      } catch (err) {
        console.error('[Realtime] Parse error:', err);
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      setStatus('disconnected');
      onDisconnect?.();

      // Don't reconnect if closed normally or unmounted
      if (event.code === 1000 || !mountedRef.current) return;

      // Reconnect with exponential backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            MAX_RECONNECT_DELAY
          );
          connectWebSocket();
        }
      }, reconnectDelayRef.current);
    };

    ws.onerror = () => {
      setStatus('error');
      // Fallback to SSE
      console.warn('[Realtime] WebSocket failed, trying SSE');
      ws.close();
      connectSSE();
    };
  }, [token, handleEvent, onConnect, onDisconnect]);

  const connectSSE = useCallback(() => {
    if (!token || sseRef.current) return;

    setStatus('connecting');
    const sse = new EventSource(`${SSE_URL}?token=${encodeURIComponent(token)}`);
    sseRef.current = sse;

    sse.onopen = () => {
      setStatus('connected');
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      onConnect?.();
    };

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;
        handleEvent(data as RealtimeEvent);
      } catch (err) {
        console.error('[Realtime] SSE parse error:', err);
      }
    };

    sse.onerror = () => {
      setStatus('error');
      sse.close();
      sseRef.current = null;
      onDisconnect?.();

      // Reconnect with backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            MAX_RECONNECT_DELAY
          );
          connectSSE();
        }
      }, reconnectDelayRef.current);
    };
  }, [token, handleEvent, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    connectWebSocket();
  }, [disconnect, connectWebSocket]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;

    if (token) {
      connectWebSocket();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [token, connectWebSocket, disconnect]);

  // Keepalive ping every 25s
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [status]);

  return {
    status,
    isConnected: status === 'connected',
    reconnect,
  };
}
```

### Step 3: Create RealtimeContext

**File**: `services/web/src/context/RealtimeContext.tsx`

```typescript
import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { useRealtime } from '../hooks/useRealtime';
import type { RealtimeEvent, ConnectionStatus } from '../types/realtime';

type EventHandler = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  status: ConnectionStatus;
  isConnected: boolean;
  subscribe: (id: string, handler: EventHandler) => void;
  unsubscribe: (id: string) => void;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [handlers] = useState(() => new Map<string, EventHandler>());

  const handleEvent = useCallback((event: RealtimeEvent) => {
    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('[RealtimeContext] Handler error:', err);
      }
    });
  }, [handlers]);

  const { status, isConnected, reconnect } = useRealtime({
    onEvent: handleEvent,
    onConnect: () => console.log('[RealtimeContext] Connected'),
    onDisconnect: () => console.log('[RealtimeContext] Disconnected'),
  });

  const subscribe = useCallback((id: string, handler: EventHandler) => {
    handlers.set(id, handler);
  }, [handlers]);

  const unsubscribe = useCallback((id: string) => {
    handlers.delete(id);
  }, [handlers]);

  return (
    <RealtimeContext.Provider value={{ status, isConnected, subscribe, unsubscribe, reconnect }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within RealtimeProvider');
  }
  return context;
}

// Convenience hook for subscribing to events
export function useRealtimeSubscription(
  id: string,
  handler: EventHandler,
  deps: React.DependencyList = []
) {
  const { subscribe, unsubscribe } = useRealtimeContext();

  useCallback(() => {
    subscribe(id, handler);
    return () => unsubscribe(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, subscribe, unsubscribe, ...deps]);
}
```

### Step 4: Add RealtimeProvider to App

**File**: `services/web/src/App.tsx`

Wrap the app with RealtimeProvider (inside AuthProvider):

```typescript
import { RealtimeProvider } from './context/RealtimeContext';

// In the App component render:
<AuthProvider>
  <RealtimeProvider>
    {/* existing app content */}
  </RealtimeProvider>
</AuthProvider>
```

### Step 5: Update useDashboardData Hook

**File**: `services/web/src/hooks/useDashboardData.ts`

Add realtime integration. Replace the polling effect with realtime subscription:

```typescript
import { useRealtimeContext } from '../context/RealtimeContext';
import type { RealtimeEvent, EmailNewPayload } from '../types/realtime';

// Inside useDashboardData function, add:
const { subscribe, unsubscribe, isConnected } = useRealtimeContext();

// Handle realtime events
useEffect(() => {
    const handleRealtimeEvent = (event: RealtimeEvent) => {
        switch (event.type) {
            case 'email.new': {
                const payload = event.payload as EmailNewPayload;
                // If event is for current inbox, reload messages
                if (payload.inboxId === selectedInbox) {
                    loadMessages(selectedInbox, { background: true });
                }
                break;
            }
            case 'email.read': {
                const { messageId, isRead } = event.payload as { messageId: string; isRead: boolean };
                setMessages(prev => prev.map(m =>
                    m.id === messageId ? { ...m, isRead } : m
                ));
                break;
            }
            case 'email.deleted': {
                const { messageId } = event.payload as { messageId: string };
                setMessages(prev => prev.filter(m => m.id !== messageId));
                break;
            }
            case 'inbox.created': {
                loadInboxes();
                break;
            }
        }
    };

    subscribe('dashboard-data', handleRealtimeEvent);
    return () => unsubscribe('dashboard-data');
}, [selectedInbox, loadMessages, loadInboxes, subscribe, unsubscribe]);

// REMOVE the polling interval effect (lines 185-189):
// DELETE:
// useEffect(() => {
//     if (!selectedInbox) return;
//     const interval = setInterval(() => { loadMessages(selectedInbox, { background: true }); }, 10000);
//     return () => clearInterval(interval);
// }, [selectedInbox, loadMessages]);

// Add isConnected to return value for UI indicator
return {
    // ... existing return values
    isRealtimeConnected: isConnected,
};
```

### Step 6: Update Dashboard.tsx

**File**: `services/web/src/pages/Dashboard.tsx`

Remove the polling interval effect:

```typescript
// REMOVE these lines (around line 216-220):
// useEffect(() => {
//     if (!selectedInbox) return;
//     const interval = setInterval(() => { loadMessages(selectedInbox, { background: true }); }, 10000);
//     return () => clearInterval(interval);
// }, [selectedInbox, loadMessages]);

// Add realtime status indicator (optional, in toolbar):
import { useRealtimeContext } from '../context/RealtimeContext';

// Inside Dashboard function:
const { isConnected: isRealtimeConnected, status: realtimeStatus } = useRealtimeContext();

// Add to toolbar (optional visual indicator):
{isRealtimeConnected ? (
    <span className="w-2 h-2 rounded-full bg-green-500" title="Realtime connected" />
) : (
    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title={`Realtime: ${realtimeStatus}`} />
)}
```

### Step 7: Update FocusDashboard.tsx

**File**: `services/web/src/pages/FocusDashboard.tsx`

Apply same changes - remove polling, add realtime subscription.

### Step 8: Update NotificationCenter.tsx

**File**: `services/web/src/components/NotificationCenter.tsx`

```typescript
import { useRealtimeContext } from '../context/RealtimeContext';
import type { RealtimeEvent, NotificationNewPayload } from '../types/realtime';

// Inside NotificationCenter function:
const { subscribe, unsubscribe } = useRealtimeContext();

// Add realtime subscription
useEffect(() => {
    const handleRealtimeEvent = (event: RealtimeEvent) => {
        if (event.type === 'notification.new') {
            const payload = event.payload as NotificationNewPayload;
            // Add new notification to state
            setNotifications(prev => [{
                id: payload.id,
                title: payload.title,
                message: payload.message,
                type: payload.type as any,
                isRead: false,
                createdAt: new Date().toISOString(),
            }, ...prev]);
            setUnreadCount(prev => prev + 1);
        }
    };

    subscribe('notification-center', handleRealtimeEvent);
    return () => unsubscribe('notification-center');
}, [subscribe, unsubscribe]);

// REMOVE the polling interval (lines 103-108):
// DELETE:
// useEffect(() => {
//     fetchNotifications();
//     const interval = setInterval(fetchNotifications, 60000);
//     return () => clearInterval(interval);
// }, [fetchNotifications]);

// Replace with single fetch on mount:
useEffect(() => {
    fetchNotifications();
}, [fetchNotifications]);
```

### Step 9: Add Push Subscription UI

**File**: `services/web/src/components/settings/NotificationsSettings.tsx`

Add toggle for browser push notifications:

```typescript
import { subscribeToPush, unsubscribeFromPush } from '../../utils/push-subscription';

// Add state
const [pushEnabled, setPushEnabled] = useState(false);
const [pushLoading, setPushLoading] = useState(false);

// Check subscription status on mount
useEffect(() => {
    async function checkPush() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            setPushEnabled(!!sub);
        }
    }
    checkPush();
}, []);

// Toggle handler
const handlePushToggle = async () => {
    setPushLoading(true);
    try {
        if (pushEnabled) {
            await unsubscribeFromPush(token!);
            setPushEnabled(false);
            toast.success('Đã tắt thông báo đẩy');
        } else {
            const success = await subscribeToPush(token!);
            setPushEnabled(success);
            if (success) {
                toast.success('Đã bật thông báo đẩy');
            } else {
                toast.error('Không thể bật thông báo đẩy');
            }
        }
    } catch (err) {
        toast.error('Lỗi cập nhật thông báo');
    } finally {
        setPushLoading(false);
    }
};

// Add to UI
<div className="flex items-center justify-between">
    <div>
        <h4 className="font-medium">Thông báo đẩy</h4>
        <p className="text-sm text-gray-500">Nhận thông báo khi có email mới (ngay cả khi đóng tab)</p>
    </div>
    <button
        onClick={handlePushToggle}
        disabled={pushLoading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            pushEnabled ? 'bg-violet-600' : 'bg-gray-300'
        }`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            pushEnabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
    </button>
</div>
```

## Files Summary

| File | Changes |
|------|---------|
| `types/realtime.ts` | New - Type definitions |
| `hooks/useRealtime.ts` | New - WebSocket/SSE hook |
| `context/RealtimeContext.tsx` | New - Provider and subscription API |
| `App.tsx` | Add RealtimeProvider |
| `hooks/useDashboardData.ts` | Add realtime, remove polling |
| `pages/Dashboard.tsx` | Remove polling, add status indicator |
| `pages/FocusDashboard.tsx` | Remove polling |
| `components/NotificationCenter.tsx` | Add realtime, remove polling |
| `components/settings/NotificationsSettings.tsx` | Add push toggle |

## Todo List

- [ ] Create `types/realtime.ts` with event types
- [ ] Create `hooks/useRealtime.ts` with WebSocket/SSE logic
- [ ] Create `context/RealtimeContext.tsx` with provider
- [ ] Wrap App with RealtimeProvider
- [ ] Update useDashboardData.ts with realtime subscription
- [ ] Remove polling from Dashboard.tsx
- [ ] Remove polling from FocusDashboard.tsx
- [ ] Remove polling from NotificationCenter.tsx
- [ ] Add realtime connection status indicator
- [ ] Add push notification toggle in settings
- [ ] Test WebSocket connection and events
- [ ] Test SSE fallback
- [ ] Test auto-reconnect behavior
- [ ] Verify no memory leaks

## Success Criteria

- [ ] WebSocket connects on app load (when authenticated)
- [ ] Falls back to SSE if WebSocket fails
- [ ] New emails appear instantly without page refresh
- [ ] Read/delete status syncs across tabs
- [ ] Notifications update in realtime
- [ ] Connection status visible to user
- [ ] Auto-reconnects on disconnect
- [ ] No polling intervals remain in codebase
- [ ] Push notification toggle works

## Security Considerations

- Token passed securely (WS message or SSE header preferred)
- Events filtered to prevent data leaks
- Connection closed on logout
- No sensitive data in event payloads

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Connection drops | Medium | Low | Auto-reconnect with backoff |
| State desync | Low | Medium | Periodic full refresh option |
| Memory leaks | Medium | Medium | Proper cleanup on unmount |
| Too many reconnects | Low | Low | Max backoff delay |

## Testing Checklist

1. [ ] Login → WebSocket connects
2. [ ] Send test email → appears in list
3. [ ] Mark email read → status updates
4. [ ] Delete email → removed from list
5. [ ] Disconnect network → shows disconnected
6. [ ] Reconnect network → auto-reconnects
7. [ ] Block WebSocket → falls back to SSE
8. [ ] Logout → connection closes
9. [ ] Multiple tabs → all receive events
10. [ ] Enable push → receives notification when tab closed
