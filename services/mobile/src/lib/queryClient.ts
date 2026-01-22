import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Query client with offline-first configuration */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache
      retry: 2,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
});

/** AsyncStorage persister for query cache */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ephemera-query-cache',
  throttleTime: 1000,
});
