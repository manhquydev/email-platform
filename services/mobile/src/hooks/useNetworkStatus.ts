import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/** Setup TanStack Query online manager with NetInfo */
export function setupNetworkListener(): () => void {
  // Store the unsubscribe function from NetInfo
  let unsubscribe: (() => void) | null = null;

  onlineManager.setEventListener((setOnline) => {
    unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setOnline(!!state.isConnected);
    });
    return unsubscribe;
  });

  // Return cleanup function
  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/** Hook to get current network status */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      setIsOnline(!!state.isConnected);
      setConnectionType(state.type);
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(!!state.isConnected);
      setConnectionType(state.type);
    });

    return unsubscribe;
  }, []);

  return { isOnline, connectionType };
}
