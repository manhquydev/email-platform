import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { OfflineCache } from '@/utils/offlineCache';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook to manage offline sync and caching
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync data when coming online
  const syncData = useCallback(async () => {
    if (!isAuthenticated) return;

    const isOnline = await OfflineCache.isOnline();
    if (!isOnline) {
      console.log('Offline - skipping sync');
      return;
    }

    // Invalidate all queries to fetch fresh data
    await queryClient.invalidateQueries();
    await OfflineCache.updateLastSync();
    console.log('Sync completed');
  }, [isAuthenticated, queryClient]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App came to foreground - sync data
        await syncData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [syncData]);

  // Periodic sync every 5 minutes when app is active
  useEffect(() => {
    if (!isAuthenticated) return;

    syncIntervalRef.current = setInterval(() => {
      syncData();
    }, 5 * 60 * 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isAuthenticated, syncData]);

  // Initial sync
  useEffect(() => {
    if (isAuthenticated) {
      syncData();
    }
  }, [isAuthenticated, syncData]);

  return {
    syncData,
    clearCache: OfflineCache.clearAll,
  };
}
