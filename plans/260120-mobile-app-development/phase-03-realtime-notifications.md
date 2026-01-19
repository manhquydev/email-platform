# Phase 7.1.3: Real-time & Notifications

**Duration:** 2 weeks
**Status:** Planned
**Prerequisites:** Phase 7.1.2 Core Features Complete

---

## Overview

Implement push notifications (FCM/APNs), SSE real-time updates, background fetch, and notification badges.

---

## Week 6: Push Notifications

### Day 32-33: Expo Notifications Setup

```typescript
// src/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '@/api/client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  // Android: Configure notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('emails', {
      name: 'Email Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
    });
  }

  return token.data;
}

export async function subscribeToPush(token: string): Promise<void> {
  await api.request('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName,
    }),
  });
}

export async function unsubscribeFromPush(token: string): Promise<void> {
  await api.request('/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
```

### Tasks
- [ ] Configure `expo-notifications`
- [ ] Request notification permissions
- [ ] Get Expo Push Token
- [ ] Configure Android notification channel
- [ ] Create subscribe/unsubscribe API calls

### Day 34-35: Notification Handlers

```typescript
// src/hooks/useNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { registerForPushNotifications, subscribeToPush } from '@/utils/notifications';
import { useAuthStore } from '@/store/authStore';

export function useNotifications() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        subscribeToPush(token);
      }
    });

    // Handle notification received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;

        // Invalidate queries to refresh data
        if (data.type === 'email.received') {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['inboxes'] });
        }
      }
    );

    // Handle notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        // Navigate to relevant screen
        if (data.type === 'email.received' && data.messageId) {
          router.push(`/message/${data.messageId}`);
        } else if (data.inboxId) {
          router.push(`/inbox/${data.inboxId}`);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);
}
```

```typescript
// app/_layout.tsx - Add to root layout
import { useNotifications } from '@/hooks/useNotifications';

export default function RootLayout() {
  useNotifications(); // Initialize notification handlers

  // ... rest of layout
}
```

### Tasks
- [ ] Create `useNotifications` hook
- [ ] Handle foreground notifications
- [ ] Handle notification tap → deep link
- [ ] Invalidate queries on new email
- [ ] Add to root layout

### Day 36-37: Backend Push Integration

```typescript
// services/api/src/routes/push.ts - Verify existing endpoint
// Mobile sends: { token, platform, deviceName }

// Expected notification payload from backend:
interface PushPayload {
  to: string; // Expo push token
  title: string;
  body: string;
  data: {
    type: 'email.received' | 'email.deleted';
    messageId?: string;
    inboxId?: string;
    subject?: string;
  };
  badge?: number;
  sound?: 'default';
}
```

```typescript
// src/api/push.ts
import { api } from './client';

export const pushApi = {
  subscribe: (token: string, platform: string, deviceName?: string) =>
    api.request('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ token, platform, deviceName }),
    }),

  unsubscribe: (token: string) =>
    api.request('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  getSubscriptions: () =>
    api.request<{ subscriptions: PushSubscription[] }>('/push/subscriptions'),
};
```

### Tasks
- [ ] Verify `/push/subscribe` endpoint exists
- [ ] Verify `/push/unsubscribe` endpoint exists
- [ ] Test push notification delivery
- [ ] Handle token refresh

---

## Week 7: SSE Real-time & Background

### Day 38-40: SSE Connection

```typescript
// src/utils/sse.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

interface SSEEvent {
  type: 'email.received' | 'email.read' | 'email.deleted' | 'connected' | 'heartbeat';
  data: {
    messageId?: string;
    inboxId?: string;
    isRead?: boolean;
  };
}

export function useSSE() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(async () => {
    if (!isAuthenticated) return;

    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE}/realtime/sse?token=${token}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        handleSSEEvent(data);
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    eventSourceRef.current = eventSource;
  }, [isAuthenticated]);

  const handleSSEEvent = (event: SSEEvent) => {
    switch (event.type) {
      case 'email.received':
        queryClient.invalidateQueries({ queryKey: ['messages', event.data.inboxId] });
        queryClient.invalidateQueries({ queryKey: ['inboxes'] });
        break;

      case 'email.read':
        queryClient.invalidateQueries({ queryKey: ['message', event.data.messageId] });
        break;

      case 'email.deleted':
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        break;

      case 'heartbeat':
        // Keep connection alive
        break;
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        connect();
      } else if (nextState === 'background') {
        eventSourceRef.current?.close();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Initial connection
  useEffect(() => {
    connect();
  }, [connect]);
}
```

### Tasks
- [ ] Create SSE connection with auth token
- [ ] Parse SSE events and invalidate queries
- [ ] Handle connection errors with reconnect
- [ ] Pause SSE when app is backgrounded
- [ ] Resume SSE when app is foregrounded

### Day 41-42: Background Fetch

```typescript
// src/utils/backgroundFetch.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { api } from '@/api/client';

const BACKGROUND_FETCH_TASK = 'background-email-fetch';

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Initialize API client
    await api.init();

    // Fetch unread count
    const result = await api.request<{ unreadCount: number }>('/messages/unread-count');

    // Update badge
    await Notifications.setBadgeCountAsync(result.unreadCount);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetch(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();

  if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export async function unregisterBackgroundFetch(): Promise<void> {
  await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}
```

```typescript
// app/_layout.tsx - Register on app start
import { registerBackgroundFetch } from '@/utils/backgroundFetch';

useEffect(() => {
  registerBackgroundFetch();
}, []);
```

### Tasks
- [ ] Define background fetch task
- [ ] Register task on app start
- [ ] Fetch unread count in background
- [ ] Update app badge count
- [ ] Handle task failure gracefully

### Day 43-44: Notification Badge & Settings

```typescript
// src/store/notificationStore.ts
import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
}

interface NotificationState {
  unreadCount: number;
  settings: NotificationSettings;
  setUnreadCount: (count: number) => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  loadSettings: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  settings: {
    pushEnabled: true,
    soundEnabled: true,
    badgeEnabled: true,
  },

  setUnreadCount: async (count) => {
    set({ unreadCount: count });
    if (get().settings.badgeEnabled) {
      await Notifications.setBadgeCountAsync(count);
    }
  },

  updateSettings: async (newSettings) => {
    const settings = { ...get().settings, ...newSettings };
    set({ settings });
    await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));

    // Update badge visibility
    if (!settings.badgeEnabled) {
      await Notifications.setBadgeCountAsync(0);
    }
  },

  loadSettings: async () => {
    const stored = await AsyncStorage.getItem('notification_settings');
    if (stored) {
      set({ settings: JSON.parse(stored) });
    }
  },
}));
```

```typescript
// app/(tabs)/settings.tsx - Notification settings section
import { View, Text, Switch } from 'react-native';
import { useNotificationStore } from '@/store/notificationStore';

function NotificationSettings() {
  const { settings, updateSettings } = useNotificationStore();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Thông báo</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Nhận thông báo đẩy</Text>
        <Switch
          value={settings.pushEnabled}
          onValueChange={(value) => updateSettings({ pushEnabled: value })}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Âm thanh</Text>
        <Switch
          value={settings.soundEnabled}
          onValueChange={(value) => updateSettings({ soundEnabled: value })}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Hiển thị badge</Text>
        <Switch
          value={settings.badgeEnabled}
          onValueChange={(value) => updateSettings({ badgeEnabled: value })}
        />
      </View>
    </View>
  );
}
```

### Tasks
- [ ] Create notification settings store
- [ ] Persist settings to AsyncStorage
- [ ] Add settings UI in Settings tab
- [ ] Update badge count from API
- [ ] Clear badge when entering inbox

### Day 45: Testing & Polish

### Tasks
- [ ] Test push notifications on iOS device
- [ ] Test push notifications on Android device
- [ ] Test SSE reconnection
- [ ] Test background fetch
- [ ] Test notification deep links
- [ ] Verify badge count updates
- [ ] Handle notification permissions denied

---

## Deliverables

| Deliverable | Status |
|-------------|--------|
| Push notification registration | ⬜ |
| Push notification handlers | ⬜ |
| SSE real-time connection | ⬜ |
| Background fetch task | ⬜ |
| Notification badge updates | ⬜ |
| Notification settings UI | ⬜ |

---

## Success Criteria

- [ ] User receives push when new email arrives
- [ ] Tapping notification opens correct message
- [ ] Real-time updates via SSE when app is open
- [ ] SSE reconnects after network issues
- [ ] Badge shows unread count
- [ ] Background fetch updates badge
- [ ] User can toggle notification settings

---

## Files to Create

```
src/
├── utils/
│   ├── notifications.ts
│   ├── sse.ts
│   └── backgroundFetch.ts
├── hooks/
│   ├── useNotifications.ts
│   └── useSSE.ts
├── store/
│   └── notificationStore.ts
└── api/
    └── push.ts
```

---

## Environment Variables

```env
# app.json - eas.json config needed for push
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

---

## Backend Requirements

Verify these endpoints exist:
- `POST /push/subscribe` - Register push token
- `POST /push/unsubscribe` - Remove push token
- `GET /realtime/sse` - SSE event stream
- `GET /messages/unread-count` - Unread message count

---

## Next Phase

After Real-time & Notifications, proceed to **Phase 7.1.4: Offline & Polish** (2 weeks):
- SQLite local database (WatermelonDB)
- Offline message caching
- Optimistic UI updates
- Dark mode support
