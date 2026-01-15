# Research Report: High-Reliability Browser Push Notifications

**ID:** researcher-260116-0211
**Subject:** Web Push, Service Workers, and Fastify Integration
**Project:** Ephemera Email Platform

## 1. Executive Summary
High-reliability push notifications require handling browser-specific push services (FCM, APNs, Mozilla), robust token management, and efficient background processing. Current implementation in Ephemera uses `web-push` on the backend and standard Service Workers. Reliability can be improved by implementing proactive token refresh, better error handling for "Gone" (410) status, and synchronization between browser and database states.

## 2. High-Reliability Architecture
Web Push reliability depends on the Push Service (intermediary) provided by the browser vendor.

### Key Factors for Reliability:
- **HTTPS Requirement:** Mandatory for Service Workers (SW).
- **VAPID Authentication:** Essential for identifying the application server and avoiding being throttled by push services.
- **Payload Encryption:** Handled by the `web-push` library (AES-128-GCM).
- **Service Worker Lifecycle:** Ensuring the SW is correctly updated and remains active.

### Browser Discrepancies:
- **Chrome/Edge:** Route through FCM. Higher reliability, supports `renotify`.
- **Safari:** Routes through APNs. Requires specific icons/manifest configurations.
- **Firefox:** Routes through Mozilla Push Service. Stricter on `userVisibleOnly: true`.

## 3. Token Expiration & Renewal
Push tokens (subscriptions) do not have a fixed expiration but are frequently invalidated.

### Renewal Strategy:
- **Proactive Refresh:** Do not wait for failure. Check `registration.pushManager.getSubscription()` on every app load or session start.
- **Server Sync:** If the subscription object changes (endpoint or keys), immediately update the backend via `POST /push/subscribe`.
- **Handling 410 Gone:** When the backend receives a 410 or 404 from the push service, it must delete the record in the database. (Current `PushNotificationService` already does this).
- **Silent Push Limitations:** Browsers often require a notification to be shown if a push event is received. Frequent "silent" updates might be throttled or blocked.

## 4. Permission Management
- **User-Triggered:** Permission requests should follow a user action (e.g., clicking a toggle) to avoid browser-level blocking of "annoying" prompts.
- **State Reconciliation:** Browser state (`Notification.permission`) can diverge from the DB state. The UI must handle cases where the user revoked permission in browser settings.
- **Graceful Degradation:** Provide alternative notification channels (e.g., Telegram, already implemented) if Push is unavailable or denied.

## 5. Background Processing & Payloads
The Service Worker `push` event is the core of background processing.

### Best Practices:
- **`event.waitUntil()`:** Vital to keep the SW alive until the notification is shown.
- **Notification Grouping (Tags):** Use `tag` in notification options to collapse multiple emails into one or update an existing notification.
- **Data Payloads:** Pass URLs, IDs, and metadata in the `data` field of the push message for handling `notificationclick`.
- **Client Matching:** On click, check if a tab is already open to the target URL using `clients.matchAll()` before opening a new window.

## 6. Fastify Backend Integration
The existing `pushRoutes` in `services/api/src/routes/push.ts` follows standard patterns.

### Refinements:
- **Rate Limiting:** Protect `/push/subscribe` from abuse.
- **VAPID Key Caching:** Ensure VAPID keys are loaded correctly from environment variables (implemented in `PushNotificationService`).
- **Bulk Sending:** Use `Promise.allSettled` for concurrent sends to multiple subscriptions for a single user (currently implemented).
- **Advanced Payload Support:** Add support for `image`, `badge`, and `actions` in the payload schema.

## 7. Trade-offs & Recommendations
- **Trade-off: FCM vs Generic Web Push:** Using FCM directly (via Firebase Admin SDK) can be more reliable for Chrome but adds a dependency. Generic Web Push (`web-push` lib) is better for privacy and vendor neutrality.
- **Recommendation:** Implement a "last successful send" timestamp in `PushSubscription` model to identify and prune stale subscriptions.
- **Recommendation:** Add a `vibrate` pattern for critical alerts (e.g., security breaches).

## 8. Unresolved Questions
1. Should we support Safari's proprietary Push API for older versions, or stick to the standard Web Push (supported in macOS Ventura 13.1+ and iOS 16.4+)?
2. How should we handle multi-device sync if a user clears their browser data?
3. Is there a requirement for "silent" pushes to sync local state without notifying the user (risk of browser throttling)?

## Sources:
- [MDN Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Web Push Best Practices 2026](https://dev.to/best-practices-web-push)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Web-push Library Docs](https://github.com/web-push-libs/web-push)
