# Phase 2: Critical UX Fixes

## Context
- **Parent Plan:** [plan.md](./plan.md)
- **Research:** [UX Performance](./research/researcher-02-ux-performance.md)

## Overview
| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Effort | 6h |
| Status | Pending |
| Dependencies | None |

Fix 3 critical UX issues affecting real-time delivery and performance.

## Issues Addressed

### 1. No Polling Fallback for Real-time
- **File:** `services/web/src/pages/Dashboard.tsx:197-224`
- **Impact:** Users behind firewalls get no updates
- **UX:** Must manually refresh to see new emails

### 2. No Connection Status UI
- **File:** `services/web/src/components/copy-first/ListeningIndicator.tsx` (unused)
- **Impact:** Users unaware when disconnected
- **UX:** Think emails delayed when actually offline

### 3. N+1 Query in Message List
- **File:** `services/api/src/routes/messages.ts:62-68`
- **Impact:** 100-300ms extra latency per page load
- **UX:** Slow message list loading

## Related Code Files

### Modify
- `services/api/src/routes/messages.ts` - Fix N+1 query
- `services/web/src/pages/Dashboard.tsx` - Add polling fallback, connection status
- `services/web/src/hooks/useRealtimeContext.tsx` - Add reconnection logic

### Create
- `services/web/src/hooks/useConnectionStatus.ts` - Connection state hook
- `services/web/src/components/ConnectionStatus.tsx` - Status indicator

## Implementation Steps

### Step 1: Fix N+1 Query (1h)

```typescript
// services/api/src/routes/messages.ts
// BEFORE (2 queries)
const [messages, total] = await Promise.all([
  prisma.message.findMany({ where, skip, take, orderBy }),
  prisma.message.count({ where })
]);

// AFTER (1 transaction, same DB roundtrip)
const [messages, total] = await prisma.$transaction([
  prisma.message.findMany({ where, skip, take, orderBy }),
  prisma.message.count({ where })
]);
```

### Step 2: Connection Status Hook (1.5h)

```typescript
// services/web/src/hooks/useConnectionStatus.ts
type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'polling';

export function useConnectionStatus() {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  // Expose handlers for realtime hook to call
  const handlers = useMemo(() => ({
    onConnected: () => {
      setState('connected');
      setLastConnected(new Date());
    },
    onDisconnected: () => setState('disconnected'),
    onReconnecting: () => setState('connecting'),
    onFallbackToPolling: () => setState('polling'),
  }), []);

  return { state, lastConnected, handlers };
}
```

### Step 3: Connection Status UI (1h)

```tsx
// services/web/src/components/ConnectionStatus.tsx
export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const config = {
    connected: { color: 'bg-green-500', text: 'Đang kết nối', icon: '●' },
    connecting: { color: 'bg-yellow-500', text: 'Đang kết nối lại...', icon: '○' },
    disconnected: { color: 'bg-red-500', text: 'Mất kết nối', icon: '○' },
    polling: { color: 'bg-blue-500', text: 'Chế độ polling', icon: '↻' },
  };

  const { color, text, icon } = config[state];

  if (state === 'connected') return null; // Hide when healthy

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full bg-nebula-elevated shadow-lg">
      <span className={`w-2 h-2 rounded-full ${color}`}>{icon}</span>
      <span className="text-sm text-nebula-text-secondary">{text}</span>
    </div>
  );
}
```

### Step 4: Polling Fallback (2.5h)

```typescript
// services/web/src/hooks/useRealtimeSubscription.ts
export function useRealtimeSubscription(inboxId: string, onMessage: (msg) => void) {
  const [transport, setTransport] = useState<'ws' | 'sse' | 'polling'>('ws');
  const retryCount = useRef(0);
  const maxRetries = 3;

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(`${WS_URL}?inbox=${inboxId}`);

    ws.onopen = () => {
      retryCount.current = 0;
      connectionHandlers.onConnected();
    };

    ws.onmessage = (event) => onMessage(JSON.parse(event.data));

    ws.onclose = () => {
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
        connectionHandlers.onReconnecting();
        setTimeout(connectWebSocket, delay);
      } else {
        // Fallback to SSE
        setTransport('sse');
        connectSSE();
      }
    };

    return ws;
  }, [inboxId]);

  const connectSSE = useCallback(() => {
    const sse = new EventSource(`${API_URL}/realtime/sse?inbox=${inboxId}`);

    sse.onmessage = (event) => onMessage(JSON.parse(event.data));

    sse.onerror = () => {
      sse.close();
      // Fallback to polling
      setTransport('polling');
      connectionHandlers.onFallbackToPolling();
      startPolling();
    };

    return sse;
  }, [inboxId]);

  const startPolling = useCallback(() => {
    const interval = setInterval(async () => {
      const messages = await fetchNewMessages(inboxId, lastMessageId);
      messages.forEach(onMessage);
    }, 5000); // Poll every 5s

    return () => clearInterval(interval);
  }, [inboxId]);

  // ... lifecycle management
}
```

**Dashboard integration:**
```tsx
// services/web/src/pages/Dashboard.tsx
import { ConnectionStatus } from '../components/ConnectionStatus';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

function Dashboard() {
  const { state: connectionState, handlers } = useConnectionStatus();

  // Pass handlers to realtime subscription
  useRealtimeSubscription(selectedInbox, handleNewMessage, handlers);

  return (
    <>
      {/* existing content */}
      <ConnectionStatus state={connectionState} />
    </>
  );
}
```

## Todo List

- [ ] Refactor messages.ts to use $transaction
- [ ] Create useConnectionStatus hook
- [ ] Create ConnectionStatus component
- [ ] Add exponential backoff to WS reconnection
- [ ] Implement SSE fallback
- [ ] Implement polling fallback
- [ ] Integrate ConnectionStatus in Dashboard
- [ ] Test with network throttling
- [ ] Test WS → SSE → Polling degradation
- [ ] Add E2E test for connection recovery

## Success Criteria

- [ ] Message list loads in single DB transaction
- [ ] Connection status visible when not connected
- [ ] Auto-reconnect with exponential backoff
- [ ] Fallback to SSE if WS fails 3 times
- [ ] Fallback to polling if SSE fails
- [ ] New messages appear within 5s in polling mode

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Polling overloads server | Medium | Medium | Add rate limiting, 5s minimum interval |
| Multiple fallback connections | Low | Low | Cleanup previous transport before switching |
| Battery drain on mobile | Medium | Low | Pause polling when tab hidden |

## Security Considerations

- Validate inbox ownership in all transports
- Rate limit polling requests per user
- Don't expose internal connection state to console

## Next Steps

After Phase 2:
- Phase 3: High priority security fixes
- Phase 4: High priority UX/performance
