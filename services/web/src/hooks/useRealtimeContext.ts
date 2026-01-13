import { useContext, useEffect } from 'react';
import { RealtimeContext, type EventHandler } from '../context/RealtimeContext';

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

  useEffect(() => {
    subscribe(id, handler);
    return () => unsubscribe(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, subscribe, unsubscribe, ...deps]);
}
