# Phase: High-Reliability Push Notifications

## Context
Reduces notification latency and improves reliability across different browsers (Chrome, Safari, Firefox). Ensures users never miss an ephemeral message.

## Architecture
- **Lifecycle Management**: Proactive subscription refresh on app load.
- **Error Handling**: Automated pruning of "410 Gone" subscriptions.
- **Payload Enhancement**: Support for rich notifications (images, actions, tags).

## Implementation Steps
1. **Frontend: Service Worker Lifecycle**
   - Update `sw.js` to handle `push` events with `event.waitUntil()`.
   - Implement `registration.update()` check on application focus.
2. **Frontend: Subscription Sync**
   - Modify `usePushNotifications.ts` to compare local subscription with backend on every session start.
   - Automatically re-subscribe if the browser push endpoint changes.
3. **Backend: Push Service Refinement**
   - Update `push-notification.ts` to handle batching and concurrent delivery better.
   - Implement "Last Success" timestamp in `PushSubscription` model to identify stale devices.
4. **UI: Permission UX**
   - Add a "Notification Health" indicator in Settings to show if the browser is currently blocking push.

## Success Criteria
- Push subscriptions are automatically updated when the browser refreshes the endpoint.
- Database is automatically cleared of invalid/expired subscription tokens.
- Notifications are correctly grouped (tagged) so multiple emails don't clutter the user's tray.
