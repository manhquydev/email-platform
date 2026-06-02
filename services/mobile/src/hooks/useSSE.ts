import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.ephemera.app';

interface SSEEvent {
  type: 'email.received' | 'email.read' | 'email.deleted' | 'connected' | 'heartbeat';
  data: {
    messageId?: string;
    inboxId?: string;
    isRead?: boolean;
  };
}

/**
 * Hook to manage SSE connection for real-time updates
 */
export function useSSE() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);

  // Handle SSE events
  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case 'email.received':
          // Invalidate message list for the inbox
          if (event.data.inboxId) {
            queryClient.invalidateQueries({
              queryKey: ['messages', event.data.inboxId],
            });
          }
          // Invalidate all inboxes to update counts
          queryClient.invalidateQueries({ queryKey: ['inboxes'] });
          break;

        case 'email.read':
          // Invalidate specific message
          if (event.data.messageId) {
            queryClient.invalidateQueries({
              queryKey: ['message', event.data.messageId],
            });
          }
          break;

        case 'email.deleted':
          // Invalidate message lists
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['inboxes'] });
          break;

        case 'heartbeat':
        case 'connected':
          // Keep connection alive, no action needed
          break;
      }
    },
    [queryClient]
  );

  // Connect to SSE
  const connect = useCallback(async () => {
    if (!isAuthenticated || isConnectingRef.current) return;

    isConnectingRef.current = true;

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        isConnectingRef.current = false;
        return;
      }

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Exchange the token for a single-use SSE ticket (token sent in the Authorization header),
      // then open the EventSource with the ticket — the token is never placed in the URL.
      const ticketRes = await fetch(`${API_BASE}/api/events/ticket`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!ticketRes.ok) throw new Error(`SSE ticket request failed (${ticketRes.status})`);
      const { ticket } = (await ticketRes.json()) as { ticket: string };
      const url = `${API_BASE}/api/events?ticket=${encodeURIComponent(ticket)}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log('SSE connected');
        isConnectingRef.current = false;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          handleSSEEvent(data);
        } catch (error) {
          console.error('SSE parse error:', error);
        }
      };

      eventSource.onerror = () => {
        console.log('SSE error, will reconnect');
        eventSource.close();
        eventSourceRef.current = null;
        isConnectingRef.current = false;

        // Reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('SSE connection failed:', error);
      isConnectingRef.current = false;
      // Retry on transient failures (e.g. ticket request) with the same backoff as onerror.
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  }, [isAuthenticated, handleSSEEvent]);

  // Disconnect SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    isConnectingRef.current = false;
  }, []);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App came to foreground - reconnect
        connect();
      } else if (nextState === 'background' || nextState === 'inactive') {
        // App went to background - disconnect to save battery
        disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [connect, disconnect]);

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);
}
