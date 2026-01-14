# Phase 06: Copy-First UX

**Date:** 2026-01-14
**Status:** ✅ Complete
**Completed:** 2026-01-14
**Priority:** High
**Estimated Complexity:** Low

## Context
- [Main Plan](./plan.md)
- [Email UX Patterns Research](../reports/researcher-260114-0631-email-ux-patterns.md)

## Overview
Optimize for the primary use case of disposable email: copying email addresses and verification codes quickly.

## Current State
- Copy email via hover action on InboxCard
- OTP extraction in EmailStream with copy button
- Toast notification on copy
- No visual "waiting for email" state

## Target State
- One-click copy email in header
- Prominent OTP display with auto-copy option
- "Listening for emails" indicator
- Copy all feature for batch operations
- Visual feedback on copy (animation)

## Requirements

### Functional
- [x] Copy email button always visible in inbox header
- [x] OTP prominently displayed at top of email
- [x] Auto-copy OTP option (with setting)
- [x] "Listening..." pulsing indicator
- [x] TTL countdown bar on inbox cards
- [x] Copy animation feedback

### Non-Functional
- [x] Copy works on all browsers
- [x] Fallback for clipboard API failure
- [x] Accessible button labels

## Architecture

```
Inbox Card with Copy-First:
┌─────────────────────────────────────────────────┐
│ test123@ephemera.app          [📋 Copy] [⋮]    │
│ ████████████░░░░░░ 12h left                     │
│ 3 messages                                      │
└─────────────────────────────────────────────────┘

OTP Display in Message:
┌─────────────────────────────────────────────────┐
│ 🔐 Verification Code                            │
│ ┌─────────────────────────────────────────────┐ │
│ │        123456        [📋 Copy]              │ │
│ └─────────────────────────────────────────────┘ │
│ Auto-copied to clipboard                        │
└─────────────────────────────────────────────────┘

Listening Indicator:
┌─────────────────────────────────────────────────┐
│ ● Listening for new emails...                   │
│   (pulsing green dot)                           │
└─────────────────────────────────────────────────┘
```

## Implementation Steps

1. **Enhance InboxCard with prominent copy**
   - Move copy button to always visible
   - Add TTL progress bar
   - Copy animation (checkmark flash)

2. **Create OTPBanner component**
   - Displayed at top of email viewer
   - Large, centered code display
   - One-click copy
   - Auto-copy on email open (optional)

3. **Enhance OTP extraction**
   - Support more patterns (6-digit, alphanumeric)
   - Extract from subject line too
   - Multiple codes in one email

4. **Create ListeningIndicator component**
   - Pulsing dot animation
   - Shown when WebSocket connected
   - "New email!" flash on receive

5. **Create TTLProgressBar component**
   - Visual countdown
   - Color changes as expiry approaches
   - Tooltip with exact time

6. **Add copy animation**
   - Button transforms to checkmark
   - Green flash
   - Reset after 2s

7. **Add auto-copy setting**
   - Toggle in settings
   - Store preference
   - Apply on email open

## Files to Modify
- `services/web/src/components/InboxCard.tsx`
- `services/web/src/components/EmailStream.tsx`
- `services/web/src/utils/otpExtractor.ts`
- `services/web/src/pages/InboxManager.tsx`

## Files to Create
- `services/web/src/components/copy-first/OTPBanner.tsx`
- `services/web/src/components/copy-first/ListeningIndicator.tsx`
- `services/web/src/components/copy-first/TTLProgressBar.tsx`
- `services/web/src/components/copy-first/CopyButton.tsx`
- `services/web/src/hooks/useCopyToClipboard.ts`

## Success Criteria
- [x] Copy email in < 1 second from page load
- [x] OTP copied in < 2 seconds from email open
- [x] Visual feedback on all copy actions
- [x] Listening indicator visible when connected
- [x] TTL bar shows time remaining

## Implementation Summary

### Components Created
| Component | Location | Description |
|-----------|----------|-------------|
| CopyButton | `components/copy-first/CopyButton.tsx` | Animated copy button with checkmark feedback |
| TTLProgressBar | `components/copy-first/TTLProgressBar.tsx` | Visual countdown with color-coded urgency |
| OTPBanner | `components/copy-first/OTPBanner.tsx` | Prominent OTP display with one-click copy |
| ListeningIndicator | `components/copy-first/ListeningIndicator.tsx` | WebSocket connection status with pulsing dot |

### Files Modified
| File | Changes |
|------|---------|
| `hooks/useCopyToClipboard.ts` | Added status tracking, fallback for non-secure contexts |
| `components/InboxCard.tsx` | Integrated CopyButton and TTLProgressBar |
| `utils/otpExtractor.ts` | Added 10+ new OTP patterns (alphanumeric, service-specific) |

## Risk Assessment
- **Low:** Simple UI enhancements
- **Low:** Clipboard API well-supported

## Security Considerations
- OTP extraction should not log codes
- Auto-copy should be opt-in
- Clear clipboard after timeout (optional future feature)
