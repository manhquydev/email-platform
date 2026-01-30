# Extension Completeness Audit - Brainstorm Report

**Date:** 2026-01-30
**Focus:** Extension frontend/backend completeness + EN/VI i18n support

## Problem Statement

Assess extension completeness status across frontend, backend, and i18n. Identify gaps and create remediation plan.

## Current State Analysis

### Architecture (✅ Complete)
- **Framework:** WXT + React 18 + TypeScript + Tailwind
- **Entry Points:** Popup, Sidepanel, Content Script, Background
- **API:** Full client with JWT auth, refresh tokens, 2FA
- **Locales:** EN, VI, ES, FR supported

### Feature Status

| Feature | Status | Gap |
|---------|--------|-----|
| Compose/Reply Email | ⚠️ Partial | Cannot compose new email (only reply/forward) |
| Search Functionality | ✅ Complete | Global + local filter working |
| Pin/Unpin Inbox | ⚠️ Alternative | Uses "Make Permanent" not visual pin |
| Settings Page | ✅ Complete | Theme, notifications, preferences |
| Error Handling | ⚠️ Partial | Missing global ErrorBoundary wrapper |
| Backend API | ✅ High | Missing `sendMessage` endpoint |

### i18n Status

| Metric | Value |
|--------|-------|
| Keys in locale files | 28 |
| Keys declared in i18n.ts | 56 |
| **Coverage** | **50%** |

**Missing 18 keys:**
```
reply, forward, send, sending, messageSent, to, subject,
composeBody, searchAllMessages, noSearchResults, searchResultsCount,
pinInbox, unpinInbox, pinnedInboxes, noMessages, loadingPreview,
errorBoundary_title, errorBoundary_message
```

## Recommended Solution

### Phase 1: i18n Completion (Low effort)
- Add 18 missing keys to EN locale
- Add 18 missing keys to VI locale
- Verify all components use `t()` function

### Phase 2: Error Handling (Low effort)
- Wrap `App.tsx` with `ErrorBoundary` component
- Add fallback UI for crashed states

### Phase 3: Pin/Unpin Feature (Low effort)
- Add pin icon to inbox items
- Implement pinned inboxes sorting (pinned first)
- Store pin state in local storage or backend

### Phase 4: Compose New Email (Medium effort)
- Extend `ComposeModal` to support `mode: 'new'`
- Add backend `sendMessage` endpoint if needed
- Add "Compose" button to UI

## Success Criteria

1. All 56 i18n keys present in EN and VI locales
2. ErrorBoundary wraps entire app
3. Pin/Unpin feature functional
4. Users can compose new emails (if backend supports)
5. All tests passing

## Risks

| Risk | Mitigation |
|------|------------|
| Backend missing sendMessage API | Check API docs, may need backend work |
| Pin state persistence | Use browser.storage.local for simplicity |
| i18n key mismatch | Validate all keys used in components |

## Files Involved

- `services/extension/public/_locales/en/messages.json`
- `services/extension/public/_locales/vi/messages.json`
- `services/extension/src/shared/i18n.ts`
- `services/extension/src/entrypoints/popup/App.tsx`
- `services/extension/src/components/ErrorBoundary.tsx`
- `services/extension/src/components/popup/InboxList.tsx`
- `services/extension/src/components/shared/ComposeModal.tsx`
- `services/extension/src/shared/api.ts`

## Next Steps

Create detailed implementation plan with `/plan` command.
