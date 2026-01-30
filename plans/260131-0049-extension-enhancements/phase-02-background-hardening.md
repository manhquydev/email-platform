# Phase 2: Background Script Hardening

## Context Links
- [background.ts](../../services/extension/src/entrypoints/background.ts)
- [push-handler.ts](../../services/extension/src/background/push-handler.ts)

## Overview
- **Priority:** Low
- **Status:** Pending
- **Effort:** 1h

Verify and enhance service worker reliability for MV3.

## Key Insights
- MV3 service workers can be terminated after ~30s of inactivity
- Current alarm setup (`poll_messages`) keeps worker alive every 1 min
- Push events have `event.waitUntil()` which extends SW lifetime
- No explicit keep-alive mechanism beyond alarms

## Requirements

### Functional
- Service worker stays responsive for push notifications
- Reconnection if API connection drops
- Alarms trigger reliably

### Non-Functional
- Minimal battery/resource impact
- No unnecessary wake-ups

## Architecture

Current flow (already good):
```
[onInstalled] --> [Create Alarm: 1min]
       |
       v
[Alarm fires] --> [Poll if needed]
       |
       v
[Push event] --> [waitUntil(handlePush)]
```

Enhancements:
```
[Add] --> [Alarm listener verification on startup]
[Add] --> [Connection error retry with backoff]
```

## Related Code Files

### Modify
- `services/extension/src/entrypoints/background.ts`

### Create
- None

## Implementation Steps

### Step 1: Verify alarm exists on startup
```typescript
// Add after onInstalled listener
browser.runtime.onStartup.addListener(async () => {
  // Ensure alarm exists (might be cleared on browser restart)
  const alarm = await browser.alarms.get(ALARM_POLL_MESSAGES);
  if (!alarm) {
    browser.alarms.create(ALARM_POLL_MESSAGES, {
      periodInMinutes: 1
    });
  }

  // Re-setup push if authenticated
  const auth = await storage.getAuth();
  if (auth?.isAuthenticated) {
    setupPushNotification().catch(console.error);
  }
});
```

### Step 2: Add alarm handler (currently missing)
```typescript
// Add alarm listener
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_POLL_MESSAGES) {
    const auth = await storage.getAuth();
    if (!auth?.isAuthenticated) return;

    try {
      // Light check - just update badge if new messages
      const dashboard = await api.getDashboard();
      const totalUnread = dashboard.stats?.totalUnread || 0;
      updateBadge(totalUnread > 0 ? String(totalUnread) : '');
    } catch (e) {
      console.error('Poll failed:', e);
    }
  }
});
```

### Step 3: Add connection retry logic to setupPushNotification
```typescript
// Wrap existing setupPushNotification with retry
async function setupPushNotificationWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await setupPushNotification();
      return;
    } catch (err) {
      console.warn(`Push setup attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // backoff
      }
    }
  }
  console.error('Push setup failed after retries');
}
```

### Step 4: Handle push subscription errors gracefully
```typescript
// In SETUP_PUSH message handler, use retry version
if (message.type === 'SETUP_PUSH') {
  return setupPushNotificationWithRetry()
    .then(() => ({ success: true }))
    .catch(err => ({ success: false, error: err.message }));
}
```

## Todo List
- [ ] Add `onStartup` listener to verify alarms
- [ ] Add `onAlarm` listener for poll_messages
- [ ] Add retry wrapper for push setup
- [ ] Update SETUP_PUSH handler to use retry
- [ ] Test by disabling/enabling network
- [ ] Verify alarm fires after browser restart

## Success Criteria
- [ ] Alarm recreated if missing on browser startup
- [ ] Badge updates on alarm poll
- [ ] Push subscription retries on failure
- [ ] No console errors during normal operation

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Excessive polling | Low | Medium | 1min interval is reasonable |
| Retry loops | Low | Low | Max 3 retries with backoff |

## Security Considerations
- No new permissions required
- Alarm polling only when authenticated
