# Phase 04: Browser Push Notifications

## Context

- **Plan**: [plan.md](./plan.md)
- **Previous**: [Phase 03 - SSE Fallback](./phase-03-sse-fallback.md)
- **Next**: [Phase 05 - Frontend Integration](./phase-05-frontend-integration.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P2 |
| Status | pending |
| Effort | 4h |
| Description | Implement Web Push API for notifications when browser tab is closed |

## Requirements

1. Generate and store VAPID keys for Web Push
2. Add PushSubscription model to Prisma schema
3. Create API routes for subscription management
4. Create Service Worker for push handling
5. Integrate with worker.ts to send push on new email
6. Use `vite-plugin-pwa` for Service Worker management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                 │
│  ┌─────────────────┐    ┌──────────────────────────────────┐   │
│  │  React App      │    │  Service Worker (sw.js)          │   │
│  │  - Subscribe    │    │  - self.addEventListener('push') │   │
│  │  - Unsubscribe  │    │  - Show notification             │   │
│  └────────┬────────┘    └──────────────────────────────────┘   │
│           │                              ▲                      │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
            ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│                         API Server                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /push/subscribe    - Save PushSubscription        │   │
│  │  DELETE /push/subscribe  - Remove subscription          │   │
│  │  GET /push/vapid-key     - Get public VAPID key         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PushNotificationService                                │   │
│  │  - sendToUser(userId, payload)                          │───┘
│  │  - Uses web-push library                                │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

## Related Files

| File | Action |
|------|--------|
| `services/api/prisma/schema.prisma` | **MODIFY** - Add PushSubscription model |
| `services/api/src/services/push-notification.ts` | **CREATE** - Push service |
| `services/api/src/routes/push.ts` | **CREATE** - Push API routes |
| `services/api/src/worker.ts` | **MODIFY** - Send push on email.new |
| `services/web/vite.config.ts` | **MODIFY** - Add vite-plugin-pwa |
| `services/web/src/sw.ts` | **CREATE** - Service Worker |
| `services/web/src/utils/push-subscription.ts` | **CREATE** - Client helpers |

## Implementation Steps

### Step 1: Add Prisma Model

**File**: `services/api/prisma/schema.prisma`

Add after existing models:

```prisma
model PushSubscription {
  id        String   @id @default(uuid())
  userId    String
  endpoint  String   @unique
  p256dh    String   // Public key
  auth      String   // Auth secret
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

Run migration:
```bash
cd services/api
npx prisma migrate dev --name add_push_subscription
```

### Step 2: Generate VAPID Keys

Add to `.env`:
```bash
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

### Step 3: Create Push Notification Service

**File**: `services/api/src/services/push-notification.ts`

```typescript
import webpush from 'web-push';
import { prisma } from '../lib/prisma';
import { appConfig } from '../config';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

class PushNotificationService {
  private initialized = false;

  init(): void {
    if (this.initialized) return;

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('[PushNotification] VAPID keys not configured, push disabled');
      return;
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    this.initialized = true;
    console.log('[PushNotification] Service initialized');
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.initialized) return;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload,
            {
              TTL: 60 * 60, // 1 hour
              urgency: 'normal',
            }
          );
        } catch (err: any) {
          // Remove invalid subscriptions (410 Gone, 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
            console.log(`[PushNotification] Removed invalid subscription ${sub.id}`);
          } else {
            throw err;
          }
        }
      })
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`[PushNotification] ${failed.length}/${subscriptions.length} failed`);
    }
  }

  async sendEmailNotification(
    userId: string,
    email: { from: string | null; subject: string | null; inboxId: string }
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: email.from || 'New Email',
      body: email.subject || 'You have a new email',
      icon: '/icons/email-192.png',
      badge: '/favicon.svg',
      tag: `email-${email.inboxId}`,
      data: {
        type: 'email.new',
        inboxId: email.inboxId,
        url: `/dashboard?inboxId=${email.inboxId}`,
      },
    });
  }

  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}

export const pushNotification = new PushNotificationService();
```

### Step 4: Create Push API Routes

**File**: `services/api/src/routes/push.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { pushNotification } from '../services/push-notification';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const pushRoutes: FastifyPluginAsync = async (app) => {
  // Get VAPID public key
  app.get('/push/vapid-key', async (request, reply) => {
    const key = pushNotification.getVapidPublicKey();
    if (!key) {
      return reply.status(503).send({ error: 'Push notifications not configured' });
    }
    return { vapidPublicKey: key };
  });

  // Subscribe to push notifications
  app.post('/push/subscribe', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const body = subscribeSchema.parse(request.body);
    const userId = (request as any).user.userId;

    // Upsert subscription (same endpoint = update keys)
    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: request.headers['user-agent'],
      },
      update: {
        userId,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: request.headers['user-agent'],
      },
    });

    return { success: true };
  });

  // Unsubscribe from push notifications
  app.delete('/push/subscribe', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const body = z.object({ endpoint: z.string().url() }).parse(request.body);
    const userId = (request as any).user.userId;

    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint: body.endpoint,
      },
    });

    return { success: true };
  });

  // Get current subscriptions (for debugging)
  app.get('/push/subscriptions', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const userId = (request as any).user.userId;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return { subscriptions };
  });
};

export default pushRoutes;
```

### Step 5: Register Routes and Initialize Service

**File**: `services/api/src/server.ts`

```typescript
import pushRoutes from './routes/push';
import { pushNotification } from './services/push-notification';

// In buildServer(), register route:
app.register(pushRoutes);

// In startHttpServer(), after app.listen():
pushNotification.init();
```

### Step 6: Update Worker to Send Push

**File**: `services/api/src/worker.ts`

Add import:
```typescript
import { pushNotification } from './services/push-notification';
```

Add after realtime event publishing (around line ~350):
```typescript
// Send browser push notification
try {
    if (messageWithRelations?.inbox?.ownerId) {
        await pushNotification.sendEmailNotification(
            messageWithRelations.inbox.ownerId,
            {
                from: fromAddress ?? null,
                subject: message.subject ?? null,
                inboxId: inbox.id,
            }
        );
        logger.info({ messageId: message.id }, 'sent browser push notification');
    }
} catch (pushErr) {
    logger.warn({ err: pushErr }, 'failed to send push notification');
}
```

### Step 7: Frontend - Install vite-plugin-pwa

```bash
cd services/web
npm install vite-plugin-pwa workbox-window -D
```

### Step 8: Configure Vite for PWA

**File**: `services/web/vite.config.ts`

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Ephemera Email',
        short_name: 'Ephemera',
        description: 'Disposable email platform',
        theme_color: '#7C3AED',
        background_color: '#1A2340',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
```

### Step 9: Create Service Worker

**File**: `services/web/src/sw.ts`

```typescript
/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Precache assets
precacheAndRoute(self.__WB_MANIFEST);

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/favicon.svg',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag,
      data: payload.data,
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  } catch (err) {
    console.error('[SW] Push parse error:', err);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(url);
      })
  );
});

// Skip waiting on update
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### Step 10: Create Push Subscription Helper

**File**: `services/web/src/utils/push-subscription.ts`

```typescript
import { api } from './api';

export async function subscribeToPush(token: string): Promise<boolean> {
  try {
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    // Get VAPID key
    const { vapidPublicKey } = await api<{ vapidPublicKey: string }>('/push/vapid-key', { token });

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      // Subscribe
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Send to server
    await api('/push/subscribe', {
      method: 'POST',
      token,
      body: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      },
    });

    console.log('Push subscription successful');
    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

export async function unsubscribeFromPush(token: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api('/push/subscribe', {
        method: 'DELETE',
        token,
        body: { endpoint: subscription.endpoint },
      });
      await subscription.unsubscribe();
    }

    return true;
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
```

## Todo List

- [ ] Add PushSubscription model to Prisma schema
- [ ] Run prisma migrate
- [ ] Generate and configure VAPID keys in .env
- [ ] Create `services/push-notification.ts`
- [ ] Create `routes/push.ts` with subscribe/unsubscribe endpoints
- [ ] Register push routes in server.ts
- [ ] Initialize push service on server start
- [ ] Update worker.ts to send push notifications
- [ ] Install vite-plugin-pwa in frontend
- [ ] Configure vite.config.ts for PWA
- [ ] Create Service Worker (sw.ts)
- [ ] Create push subscription helper utility
- [ ] Add notification icons (192x192, 512x512)
- [ ] Test push flow end-to-end

## Success Criteria

- [ ] VAPID keys configured and service initializes
- [ ] PushSubscription saved to database on subscribe
- [ ] Push notification received when new email arrives
- [ ] Notification click opens correct inbox
- [ ] Unsubscribe removes subscription from database
- [ ] Invalid subscriptions cleaned up automatically
- [ ] Works in Chrome, Firefox, Edge

## Security Considerations

- VAPID private key must be kept secret
- Only authenticated users can subscribe
- Subscription endpoint validated as URL
- User can only manage their own subscriptions
- Push payload should not contain sensitive data
- TTL set to prevent stale notifications

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Permission denied | High | Medium | Clear explanation UI |
| Browser not supported | Low | Low | Feature detection |
| Service Worker cache issues | Medium | Medium | Version sw.js, skipWaiting |
| Push service outage | Low | Low | Graceful degradation |

## Browser Support

| Browser | Push Support |
|---------|-------------|
| Chrome | Yes (desktop + mobile) |
| Firefox | Yes (desktop) |
| Edge | Yes (desktop) |
| Safari | Yes (macOS 13+, iOS 16.4+) |
| Opera | Yes |
