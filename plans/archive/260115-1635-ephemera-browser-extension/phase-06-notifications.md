# Phase 6: Real-time Notifications

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Depends On:** [Phase 5: Backend API](./phase-05-api-endpoints.md)
- **Research:** [Chrome MV3](./research/researcher-01-chrome-mv3.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 - High Value |
| Status | Pending |
| Effort | 2-3 days |
| Dependencies | Phase 5 complete |

Implement real-time push notifications for new emails using Web Push API with VAPID. Service worker wakes on push events even when browser is idle.

## Key Insights

- MV3 Service Workers are ephemeral - push events wake them up
- Use Web Push API (VAPID) not FCM for simpler setup
- `chrome.notifications` API for rich notifications
- Badge counter updates via `chrome.action.setBadgeText`
- Existing push infrastructure in `services/api/src/routes/push.ts`

## Requirements

### Functional
- Receive push notifications for new emails
- Show notification with sender and subject
- Click notification opens message in popup/tab
- Badge shows unread count
- User can disable notifications in settings

### Non-Functional
- < 5 second push delivery latency
- Notifications work when browser is backgrounded
- Battery-efficient (no polling)

## Architecture

```
Push Notification Flow:
┌─────────────────────────────────────────────────────────────┐
│                    Email Received                           │
│                         │                                   │
│                         ▼                                   │
│              ┌─────────────────┐                           │
│              │   SMTP Server   │                           │
│              │   (Haraka)      │                           │
│              └────────┬────────┘                           │
│                       │                                     │
│                       ▼                                     │
│              ┌─────────────────┐                           │
│              │   API Server    │                           │
│              │  Push Service   │                           │
│              └────────┬────────┘                           │
│                       │ web-push                           │
│                       ▼                                     │
│              ┌─────────────────┐                           │
│              │  Push Service   │                           │
│              │  (Google/Mozilla)│                          │
│              └────────┬────────┘                           │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Extension                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Service Worker                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │   │
│  │  │ Push Event │→ │ Parse Data │→ │ Show Notif   │  │   │
│  │  │ Handler    │  │            │  │ Update Badge │  │   │
│  │  └────────────┘  └────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Create
- `services/extension/src/background/push-handler.ts` - Push event handling
- `services/extension/src/background/notifications.ts` - Notification helpers
- `services/extension/src/utils/push-subscription.ts` - Subscription management

### Modify
- `services/extension/src/background/index.ts` - Register push handlers
- `services/extension/src/manifest.json` - Add gcm_sender_id (optional)
- `services/extension/src/stores/settings-store.ts` - Notification preferences

### Reference
- `services/api/src/routes/push.ts` - Existing push infrastructure
- `services/web/src/hooks/usePushNotifications.ts` - Web push pattern

## Implementation Steps

### Step 1: Update Manifest for Notifications (15m)

Update `src/manifest.json`:
```json
{
  "permissions": [
    "storage",
    "alarms",
    "clipboardWrite",
    "notifications"
  ],
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  }
}
```

### Step 2: Create Push Subscription Utility (1h)

Create `src/utils/push-subscription.ts`:
```typescript
import { api } from './api'

const VAPID_PUBLIC_KEY_ENDPOINT = '/push/vapid-key'
const SUBSCRIBE_ENDPOINT = '/push/subscribe'

export async function subscribeToPush(token: string): Promise<boolean> {
  try {
    // Get VAPID public key from server
    const { publicKey } = await api<{ publicKey: string }>(
      VAPID_PUBLIC_KEY_ENDPOINT,
      { token }
    )

    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return false
    }

    // Get push subscription from service worker
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })

    // Send subscription to server
    await api(SUBSCRIBE_ENDPOINT, {
      method: 'POST',
      token,
      body: {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        platform: 'extension'
      }
    })

    // Store subscription status
    await chrome.storage.local.set({ pushSubscribed: true })

    return true
  } catch (error) {
    console.error('Push subscription failed:', error)
    return false
  }
}

export async function unsubscribeFromPush(token: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // Notify server
      await api('/push/unsubscribe', {
        method: 'POST',
        token,
        body: { endpoint: subscription.endpoint }
      })
    }

    await chrome.storage.local.set({ pushSubscribed: false })
  } catch (error) {
    console.error('Unsubscribe failed:', error)
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
```

### Step 3: Create Push Handler in Service Worker (1.5h)

Create `src/background/push-handler.ts`:
```typescript
interface PushPayload {
  type: 'new_message'
  messageId: string
  inboxId: string
  from: string
  subject: string
  preview: string
  receivedAt: string
}

// Handle incoming push events
self.addEventListener('push', (event: PushEvent) => {
  console.log('Push event received')

  if (!event.data) {
    console.log('Push event has no data')
    return
  }

  const payload: PushPayload = event.data.json()

  event.waitUntil(handlePushMessage(payload))
})

async function handlePushMessage(payload: PushPayload) {
  // Check if notifications are enabled
  const { notificationsEnabled } = await chrome.storage.local.get('notificationsEnabled')
  if (notificationsEnabled === false) {
    return
  }

  // Show notification
  await showNotification(payload)

  // Update badge
  await updateBadge()
}

async function showNotification(payload: PushPayload) {
  const { from, subject, preview, messageId, inboxId } = payload

  await chrome.notifications.create(messageId, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: from || 'New Email',
    message: subject || '(no subject)',
    contextMessage: preview?.slice(0, 100),
    priority: 2,
    requireInteraction: false
  })

  // Store notification data for click handling
  await chrome.storage.session.set({
    [`notif:${messageId}`]: { messageId, inboxId }
  })
}

// Handle notification click
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Get stored notification data
  const data = await chrome.storage.session.get(`notif:${notificationId}`)
  const { messageId, inboxId } = data[`notif:${notificationId}`] || {}

  if (messageId && inboxId) {
    // Open popup or dashboard with message
    const dashboardUrl = `https://app.manhquy.click/inbox/${inboxId}?message=${messageId}`
    await chrome.tabs.create({ url: dashboardUrl })
  }

  // Clear notification
  chrome.notifications.clear(notificationId)
})

// Handle notification close
chrome.notifications.onClosed.addListener(async (notificationId) => {
  await chrome.storage.session.remove(`notif:${notificationId}`)
})

export async function updateBadge() {
  try {
    const { token } = await chrome.storage.local.get('token')
    if (!token) {
      chrome.action.setBadgeText({ text: '' })
      return
    }

    // Fetch unread count
    const response = await fetch('https://api.manhquy.click/extension/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.ok) {
      const { totalUnread } = await response.json()

      if (totalUnread > 0) {
        chrome.action.setBadgeText({ text: totalUnread > 99 ? '99+' : String(totalUnread) })
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
      } else {
        chrome.action.setBadgeText({ text: '' })
      }
    }
  } catch (error) {
    console.error('Badge update failed:', error)
  }
}
```

### Step 4: Register Push Handlers in Service Worker (30m)

Update `src/background/index.ts`:
```typescript
import './push-handler'
import { updateBadge } from './push-handler'

console.log('Ephemera extension loaded')

// Update badge on startup
chrome.runtime.onStartup.addListener(() => {
  updateBadge()
})

// Update badge when installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason)
  updateBadge()
})

// Periodic badge update (every 5 minutes)
chrome.alarms.create('updateBadge', { periodInMinutes: 5 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateBadge') {
    updateBadge()
  }
})

// Handle messages from popup/content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    updateBadge().then(() => sendResponse({ success: true }))
    return true
  }

  if (message.type === 'GET_INBOXES') {
    handleGetInboxes().then(sendResponse)
    return true
  }

  if (message.type === 'CREATE_INBOX') {
    handleCreateInbox().then(sendResponse)
    return true
  }
})

// ... existing handlers
```

### Step 5: Add Notification Settings UI (1h)

Update `src/popup/views/settings-view.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { subscribeToPush, unsubscribeFromPush } from '../../utils/push-subscription'
import { useAuthStore } from '../../stores/auth-store'

export function NotificationSettings() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const { token } = useAuthStore()

  useEffect(() => {
    chrome.storage.local.get('pushSubscribed').then((result) => {
      setEnabled(result.pushSubscribed || false)
    })
  }, [])

  const toggleNotifications = async () => {
    if (!token) return

    setLoading(true)
    try {
      if (enabled) {
        await unsubscribeFromPush(token)
        setEnabled(false)
      } else {
        const success = await subscribeToPush(token)
        setEnabled(success)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleNotifications}
      disabled={loading}
      className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg"
    >
      {enabled ? (
        <Bell className="w-5 h-5 text-green-400" />
      ) : (
        <BellOff className="w-5 h-5 text-slate-400" />
      )}
      <span>{enabled ? 'Notifications On' : 'Notifications Off'}</span>
      {loading && <span className="ml-auto animate-spin">⟳</span>}
    </button>
  )
}
```

### Step 6: Backend Push Trigger (30m)

Ensure `services/api` triggers push on new message. Update message handler:
```typescript
// services/api/src/services/email-processor.ts
import { sendPushNotification } from './push-service'

async function onNewMessage(message: Message, inbox: Inbox) {
  // ... existing logic

  // Send push notification if user has subscription
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: inbox.userId, platform: 'extension' }
  })

  for (const sub of subscriptions) {
    await sendPushNotification(sub.subscription, {
      type: 'new_message',
      messageId: message.id,
      inboxId: inbox.id,
      from: message.fromAddress,
      subject: message.subject,
      preview: message.textBody?.slice(0, 100),
      receivedAt: message.receivedAt.toISOString()
    })
  }
}
```

## Todo List

- [ ] Update manifest with notifications permission
- [ ] Create push subscription utility
- [ ] Create push handler in service worker
- [ ] Implement notification display with chrome.notifications
- [ ] Implement badge counter updates
- [ ] Add notification click handling
- [ ] Create notification settings UI
- [ ] Ensure backend triggers push on new message
- [ ] Add periodic badge refresh via alarms
- [ ] Test push delivery latency
- [ ] Test notification click opens correct message

## Success Criteria

- [ ] Notifications appear within 5 seconds of email arrival
- [ ] Notification shows sender and subject
- [ ] Clicking notification opens message
- [ ] Badge shows correct unread count
- [ ] User can enable/disable notifications
- [ ] Works when browser is backgrounded

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Push service downtime | Low | Medium | Fallback to polling badge update |
| Notification permission denied | Medium | Medium | Clear UX explaining benefits |
| Battery drain from polling | Low | Low | Use alarms API, 5-min intervals |
| Service worker killed | Low | Low | Push events wake it up |

## Security Considerations

- Push subscription stored server-side securely
- No sensitive email content in push payload
- VAPID keys rotated periodically
- Subscription cleanup on logout

## Next Steps

→ [Phase 7: Store Submission](./phase-07-store-submission.md)
