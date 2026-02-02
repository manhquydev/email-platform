# Phase 1: PWA Enhancement

## Context Links
- **Parent Plan:** [plan.md](./plan.md)
- **Research:** [PWA Mobile UX Research](./research/researcher-01-pwa-mobile-ux.md)
- **Documentation:** [System Architecture](../../docs/system-architecture.md)

## Overview
**Date:** 2026-02-01
**Priority:** P1
**Effort:** 8 hours
**Status:** 🔴 Pending

Transform Ephemera web app into installable Progressive Web App with offline email access and push notifications.

## Key Insights
- **vite-plugin-pwa@1.2.0** already installed - zero-config foundation ready
- **IndexedDB** required for offline email storage (~50MB-2GB quota browser-dependent)
- **Web Push API** needs backend VAPID key setup + frontend service worker
- **iOS limitations** - no `beforeinstallprompt`, manual "Add to Home Screen" instructions needed
- **Double permission pattern** - custom prompt before browser native prompt (UX best practice)

## Requirements

### Functional
1. Service worker caches app shell (JS/CSS/HTML) for instant offline load
2. IndexedDB stores last 100 emails for offline reading
3. Push notifications alert users of new emails when app closed
4. Install prompt appears after user receives first email (not on first visit)
5. Offline fallback UI shows cached emails + "No connection" banner
6. Background sync queues outbound emails sent while offline

### Non-Functional
- Lighthouse PWA score ≥90
- Service worker registers only in production (not dev)
- Cache max 50 API responses (5min TTL)
- Push notification click opens specific email
- iOS displays manual install instructions

## Architecture

### System Design
```
Browser
  ├─► Service Worker (sw.ts)
  │     ├─► Workbox (Cache-First for assets)
  │     ├─► Network-First (API calls)
  │     └─► Push Event Listener
  ├─► IndexedDB (emails, drafts)
  └─► Main Thread (React App)

Backend API
  └─► /api/push/subscribe (VAPID endpoint)
```

### Data Flow
```
New Email Arrives
  └─► Backend sends Web Push
      └─► Service Worker shows notification
          └─► User clicks → opens app to /inbox/:messageId
              └─► Fetch from IndexedDB (if offline) or API (if online)
```

## Related Code Files

### Files to Modify
- `services/web/vite.config.ts` - Add PWA plugin config
- `services/web/src/main.tsx` - Register service worker
- `services/web/src/App.tsx` - Add install prompt component
- `services/web/package.json` - Add `idb` dependency

### Files to Create
- `services/web/public/sw.ts` - Service worker with push listener
- `services/web/src/lib/offline-storage.ts` - IndexedDB wrapper (idb)
- `services/web/src/lib/push-notifications.ts` - Web Push registration
- `services/web/src/components/InstallPrompt.tsx` - Install banner
- `services/web/src/components/OfflineBanner.tsx` - Connection status
- `services/web/public/pwa-192x192.png` - PWA icon (192x192)
- `services/web/public/pwa-512x512.png` - PWA icon (512x512, maskable)
- `services/api/src/routes/push.ts` - VAPID subscription endpoint
- `services/api/src/services/web-push-service.ts` - Send push helper

## Implementation Steps

1. **Configure vite-plugin-pwa** (1h)
   - Add Workbox config to `vite.config.ts`
   - Set `registerType: 'autoUpdate'`
   - Define manifest (name, icons, theme_color, display: 'standalone')
   - Configure runtime caching: Network-First for API, Cache-First for assets

2. **Generate PWA Icons** (0.5h)
   - Create 192x192 and 512x512 PNG icons
   - Generate maskable icon (safe zone for Android)
   - Update manifest in vite config

3. **Implement IndexedDB Storage** (2h)
   - Install `idb` library
   - Create `offline-storage.ts` with schema: `emails` (id, subject, from, body, timestamp, synced)
   - Add `cacheEmail(message)` function
   - Add `queueOutboundEmail(draft)` for offline sends
   - Implement auto-cleanup (delete emails >30 days old when quota 80%)

4. **Service Worker Setup** (1.5h)
   - Create `public/sw.ts` with push event listener
   - Add `notificationclick` handler (open specific email URL)
   - Register SW in `main.tsx` (production only)
   - Test with DevTools Application > Service Workers

5. **Web Push Integration - Backend** (1.5h)
   - Generate VAPID keys: `npx web-push generate-vapid-keys`
   - Store public key in `VITE_VAPID_PUBLIC_KEY` env var
   - Create `/api/push/subscribe` endpoint (save subscription to DB)
   - Create `web-push-service.ts` to send notifications via `web-push` library

6. **Web Push Integration - Frontend** (1h)
   - Create `push-notifications.ts` with `subscribeUserToPush()` function
   - Request permission after first email received (not on load)
   - Send subscription object to backend
   - Store subscription state in localStorage

7. **Install Prompt Component** (0.5h)
   - Capture `beforeinstallprompt` event
   - Show custom "Install Ephemera" button (after user engagement)
   - Detect iOS + show manual instructions (Share > Add to Home Screen)
   - Hide prompt after install or dismiss

8. **Offline Fallback UI** (1h)
   - Create `OfflineBanner.tsx` component (listens to `navigator.onLine`)
   - Show cached emails from IndexedDB when offline
   - Display "Viewing cached emails" banner
   - Queue outbound emails with Background Sync API

## Todo List
- [ ] Add vite-plugin-pwa config to vite.config.ts
- [ ] Generate 192x192 and 512x512 PWA icons
- [ ] Install `idb` library
- [ ] Create offline-storage.ts with IndexedDB schema
- [ ] Implement cacheEmail() and auto-cleanup logic
- [ ] Create sw.ts with push event listener
- [ ] Register service worker in main.tsx (prod only)
- [ ] Generate VAPID keys for Web Push
- [ ] Create /api/push/subscribe endpoint
- [ ] Implement web-push-service.ts
- [ ] Create push-notifications.ts with subscribeUserToPush()
- [ ] Add InstallPrompt.tsx with iOS detection
- [ ] Create OfflineBanner.tsx component
- [ ] Test offline mode (airplane mode, DevTools throttling)
- [ ] Run Lighthouse PWA audit (target ≥90)

## Success Criteria
- ✅ PWA installable on Android with custom prompt
- ✅ iOS shows manual install instructions
- ✅ Offline mode displays last 100 cached emails
- ✅ Push notifications work when app closed
- ✅ Notification click opens specific email
- ✅ Lighthouse PWA score ≥90
- ✅ Service worker doesn't cache during development
- ✅ IndexedDB auto-cleanup triggers at 80% quota

## Risk Assessment

**Potential Issues:**
1. **IndexedDB quota exceeded** - Users with >2GB emails on restrictive browsers
2. **iOS push notifications unavailable** - iOS doesn't support Web Push (Safari limitation)
3. **Service worker caching stale data** - Cache invalidation bugs
4. **Permission denial** - Users block notifications permanently

**Mitigation:**
1. Implement LRU eviction (delete oldest emails first) + show quota warning UI
2. Document iOS limitation, recommend native app for iOS push (Phase 7.1)
3. Use `workbox-window` lifecycle events to force update on new version
4. Double permission pattern: explain value BEFORE native prompt

## Security Considerations

**Authentication:**
- JWT tokens cached in IndexedDB (encrypted storage not required - tokens expire)
- VAPID keys stored securely in backend env vars (never exposed to client)

**Data Protection:**
- Email content in IndexedDB (plain text, not encrypted - acceptable for disposable emails)
- Push payloads contain only metadata (subject, sender) - not full body
- Service worker validates origin before handling push events

**Authorization:**
- Push subscriptions linked to user ID in database
- Backend verifies user owns inbox before sending push
- Notification click URLs contain message ID (auth required to view)

## Next Steps
1. Complete Phase 1 implementation
2. Test PWA install on Android (Chrome, Edge, Samsung Internet)
3. Test offline mode with airplane mode + DevTools throttling
4. Lighthouse audit (PWA, Performance, Accessibility)
5. Proceed to Phase 2: Extension Outbound
