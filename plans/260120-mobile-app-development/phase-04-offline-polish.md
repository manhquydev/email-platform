# Phase 7.1.4: Offline & Polish

**Duration:** 2 weeks
**Status:** Planned
**Prerequisites:** Phase 7.1.3 Real-time & Notifications Complete

---

## Overview

Implement offline support with WatermelonDB, optimistic UI updates, dark mode, and haptic feedback for a polished user experience.

---

## Week 8: Offline Database

### Day 46-48: WatermelonDB Setup

```typescript
// src/database/index.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import { Inbox, Message, Attachment } from './models';

const adapter = new SQLiteAdapter({
  schema: mySchema,
  jsi: true, // Enable JSI for better performance
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Inbox, Message, Attachment],
});
```

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'inboxes',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'local_part', type: 'string' },
        { name: 'domain_id', type: 'string' },
        { name: 'domain_name', type: 'string' },
        { name: 'message_count', type: 'number' },
        { name: 'unread_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'messages',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'inbox_id', type: 'string', isIndexed: true },
        { name: 'from_address', type: 'string' },
        { name: 'to_address', type: 'string' },
        { name: 'subject', type: 'string' },
        { name: 'text_body', type: 'string', isOptional: true },
        { name: 'html_body', type: 'string', isOptional: true },
        { name: 'is_read', type: 'boolean' },
        { name: 'received_at', type: 'number', isIndexed: true },
        { name: 'synced_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'attachments',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'message_id', type: 'string', isIndexed: true },
        { name: 'filename', type: 'string' },
        { name: 'content_type', type: 'string' },
        { name: 'size', type: 'number' },
        { name: 'local_path', type: 'string', isOptional: true },
      ],
    }),
  ],
});
```

```typescript
// src/database/models/Message.ts
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class Message extends Model {
  static table = 'messages';

  @text('server_id') serverId!: string;
  @text('inbox_id') inboxId!: string;
  @text('from_address') fromAddress!: string;
  @text('to_address') toAddress!: string;
  @text('subject') subject!: string;
  @text('text_body') textBody?: string;
  @text('html_body') htmlBody?: string;
  @field('is_read') isRead!: boolean;
  @date('received_at') receivedAt!: Date;
  @date('synced_at') syncedAt!: Date;

  @relation('inboxes', 'inbox_id') inbox!: any;
}
```

### Tasks
- [ ] Install WatermelonDB and SQLite adapter
- [ ] Define database schema with migrations
- [ ] Create model classes (Inbox, Message, Attachment)
- [ ] Initialize database in app entry
- [ ] Add JSI for performance

### Day 49-51: Sync Engine

```typescript
// src/sync/SyncEngine.ts
import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '@/database';
import { api } from '@/api/client';
import NetInfo from '@react-native-community/netinfo';

interface SyncChanges {
  inboxes: { created: any[]; updated: any[]; deleted: string[] };
  messages: { created: any[]; updated: any[]; deleted: string[] };
}

export class SyncEngine {
  private isSyncing = false;
  private lastSyncAt: number = 0;

  async sync(): Promise<void> {
    if (this.isSyncing) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('Offline - skipping sync');
      return;
    }

    this.isSyncing = true;

    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          const response = await api.request<{
            changes: SyncChanges;
            timestamp: number;
          }>('/sync/pull', {
            method: 'POST',
            body: JSON.stringify({ lastPulledAt }),
          });

          return {
            changes: response.changes,
            timestamp: response.timestamp,
          };
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          await api.request('/sync/push', {
            method: 'POST',
            body: JSON.stringify({ changes, lastPulledAt }),
          });
        },
        migrationsEnabledAtVersion: 1,
      });

      this.lastSyncAt = Date.now();
    } finally {
      this.isSyncing = false;
    }
  }

  async fullSync(): Promise<void> {
    // Clear local data and do fresh sync
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    await this.sync();
  }
}

export const syncEngine = new SyncEngine();
```

```typescript
// src/hooks/useSync.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncEngine } from '@/sync/SyncEngine';

export function useSync() {
  const syncInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Initial sync
    syncEngine.sync();

    // Sync every 5 minutes when app is active
    syncInterval.current = setInterval(() => {
      syncEngine.sync();
    }, 5 * 60 * 1000);

    // Sync on app foreground
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        syncEngine.sync();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Sync on network reconnect
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        syncEngine.sync();
      }
    });

    return () => {
      clearInterval(syncInterval.current);
      subscription.remove();
      unsubscribeNet();
    };
  }, []);
}
```

### Tasks
- [ ] Implement WatermelonDB sync protocol
- [ ] Create pull changes API (`/sync/pull`)
- [ ] Create push changes API (`/sync/push`)
- [ ] Handle offline detection with NetInfo
- [ ] Auto-sync on foreground and network reconnect
- [ ] Add conflict resolution strategy

---

## Week 9: UI Polish

### Day 52-53: Optimistic Updates

```typescript
// src/hooks/useOptimisticUpdate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { database } from '@/database';
import type { Message } from '@/types';

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, isRead }: { messageId: string; isRead: boolean }) => {
      // Update local database immediately
      await database.write(async () => {
        const message = await database
          .get<Message>('messages')
          .find(messageId);
        await message.update((m) => {
          m.isRead = isRead;
        });
      });

      // Sync with server
      return api.request(`/messages/${messageId}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ isRead }),
      });
    },
    onMutate: async ({ messageId, isRead }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['message', messageId] });

      // Snapshot previous value
      const previousMessage = queryClient.getQueryData(['message', messageId]);

      // Optimistically update
      queryClient.setQueryData(['message', messageId], (old: any) => ({
        ...old,
        message: { ...old.message, isRead },
      }));

      return { previousMessage };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessage) {
        queryClient.setQueryData(['message', variables.messageId], context.previousMessage);
      }
    },
    onSettled: (_, __, { messageId }) => {
      queryClient.invalidateQueries({ queryKey: ['message', messageId] });
    },
  });
}
```

```typescript
// src/hooks/useDeleteMessage.ts
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      // Mark as deleted locally
      await database.write(async () => {
        const message = await database
          .get<Message>('messages')
          .find(messageId);
        await message.markAsDeleted();
      });

      return api.request(`/messages/${messageId}`, { method: 'DELETE' });
    },
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: ['messages'] });

      const previousMessages = queryClient.getQueryData(['messages']);

      queryClient.setQueryData(['messages'], (old: any) => ({
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: page.data.filter((m: Message) => m.id !== messageId),
        })),
      }));

      return { previousMessages };
    },
    onError: (err, messageId, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages'], context.previousMessages);
      }
    },
  });
}
```

### Tasks
- [ ] Implement optimistic mark as read
- [ ] Implement optimistic delete
- [ ] Add rollback on API failure
- [ ] Show pending state indicator
- [ ] Handle offline queue

### Day 54-55: Dark Mode

```typescript
// src/store/themeStore.ts
import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  colorScheme: ColorSchemeName;
  setMode: (mode: ThemeMode) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  colorScheme: Appearance.getColorScheme(),

  setMode: async (mode) => {
    set({ mode });
    await AsyncStorage.setItem('theme_mode', mode);

    if (mode === 'system') {
      set({ colorScheme: Appearance.getColorScheme() });
    } else {
      set({ colorScheme: mode });
    }
  },

  loadTheme: async () => {
    const stored = await AsyncStorage.getItem('theme_mode');
    if (stored) {
      get().setMode(stored as ThemeMode);
    }
  },
}));

// Listen to system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const store = useThemeStore.getState();
  if (store.mode === 'system') {
    useThemeStore.setState({ colorScheme });
  }
});
```

```typescript
// src/theme/colors.ts
export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  primary: '#8B5CF6',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
};

export const darkTheme = {
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  primary: '#A78BFA',
  border: '#374151',
  error: '#F87171',
  success: '#34D399',
};

export type Theme = typeof lightTheme;
```

```typescript
// src/hooks/useTheme.ts
import { useThemeStore } from '@/store/themeStore';
import { lightTheme, darkTheme, Theme } from '@/theme/colors';

export function useTheme(): Theme {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
```

```typescript
// src/components/ThemedView.tsx
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function ThemedView({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[{ backgroundColor: theme.background }, style]}
      {...props}
    />
  );
}
```

### Tasks
- [ ] Create theme store with system/light/dark modes
- [ ] Define color palettes for both themes
- [ ] Create `useTheme` hook
- [ ] Create themed base components
- [ ] Add theme toggle in Settings
- [ ] Persist theme preference

### Day 56-57: Haptic Feedback & Animations

```typescript
// src/utils/haptics.ts
import * as Haptics from 'expo-haptics';

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};
```

```typescript
// src/components/SwipeableMessage.tsx
import { Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '@/utils/haptics';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onDelete: () => void;
  onMarkRead: () => void;
}

export function SwipeableMessage({ children, onDelete, onMarkRead }: SwipeableMessageProps) {
  const renderRightActions = (progress: Animated.AnimatedInterpolation) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });

    return (
      <Animated.View style={[styles.rightActions, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            haptics.medium();
            onDelete();
          }}
        >
          <Ionicons name="trash" size={24} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
    });

    return (
      <Animated.View style={[styles.leftActions, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={styles.readButton}
          onPress={() => {
            haptics.light();
            onMarkRead();
          }}
        >
          <Ionicons name="mail-open" size={24} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') onDelete();
        if (direction === 'left') onMarkRead();
      }}
    >
      {children}
    </Swipeable>
  );
}
```

### Tasks
- [ ] Install expo-haptics
- [ ] Create haptics utility with feedback types
- [ ] Add haptics to button presses
- [ ] Implement swipeable message actions
- [ ] Add pull-to-refresh haptic
- [ ] Add success/error feedback haptics

### Day 58-59: Testing & Polish

### Tasks
- [ ] Test offline mode thoroughly
- [ ] Test sync after reconnect
- [ ] Test optimistic updates and rollback
- [ ] Test dark mode across all screens
- [ ] Verify haptic feedback timing
- [ ] Fix any visual glitches
- [ ] Performance profiling

---

## Deliverables

| Deliverable | Status |
|-------------|--------|
| WatermelonDB setup & schema | ⬜ |
| Sync engine with pull/push | ⬜ |
| Optimistic UI updates | ⬜ |
| Dark mode support | ⬜ |
| Haptic feedback | ⬜ |
| Swipeable message actions | ⬜ |

---

## Success Criteria

- [ ] App works fully offline with cached data
- [ ] Changes sync when network restored
- [ ] Optimistic updates feel instant
- [ ] Dark mode consistent across all screens
- [ ] Haptics enhance interaction feel
- [ ] Swipe actions work smoothly
- [ ] No data loss during sync

---

## Files to Create

```
src/
├── database/
│   ├── index.ts
│   ├── schema.ts
│   └── models/
│       ├── Inbox.ts
│       ├── Message.ts
│       └── Attachment.ts
├── sync/
│   └── SyncEngine.ts
├── theme/
│   └── colors.ts
├── store/
│   └── themeStore.ts
├── hooks/
│   ├── useSync.ts
│   ├── useTheme.ts
│   ├── useOptimisticUpdate.ts
│   └── useDeleteMessage.ts
├── utils/
│   └── haptics.ts
└── components/
    ├── ThemedView.tsx
    ├── ThemedText.tsx
    └── SwipeableMessage.tsx
```

---

## Backend Requirements

Create sync endpoints:
- `POST /sync/pull` - Return changes since lastPulledAt
- `POST /sync/push` - Accept local changes

---

## Next Phase

After Offline & Polish, proceed to **Phase 7.1.5: Advanced Features** (2 weeks):
- AI email summarization
- Team inbox management
- Settings & preferences
- OTP auto-copy
- Share extension
