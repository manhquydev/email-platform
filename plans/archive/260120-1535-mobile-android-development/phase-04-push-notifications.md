# Phase 4: Push Notifications (FCM)

## Priority: P1 (High)
## Effort: 6h
## Status: pending

## Context Links
- Research: `./research-push-notifications-android.md`
- Existing: `src/hooks/useNotifications.ts`, `src/api/push.ts`
- Backend: TBD - needs FCM integration

## Overview
Implement push notifications via Firebase Cloud Messaging for real-time email alerts on Android.

## Key Insights
- Expo SDK 54 uses FCM V1 API
- Notification channels mandatory for Android 8+
- Interactive actions (Mark Read, Delete) possible

## Prerequisites
- [ ] Firebase project created
- [ ] `google-services.json` downloaded
- [ ] FCM service account key for backend

## Requirements

### Functional
- Receive push when new email arrives
- Tap notification → open email
- Action buttons: Mark Read, Delete
- Badge count update

### Non-functional
- < 5s delivery latency
- Works when app killed

## Architecture

```
New Email → Backend → FCM API → Android System → App
                                      ↓
                              Notification Displayed
                                      ↓
                              User Action → Deep Link / Background Task
```

## Implementation Steps

### 4.1 Firebase Setup (1h)

1. Create Firebase project
2. Add Android app with package `app.ephemera.mobile`
3. Download `google-services.json` → project root
4. Generate service account key for backend

Update `app.json`:
```json
{
  "android": {
    "googleServicesFile": "./google-services.json"
  },
  "plugins": [
    ["expo-notifications", {
      "icon": "./assets/notification-icon.png",
      "color": "#8B5CF6",
      "defaultChannel": "emails"
    }]
  ]
}
```

### 4.2 Notification Channels (0.5h)
```typescript
// src/utils/notifications.ts
await Notifications.setNotificationChannelAsync('emails', {
  name: 'Email mới',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#8B5CF6',
});

await Notifications.setNotificationChannelAsync('system', {
  name: 'Thông báo hệ thống',
  importance: Notifications.AndroidImportance.DEFAULT,
});
```

### 4.3 Token Registration (1h)
```typescript
// src/hooks/useNotifications.ts
export function useNotifications() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  async function registerForPushNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    // Send to backend
    await pushApi.registerToken(token.data);
  }
}
```

### 4.4 Notification Handlers (1.5h)
```typescript
// App foreground
Notifications.addNotificationReceivedListener(notification => {
  // Show in-app toast or update badge
  notificationStore.getState().incrementUnread();
});

// User tapped notification
Notifications.addNotificationResponseReceivedListener(response => {
  const { emailId } = response.notification.request.content.data;
  router.push(`/message/${emailId}`);
});
```

### 4.5 Interactive Actions (1h)
```typescript
await Notifications.setNotificationCategoryAsync('NEW_EMAIL', [
  {
    identifier: 'MARK_READ',
    buttonTitle: 'Đánh dấu đã đọc',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'DELETE',
    buttonTitle: 'Xóa',
    options: { isDestructive: true },
  },
]);

// Handle action
Notifications.addNotificationResponseReceivedListener(response => {
  const actionId = response.actionIdentifier;
  const { emailId } = response.notification.request.content.data;

  if (actionId === 'MARK_READ') {
    messagesApi.markRead(emailId, true);
  } else if (actionId === 'DELETE') {
    messagesApi.delete(emailId);
  }
});
```

### 4.6 Backend Integration (1h)
- Add FCM Admin SDK to backend
- Create `/push/send` internal endpoint
- Trigger on new email SMTP ingest
- Store device tokens in User model

## Todo List
- [ ] Create Firebase project
- [ ] Add google-services.json
- [ ] Configure notification channels
- [ ] Implement token registration
- [ ] Add foreground/tap handlers
- [ ] Create interactive actions
- [ ] Backend FCM integration

## Success Criteria
- [ ] Push received when email arrives
- [ ] Tap opens correct email
- [ ] Actions work from notification
- [ ] Badge shows unread count

## Files to Create/Modify
- `services/mobile/app.json`
- `services/mobile/google-services.json` (new)
- `src/utils/notifications.ts`
- `src/hooks/useNotifications.ts`
- `src/api/push.ts`
- `services/api/src/services/push-notification.ts`
