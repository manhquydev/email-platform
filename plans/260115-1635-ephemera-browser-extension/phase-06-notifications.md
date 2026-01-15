# Phase 6: Real-time Notifications

**Status**: Pending
**Goal**: Push notifications for new emails.

## Tasks
- [ ] **Service Worker Setup**
  - [ ] Implement `chrome.gcm` or Web Push API integration.
  - [ ] Note: MV3 Service Workers sleep. Push events wake them up.
- [ ] **Backend Integration**
  - [ ] Update `services/api/src/routes/push.ts` or create new `extension-push` route.
  - [ ] Store FCM/VAPID subscription linked to User/Device.
- [ ] **Notification UI**
  - [ ] Use `chrome.notifications.create` API.
  - [ ] Click action -> Open Message URL.
- [ ] **Badge Counter**
  - [ ] `chrome.action.setBadgeText`
  - [ ] Update on push event.

## Deliverables
- Notifications appear when browser is open/backgrounded.
- Clicking notification opens the email.
