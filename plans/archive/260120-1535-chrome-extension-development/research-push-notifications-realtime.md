# Research Report: Chrome Extension Push Notifications & Real-time Features

## Executive Summary
For the email platform extension, **Web Push API** is the recommended primary mechanism for new email alerts due to battery efficiency and ability to wake the service worker. **WebSockets** should be reserved for active sessions requiring sub-second latency (e.g., instant chat). **Background Sync** provides robust offline capability for queuing actions like sending emails.

## Research Methodology
- **Sources consulted:** 5 (Google Developers, OpenReplay, MDN, various tech blogs)
- **Date range:** Current (2024-2025 focus)
- **Key search terms:** Web Push API VAPID, Chrome extension real-time updates, background sync, badge UX

## Key Findings

### 1. Push Notification Implementation
Modern Chrome extensions (MV3) use the standard Web Push API via Service Workers.

**Architecture:**
1.  **Client (Extension):** Registers Service Worker -> Subscribes via `registration.pushManager.subscribe` (requires VAPID public key) -> Sends subscription object to backend.
2.  **Backend:** Stores subscription -> Uses VAPID private key to sign payload -> Sends to Push Service (e.g., FCM for Chrome).
3.  **Service Worker:** Listens for `push` event -> Displays notification or updates storage.

**VAPID (Voluntary Application Server Identification):**
-   **Mandatory:** Required by Chrome/Safari.
-   **Keys:** Generate specific VAPID key pair. Public key is exposed to client; private key signs server requests.
-   **Security:** Prevents unauthorized push messages.

### 2. Real-time Strategy Comparison

| Feature | Web Push API | WebSocket | Polling (Legacy) |
| :--- | :--- | :--- | :--- |
| **Latency** | Medium (Seconds) | Low (Milliseconds) | High (Interval dependent) |
| **Battery Impact** | Low (Wake on demand) | High (Constant connection) | Medium/High |
| **Connectivity** | Resilient (Service Worker) | Active Session Only | Fragile |
| **Complexity** | High (VAPID, Keys) | Medium | Low |
| **Use Case** | Email alerts, Updates | Chat, Live editing | Fallback only |

**Recommendation:** Use **Web Push** for "You have new mail" alerts. Use **WebSocket** only if implementing an active chat interface within the popup.

### 3. UX Best Practices
**Badges (`chrome.action.setBadgeText`):**
-   **Length:** Max 4 characters (e.g., "99+", not "1000").
-   **Context:** Use distinct colors (Red for urgent, Blue for info).
-   **Behavior:** Clear badge immediately upon user interaction.
-   **Automation:** Don't rely on OS notification history; badges are persistent status indicators.

**Notifications (`chrome.notifications` or Service Worker `showNotification`):**
-   **Actionable:** Include buttons (e.g., "Reply", "Archive").
-   **Grouping:** Collapse multiple emails into one summary notification to avoid spamming.
-   **Silence:** Respect system "Do Not Disturb" modes.

### 4. Offline & Background Capabilities
**Background Sync API:**
-   **Purpose:** Defer actions (e.g., sending an email) when offline.
-   **Mechanism:** `sw.sync.register('send-email')`. Browser retries automatically with exponential backoff when connectivity restores.
-   **Workbox:** Google's library simplifies this with `WorkboxBackgroundSync`.

## Implementation Recommendations

### Quick Start: Web Push
```javascript
// service-worker.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: 'icons/icon-128.png'
  });
  // Update badge
  chrome.action.setBadgeText({ text: '1' });
});

// Logic to subscribe (popup or options)
async function subscribeUser() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  // Send sub to backend...
}
```

### Common Pitfalls
-   **VAPID Encoding:** Must convert VAPID public key string to `Uint8Array` before subscription.
-   **Service Worker Sleeping:** SW kills WS connections. Web Push is required to wake it up.
-   **Permission Denied:** Always check `Notification.permission` before subscribing.

## Resources
-   [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
-   [Chrome Extension Notifications](https://developer.chrome.com/docs/extensions/reference/notifications/)
-   [Workbox Background Sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync/)

## Unresolved Questions
-   Specific limits on push payload size for current Chrome version (usually 4KB).
-   Exact retention period for Background Sync tasks in Chrome MV3.
