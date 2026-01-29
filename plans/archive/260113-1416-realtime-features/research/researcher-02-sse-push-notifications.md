# Research: Real-time Features (SSE & Push Notifications)

**Date:** 2026-01-13
**Context:** Fastify 5.6, React 19, Node.js
**Objective:** Implement real-time updates (SSE) and offline alerts (Web Push).

## 1. Server-Sent Events (SSE)

SSE is chosen for "online" real-time updates (new emails, folder counts) as it is lighter than WebSockets and natively supports reconnection.

### Implementation in Fastify
- **Recommended Plugin:** `@fastify/sse` (Core maintained, Fastify 5 compatible).
- **Alternative:** `fastify-sse-v2` (Good, but `@fastify/sse` offers better integration with Fastify's native lifecycle).
- **Compression Warning:** Gzip/Brotli compression often breaks SSE streams in browsers. **Disable compression** specifically for SSE routes.

### Reliability (Event ID & Reconnection)
SSE has built-in reconnection. If the connection drops, the browser automatically attempts to reconnect and sends the `Last-Event-ID` header.
- **Server-side:** Use `reply.sse.lastEventId` to retrieve the ID.
- **Recovery:** Implement a buffer or database lookup to replay missed events based on this ID.

### Code Snippet: Fastify SSE Route
```typescript
import FastifySSE from '@fastify/sse';

// Register plugin
fastify.register(FastifySSE);

fastify.get('/api/events', async (req, reply) => {
  // Disable compression for this route
  reply.raw.setHeader('x-no-compression', '1');

  // Handle Last-Event-ID for recovery
  const lastId = reply.sse.lastEventId;
  if (lastId) {
    // Logic to fetch missed events from DB/Redis since lastId
    // await sendMissedEvents(lastId, reply);
  }

  // Send initial state
  reply.sse({ id: String(Date.now()), event: 'connected', data: 'ready' });

  // Subscribe to internal event bus (e.g., node:events or Redis)
  const onNewEmail = (email) => {
    reply.sse({
      id: email.id,
      event: 'new-email',
      data: JSON.stringify(email)
    });
  };

  // Cleanup on close
  req.raw.on('close', () => removeListener(onNewEmail));
});
```

## 2. Browser Push Notifications

Used for "offline" or background notifications when the tab is closed.

### Key Components
1.  **VAPID Keys:** Public/Private key pair to identify your server to push services (FCM, APNs).
2.  **`web-push` Package:** Node.js library to handle encryption and sending.
3.  **Service Worker:** Required to receive `push` events in the background.

### Frontend Setup (Vite + React)
Use `vite-plugin-pwa` with `injectManifest` strategy to control the Service Worker logic.

**`vite.config.ts`:**
```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts', // Custom SW logic
  injectRegister: 'auto'
})
```

**`src/sw.ts` (Service Worker):**
```typescript
// Listen for push events
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'New Email', {
      body: data.body,
      icon: '/pwa-192x192.png',
      data: { url: data.url } // Open this URL on click
    })
  );
});

// Handle click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
```

### Backend Setup (Node.js)
1.  **Generate Keys:** `npx web-push generate-vapid-keys`
2.  **Store Subscriptions:**
    Create a Postgres table `push_subscriptions`:
    - `id` (PK)
    - `user_id` (FK)
    - `endpoint` (Text, Unique)
    - `p256dh` (Text)
    - `auth` (Text)
    - `user_agent` (Text, optional for debugging)

**Sending Notification:**
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ... inside a route/job
await webpush.sendNotification(subscriptionFromDb, JSON.stringify({
  title: 'New Email from Boss',
  body: 'Please reply ASAP',
  url: '/inbox/123'
}));
```

## 3. Security & UX

### Security
-   **VAPID Private Key:** NEVER expose client-side. Store in `.env`.
-   **Payload Encryption:** `web-push` handles this automatically.
-   **User validation:** Only send notifications to subscriptions belonging to the authenticated `user_id`.

### UX Patterns
-   **No "Load-time" Prompts:** Do not ask for permission immediately on page load. Browser auto-blockers will hide it.
-   **User-Triggered:** Add a "Enable Notifications" button in Settings or a transient "toast" after a positive interaction.
-   **Double Permission:**
    1.  UI Switch: "Turn on Notifications"
    2.  If clicked -> `Notification.requestPermission()`

## 4. Browser Compatibility
-   **SSE:** Supported in all modern browsers (Chrome, Firefox, Safari, Edge).
-   **Push API:**
    -   **Desktop:** Chrome, Firefox, Edge, Safari (macOS).
    -   **iOS (iPhone):** Supported in iOS 16.4+ **ONLY** if the app is "Installed to Home Screen" (PWA). Safari Mobile in generic tabs does *not* support Push API yet.

## 5. Unresolved Questions
-   **iOS Constraints:** Do we strictly require iOS push for non-installed (browser tab) users? (Currently not possible).
-   **SSE Connection Limits:** HTTP/1.1 allows max 6 connections per domain. HTTP/2 removes this limit. Ensure Nginx/Fastify is configured for HTTP/2 if many tabs might be open.

## Sources
- [Fastify SSE Plugin](https://github.com/fastify/fastify-sse-v2)
- [Web Push Node.js](https://github.com/web-push-libs/web-push)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
