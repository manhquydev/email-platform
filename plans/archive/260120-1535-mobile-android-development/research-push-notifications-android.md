# Research Report: Android Push Notifications (Expo + FCM)

## 1. Overview
This report outlines the implementation of push notifications for an Android email client using **Expo SDK 54**, **expo-notifications**, and **Firebase Cloud Messaging (FCM)**. The solution supports real-time alerts, background data handling, and interactive actions (e.g., "Mark as Read").

## 2. Architecture & Prerequisites

### Core Components
- **Client**: Expo/React Native app using `expo-notifications` and `expo-task-manager`.
- **Cloud Service**: Firebase Cloud Messaging (FCM) V1.
- **Server**: Backend service using Firebase Admin SDK to send notifications.

### Credentials Setup
1.  **Firebase Console**: Create project, add Android app, download `google-services.json`.
2.  **Service Account**: Generate private key (JSON) in Firebase > Project Settings > Service Accounts.
3.  **EAS Configuration**:
    - Upload `google-services.json` to project root (add to `.gitignore` but keep local for dev).
    - Run `eas credentials` → Android → Upload FCM V1 Service Account Key.

## 3. Client Implementation (Expo)

### A. Configuration (`app.json`)
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.yourcompany.emailapp"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "email_channel"
        }
      ]
    ]
  }
}
```

### B. Core Logic Setup
1.  **Permissions & Token**:
    - Request permissions on app launch.
    - Get `ExpoPushToken` (maps to FCM token under the hood).
    - **Important**: Send this token to your backend API to associate with the logged-in user.

2.  **Notification Channels (Android 8+)**:
    - **Crucial** for Android. Create channels for different types (e.g., "Emails", "Promotions").
    ```typescript
    await Notifications.setNotificationChannelAsync('email_channel', {
      name: 'New Emails',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    ```

3.  **Interactive Actions**:
    - Define categories for actions like "Delete" or "Mark Read".
    ```typescript
    await Notifications.setNotificationCategoryAsync('NEW_EMAIL', [
      { identifier: 'MARK_READ', buttonTitle: 'Mark as Read', options: { opensAppToForeground: false } },
      { identifier: 'DELETE', buttonTitle: 'Delete', options: { isDestructive: true } }
    ]);
    ```

### C. Background Handling (`expo-task-manager`)
To handle incoming data silently or process actions in background:
```typescript
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
    // Handle data payload (e.g., update local database)
    console.log('Received background notification:', data);
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
```

## 4. Server-Side Implementation (FCM V1)

Use **Firebase Admin SDK** for robust sending.

### Payload Structure
For an email app, you need a hybrid payload: **Notification** (for UI) + **Data** (for logic).

```json
{
  "message": {
    "token": "CLIENT_FCM_TOKEN",
    "notification": {
      "title": "New Email from Alice",
      "body": "Hey, checking in on the project..."
    },
    "data": {
      "emailId": "12345",
      "threadId": "thread_99",
      "action": "SYNC_INBOX"
    },
    "android": {
      "notification": {
        "channelId": "email_channel",
        "clickAction": "OPEN_EMAIL",
        "color": "#336699",
        "icon": "notification_icon",
        "tag": "email_12345" // unique tag prevents stacking duplicates
      },
      "priority": "high" // Required for background wake-up
    }
  }
}
```

## 5. Best Practices & Pitfalls

### Do's
- **Badge Management**: Use `Notifications.setBadgeCountAsync(n)` on client and send `badge` count in payload.
- **Throttling**: Implement exponential backoff on server for 429 errors from FCM.
- **Grouping**: Use `group` in Android notification payload to bundle multiple email alerts (e.g., "5 new messages").

### Don'ts
- **Sensitive Data**: Never send full email body in `data` payload (security risk). Send ID only and fetch details on client.
- **Main Thread**: Do not run heavy computation in the background task; it has a time limit (approx 30s).

## 6. Unresolved Questions
1.  Does the current backend architecture support tracking device tokens per user session?
2.  Do we need custom sounds for VIP email notifications?
3.  What is the strategy for cleaning up invalid tokens (e.g., after app uninstall)?
