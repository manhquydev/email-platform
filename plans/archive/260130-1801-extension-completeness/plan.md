---
title: "Extension Completeness - i18n, ErrorBoundary, Pin, Compose"
description: "Complete extension gaps: 18 i18n keys, ErrorBoundary wrapper, Pin/Unpin inbox, Compose new email"
status: pending
priority: P2
effort: 3h
branch: main
tags: [extension, i18n, ui, feature]
created: 2026-01-30
---

# Extension Completeness Implementation

## Context
- [Brainstorm Report](../reports/brainstorm-260130-1801-extension-completeness-audit.md)
- Framework: WXT + React 18 + TypeScript + Tailwind
- Locales supported: EN, VI, ES, FR

## Current Gaps

| Gap | Status | Effort |
|-----|--------|--------|
| i18n missing 18 keys | ⚠️ 50% coverage | 30min |
| ErrorBoundary not wrapped | ⚠️ Component exists | 15min |
| Pin/Unpin inbox visual | ⚠️ Uses "permanent" toggle | 1h |
| Compose new email | ⚠️ Only reply/forward | 1h |

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | [i18n Completion](./phase-01-i18n-completion.md) | ✅ Done | EN/VI locales |
| 2 | [Error Handling](./phase-02-error-handling.md) | ✅ Done | App.tsx |
| 3 | [Pin/Unpin Inbox](./phase-03-pin-unpin-inbox.md) | ✅ Done | InboxList.tsx |
| 4 | [Compose New Email](./phase-04-compose-new-email.md) | ⬜ Pending | ComposeModal.tsx |

## Success Criteria

1. All 56 i18n keys present in EN/VI locales
2. ErrorBoundary wraps App.tsx main content
3. Users can pin/unpin inboxes with visual indicator
4. Users can compose new emails
5. All 222+ tests passing

## Key Files

```
services/extension/
├── public/_locales/
│   ├── en/messages.json  # Add 18 keys
│   └── vi/messages.json  # Add 18 keys
├── src/
│   ├── entrypoints/popup/App.tsx      # Wrap with ErrorBoundary
│   ├── components/
│   │   ├── ErrorBoundary.tsx          # Already exists
│   │   ├── popup/InboxList.tsx        # Add pin feature
│   │   └── shared/ComposeModal.tsx    # Add 'new' mode
│   └── shared/
│       ├── api.ts                     # May need sendMessage
│       └── i18n.ts                    # Type definitions
```
