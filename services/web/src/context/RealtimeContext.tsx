import { createContext, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useRealtime } from '../hooks/useRealtime';
import type { RealtimeEvent, ConnectionStatus } from '../types/realtime';

export type EventHandler = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  status: ConnectionStatus;
  isConnected: boolean;
  subscribe: (id: string, handler: EventHandler) => void;
  unsubscribe: (id: string) => void;
  reconnect: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const RealtimeContext = createContext<RealtimeContextValue | null>(null);

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
