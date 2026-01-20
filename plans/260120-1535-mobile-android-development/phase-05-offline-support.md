# Phase 5: Offline Support

## Priority: P2 (Medium)
## Effort: 8h
## Status: pending

## Context Links
- Research: `./research-offline-first-architecture.md`
- Existing: `src/hooks/useOfflineSync.ts`, `src/utils/offlineCache.ts`

## Overview
Implement offline caching để user có thể xem emails khi không có internet, với optimistic updates cho actions.

## Approach: TanStack Query Persistence (Approach A)
Sử dụng TanStack Query v5 persistence thay vì SQLite full rebuild.

## Key Insights
- TanStack Query có built-in persistence
- AsyncStorage đủ cho MVP (giới hạn 6MB Android)
- NetInfo để detect connectivity
- Optimistic updates cho better UX

## Requirements

### Functional
- View cached inbox/messages offline
- Queue delete/mark-read actions
- Sync when connection restored
- Show offline indicator

### Non-functional
- Cache survives app restart
- < 200ms cache read

## Architecture

```
UI → TanStack Query Cache → AsyncStorage Persister
                ↓
         Network Request (if online)
                ↓
         Update Cache → Re-render UI
```

## Implementation Steps

### 5.1 Setup Query Persistence (2h)

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ephemera-query-cache',
});
```

```typescript
// app/_layout.tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <RootLayoutNav />
    </PersistQueryClientProvider>
  );
}
```

### 5.2 Network Connectivity (1h)
```typescript
// src/hooks/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

export function setupNetworkListener() {
  onlineManager.setEventListener(setOnline => {
    return NetInfo.addEventListener(state => {
      setOnline(!!state.isConnected);
    });
  });
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
  }, []);

  return isOnline;
}
```

### 5.3 Offline Indicator UI (1h)
```typescript
// src/components/OfflineBanner.tsx
export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={16} color="#FFF" />
      <Text style={styles.text}>Chế độ offline</Text>
    </View>
  );
}
```

### 5.4 Optimistic Updates (2h)
```typescript
// src/hooks/useOptimisticUpdates.ts
export function useOptimisticDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => messagesApi.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['messages'] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['messages']);

      // Optimistically update
      queryClient.setQueryData(['messages'], (old: any) => ({
        ...old,
        data: old.data.filter((m: Message) => m.id !== id),
      }));

      return { previous };
    },
    onError: (err, id, context) => {
      // Rollback on error
      queryClient.setQueryData(['messages'], context?.previous);
      Toast.show({ type: 'error', text1: 'Lỗi xóa email' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
```

### 5.5 Mutation Queue (1h)
```typescript
// TanStack Query handles this automatically with networkMode: 'offlineFirst'
// Mutations are paused when offline and resumed when online

// Optional: Show pending mutations
export function usePendingMutations() {
  const mutationCache = useQueryClient().getMutationCache();
  const pending = mutationCache.getAll().filter(m => m.state.status === 'pending');
  return pending.length;
}
```

### 5.6 Background Sync (1h)
```typescript
// src/utils/backgroundFetch.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    // Fetch latest messages
    await queryClient.prefetchQuery({
      queryKey: ['inboxes'],
      queryFn: () => inboxesApi.list(),
    });
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 60 * 15, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

## Todo List
- [ ] Setup TanStack Query persistence
- [ ] Add PersistQueryClientProvider
- [ ] Implement network status hook
- [ ] Create OfflineBanner component
- [ ] Add optimistic delete/mark-read
- [ ] Register background sync task
- [ ] Test offline scenarios

## Success Criteria
- [ ] Inbox loads from cache when offline
- [ ] Delete/mark-read queued offline
- [ ] Actions sync when online
- [ ] Offline indicator visible

## Files to Create/Modify
- `src/lib/queryClient.ts` (new)
- `app/_layout.tsx` (modify)
- `src/hooks/useNetworkStatus.ts` (new)
- `src/hooks/useOptimisticUpdates.ts` (modify)
- `src/components/OfflineBanner.tsx` (new)
- `src/utils/backgroundFetch.ts` (modify)
