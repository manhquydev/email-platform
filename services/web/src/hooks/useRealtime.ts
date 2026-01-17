import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { RealtimeEvent, RealtimeEventType, ConnectionStatus } from '../types/realtime';

interface UseRealtimeOptions {
  onEvent?: (event: RealtimeEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  eventTypes?: RealtimeEventType[];
  onPoll?: () => void; // Called when polling fallback is triggered
}

interface UseRealtimeReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  reconnect: () => void;
}

// Parse API base URL to extract host for WebSocket/SSE connections
const API_BASE_URL = import.meta.env.VITE_API_BASE || '';
const getApiHost = (): string => {
  if (!API_BASE_URL) return window.location.host;
  try {
    const url = new URL(API_BASE_URL);
    return url.host;
  } catch {
    // If not a full URL, assume it's a path on current host
    return window.location.host;
  }
};

const API_HOST = getApiHost();
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${API_HOST}/ws/events`;
const SSE_URL = `${API_BASE_URL}/realtime/sse`;
const MAX_RECONNECT_DELAY = 30000;
const POLLING_INTERVAL = 30000; // Fallback polling every 30s
// MAX_SSE_FAILURES removed - not currently used
const INITIAL_RECONNECT_DELAY = 1000;

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const { token } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  // sseFailureCountRef removed - not currently used
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const mountedRef = useRef(true);
  const connectSSERef = useRef<() => void>(() => {});
  const connectWebSocketRef = useRef<() => void>(() => {});

  const { onEvent, onConnect, onDisconnect, eventTypes, onPoll } = options;

  const handleEvent = useCallback((event: RealtimeEvent) => {
    if (eventTypes && !eventTypes.includes(event.type)) return;
    onEvent?.(event);
  }, [onEvent, eventTypes]);


  // Polling fallback when both WS and SSE fail
  const startPolling = useCallback(() => {
    if (isPollingRef.current || pollingIntervalRef.current) return;

    console.warn('[Realtime] Starting polling fallback');
    isPollingRef.current = true;
    setStatus('connected'); // Show as connected since polling works

    // Initial poll
    onPoll?.();

    // Set up interval
    pollingIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        onPoll?.();
      }
    }, POLLING_INTERVAL);
  }, [onPoll]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

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
      if (mountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * 2,
              MAX_RECONNECT_DELAY
            );
            connectSSERef.current();
          }
        }, reconnectDelayRef.current);
      }
    };
  }, [token, handleEvent, onConnect, onDisconnect, startPolling, stopPolling]);

  const connectWebSocket = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');

    try {
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
            connectWebSocketRef.current();
          }
        }, reconnectDelayRef.current);
      };

      ws.onerror = () => {
        setStatus('error');
        // Fallback to SSE
        console.warn('[Realtime] WebSocket failed, trying SSE');
        ws.close();
        connectSSERef.current();
      };
    } catch {
      console.warn('[Realtime] WebSocket not available, using SSE');
      connectSSERef.current();
    }
  }, [token, handleEvent, onConnect, onDisconnect]);

  useEffect(() => {
    connectSSERef.current = connectSSE;
    connectWebSocketRef.current = connectWebSocket;
  }, [connectSSE, connectWebSocket]);

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
    connectWebSocketRef.current();
  }, [disconnect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;

    if (token) {
      connectWebSocketRef.current();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [token, disconnect]);

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
