---
title: "Phase 1: Quick Wins"
status: pending
priority: P1
effort: 6h
---

# Phase 1: Quick Wins

## Context Links

- [Extension Source](../../services/extension/src/)
- [Background Script](../../services/extension/src/entrypoints/background.ts)
- [Push Handler](../../services/extension/src/background/push-handler.ts)
- [InboxList Component](../../services/extension/src/components/popup/InboxList.tsx)
- [i18n Module](../../services/extension/src/shared/i18n.ts)

## Overview

Quick wins that enhance UX with minimal complexity: OTP display, keyboard shortcuts, context menu improvements, and visual countdown timers.

## Key Insights

- Backend already extracts OTP via `otp-extractor.service.ts` and includes in push payload
- Context menus already exist in `background.ts` but need enhancement
- InboxList already has countdown logic (`formatTimeLeft`) - need visual enhancement
- WXT supports `commands` API for keyboard shortcuts via manifest

---

## Feature 1: OTP Auto-Extract UI

### Requirements

- Display extracted OTP prominently when new email contains OTP
- One-click copy button with visual feedback
- Auto-dismiss after 60 seconds or manual dismiss
- Show in both notification and side panel

### Architecture

```
Push Notification (with OTP)
        │
        ▼
  push-handler.ts
        │
        ├──► Show notification with OTP
        │
        └──► Store OTP in chrome.storage.session
                    │
                    ▼
            OtpBanner.tsx (new component)
```

### Related Code Files

**Create:**
- `src/components/shared/OtpBanner.tsx` - OTP display banner component
- `src/hooks/useOtpWatcher.ts` - Hook to watch for new OTPs

**Modify:**
- `src/background/push-handler.ts` - Extract and store OTP from push
- `src/shared/types.ts` - Add OTP types
- `src/shared/storage.ts` - Add OTP session storage helpers
- `src/entrypoints/sidepanel/App.tsx` - Add OtpBanner
- `src/shared/i18n.ts` - Add OTP message keys
- `public/_locales/en/messages.json` - EN translations
- `public/_locales/vi/messages.json` - VI translations

### Implementation Steps

1. **Update push-handler.ts** to extract OTP from payload:
   ```typescript
   // In handlePushMessage
   if (data.otp) {
     await browser.storage.session.set({
       currentOtp: {
         code: data.otp,
         from: data.from,
         expiresAt: Date.now() + 60000
       }
     });
   }
   ```

2. **Create OtpBanner.tsx** (~80 lines):
   ```typescript
   interface OtpBannerProps {
     otp: { code: string; from: string; expiresAt: number } | null;
     onDismiss: () => void;
   }
   // Animated banner with copy button, countdown, dismiss
   ```

3. **Create useOtpWatcher.ts** (~40 lines):
   ```typescript
   export function useOtpWatcher() {
     const [otp, setOtp] = useState<OtpData | null>(null);
     // Listen to storage.session changes
     // Auto-clear when expired
     return { otp, clearOtp };
   }
   ```

4. **Integrate in sidepanel/App.tsx**:
   ```typescript
   const { otp, clearOtp } = useOtpWatcher();
   // Render OtpBanner at top when otp exists
   ```

5. **Add i18n keys**: `otpCopied`, `otpFromSender`, `otpExpires`

### Todo List

- [ ] Add OTP types to `types.ts`
- [ ] Add session storage helpers to `storage.ts`
- [ ] Update `push-handler.ts` to store OTP
- [ ] Create `OtpBanner.tsx` component
- [ ] Create `useOtpWatcher.ts` hook
- [ ] Integrate banner in sidepanel App
- [ ] Add i18n translations (EN/VI)
- [ ] Write unit tests for OTP utilities

---

## Feature 2: Keyboard Shortcuts

### Requirements

- `Ctrl+Shift+E` - Create new quick inbox
- `Ctrl+Shift+C` - Copy current/most recent inbox address
- Show shortcuts in settings page
- Cross-browser support via commands API

### Architecture

WXT/Chrome `commands` API handles global shortcuts. Background script listens and executes actions.

### Related Code Files

**Modify:**
- `wxt.config.ts` - Add commands to manifest
- `src/entrypoints/background.ts` - Add command listener
- `src/components/popup/Settings.tsx` - Display shortcuts info

### Implementation Steps

1. **Update wxt.config.ts** - Add commands:
   ```typescript
   manifest: {
     // ...existing
     commands: {
       'create-inbox': {
         suggested_key: { default: 'Ctrl+Shift+E', mac: 'Command+Shift+E' },
         description: '__MSG_shortcutCreateInbox__'
       },
       'copy-current': {
         suggested_key: { default: 'Ctrl+Shift+C', mac: 'Command+Shift+C' },
         description: '__MSG_shortcutCopyCurrent__'
       }
     }
   }
   ```

2. **Update background.ts** - Add command handler:
   ```typescript
   browser.commands.onCommand.addListener(async (command) => {
     if (command === 'create-inbox') {
       const response = await api.createQuickInbox();
       if (response.success) {
         const email = response.inbox.address;
         await navigator.clipboard.writeText(email);
         browser.notifications.create({ title: 'Inbox Created', message: email });
       }
     }
     if (command === 'copy-current') {
       const result = await browser.storage.local.get('inboxes');
       const inboxes = result.inboxes || [];
       if (inboxes[0]) {
         await navigator.clipboard.writeText(inboxes[0].address);
         browser.notifications.create({ title: 'Copied', message: inboxes[0].address });
       }
     }
   });
   ```

3. **Update Settings.tsx** - Add shortcuts section (~20 lines addition)

4. **Add i18n keys**: `shortcutCreateInbox`, `shortcutCopyCurrent`, `keyboardShortcuts`

### Todo List

- [ ] Add commands to `wxt.config.ts` manifest
- [ ] Implement command listener in `background.ts`
- [ ] Add shortcuts info section to `Settings.tsx`
- [ ] Add i18n translations (EN/VI)
- [ ] Test on Chrome and Firefox

---

## Feature 3: Context Menu Enhancement

### Requirements

- Right-click on email field → "Fill with Ephemera address"
- Show submenu with existing inboxes (max 8)
- "Generate New Email" option at top
- Dynamically update when inboxes change

### Architecture

Context menus already exist in `background.ts`. Enhance with better field targeting and dynamic updates.

### Related Code Files

**Modify:**
- `src/entrypoints/background.ts` - Enhance context menu logic
- `src/entrypoints/content.ts` - Improve field detection integration

### Implementation Steps

1. **Enhance setupContextMenus()** in background.ts:
   ```typescript
   // Add separator and header styling
   browser.contextMenus.create({
     id: 'ephemera-header',
     parentId: 'ephemera-parent',
     title: '── Quick Actions ──',
     enabled: false,
     contexts: ['editable'],
   });
   ```

2. **Add inbox change listener** to refresh menus:
   ```typescript
   browser.storage.onChanged.addListener((changes, area) => {
     if (area === 'local' && changes.inboxes) {
       setupContextMenus();
     }
   });
   ```

3. **Improve fill behavior** - Dispatch proper React events:
   ```typescript
   // In executeScript callback
   const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
     window.HTMLInputElement.prototype, 'value'
   )?.set;
   nativeInputValueSetter?.call(activeEl, email);
   activeEl.dispatchEvent(new Event('input', { bubbles: true }));
   ```

### Todo List

- [ ] Add storage change listener for menu refresh
- [ ] Improve input value setting for React forms
- [ ] Add visual feedback after fill
- [ ] Test on major sites (Google, GitHub, etc.)

---

## Feature 4: Inbox Expiry Countdown (Enhanced)

### Requirements

- Visual progress ring/bar showing time remaining
- Color coding: green (>10m), yellow (5-10m), red (<5m)
- Pulsing animation when <2 minutes
- Tooltip showing exact expiry time

### Architecture

Enhance existing countdown in `InboxList.tsx` with visual components.

### Related Code Files

**Create:**
- `src/components/shared/CountdownRing.tsx` - Circular progress indicator

**Modify:**
- `src/components/popup/InboxList.tsx` - Integrate CountdownRing
- `src/entrypoints/popup/index.css` - Add animation keyframes

### Implementation Steps

1. **Create CountdownRing.tsx** (~60 lines):
   ```typescript
   interface CountdownRingProps {
     expiresAt: string;
     now: number;
     size?: 'sm' | 'md';
   }
   // SVG circle with stroke-dasharray animation
   // Color transitions based on remaining time
   ```

2. **Update InboxList.tsx** - Replace text countdown with ring:
   ```typescript
   // Replace the span with Clock icon
   <CountdownRing expiresAt={inbox.expiresAt} now={now} size="sm" />
   ```

3. **Add CSS animations**:
   ```css
   @keyframes pulse-urgent {
     0%, 100% { opacity: 1; }
     50% { opacity: 0.5; }
   }
   .countdown-urgent {
     animation: pulse-urgent 1s ease-in-out infinite;
   }
   ```

### Todo List

- [ ] Create `CountdownRing.tsx` component
- [ ] Add CSS keyframe animations
- [ ] Integrate in `InboxList.tsx`
- [ ] Add tooltip with exact time
- [ ] Test visual feedback at different time thresholds

---

## Success Criteria

- [ ] OTP banner appears when email with OTP received
- [ ] One-click copy for OTP works
- [ ] Keyboard shortcuts work globally
- [ ] Context menu shows on right-click in email fields
- [ ] Countdown ring displays with color coding
- [ ] All features have EN/VI translations
- [ ] Unit tests pass for new utilities

## Security Considerations

- OTP stored in `session` storage (cleared on browser close)
- OTP auto-expires after 60 seconds
- Clipboard access requires `clipboardWrite` permission (already granted)
- Context menu only appears in editable fields

## Next Steps

After completing Phase 1, proceed to [Phase 2: Core Enhancement](./phase-02-core-enhancement.md)
