# Phase 05: Quick Actions & Keyboard Shortcuts

**Date:** 2026-01-14
**Status:** Pending
**Priority:** Medium
**Estimated Complexity:** Low

## Context
- [Main Plan](./plan.md)
- [Email UX Patterns Research](../reports/researcher-260114-0631-email-ux-patterns.md)

## Overview
Enhance keyboard navigation and add quick action patterns for power users.

## Current State
- Basic keyboard nav: Arrow keys, Enter, Space, Delete
- No command palette
- Actions hidden behind hover
- No keyboard shortcut hints

## Target State
- Full Gmail-style keyboard shortcuts
- Command palette (Cmd+K)
- Keyboard shortcut overlay (?)
- Visible shortcut hints in UI
- Undo toast for destructive actions

## Requirements

### Functional
- [ ] Command palette with fuzzy search
- [ ] Gmail-style shortcuts: j/k (nav), e (archive), # (delete), r (reply future)
- [ ] Shortcut hint overlay (press ?)
- [ ] Undo toast with 5s timeout
- [ ] Escape to close any modal/panel

### Non-Functional
- [ ] Shortcuts work when not in input
- [ ] No conflicts with browser shortcuts
- [ ] Accessible (announced to screen readers)

## Keyboard Shortcuts Map

| Key | Action | Context |
|-----|--------|---------|
| `j` | Next item | List focused |
| `k` | Previous item | List focused |
| `Enter` | Open/Select | Any |
| `Space` | Toggle select | List focused |
| `e` | Archive (mark done) | Item selected |
| `#` | Delete | Item selected |
| `s` | Toggle star/pin | Item selected |
| `/` | Focus search | Global |
| `Escape` | Close/Cancel | Any modal |
| `?` | Show shortcuts | Global |
| `Cmd+K` | Command palette | Global |
| `c` | Compose/Create new | Global |
| `g i` | Go to inbox | Global |
| `g s` | Go to settings | Global |

## Architecture

```
Command Palette:
┌─────────────────────────────────────────────────┐
│ 🔍 Type a command...                            │
├─────────────────────────────────────────────────┤
│ 📧 Create new inbox                       ⌘+N   │
│ 🔍 Search messages                        /     │
│ ⚙️ Open settings                          g s   │
│ 🗑️ Delete selected                        #     │
│ 📋 Copy email address                     ⌘+C   │
└─────────────────────────────────────────────────┘

Keyboard Hints Overlay:
┌─────────────────────────────────────────────────┐
│              Keyboard Shortcuts                 │
├─────────────────────────────────────────────────┤
│ Navigation          │ Actions                   │
│ j - Next           │ e - Archive               │
│ k - Previous       │ # - Delete                │
│ Enter - Open       │ s - Star/Pin              │
│ Space - Select     │ c - Compose               │
├─────────────────────────────────────────────────┤
│ Press ? to toggle this overlay                  │
└─────────────────────────────────────────────────┘
```

## Implementation Steps

1. **Enhance CommandPalette component**
   - Already exists, add more commands
   - Add fuzzy search with fuse.js
   - Show keyboard hints

2. **Create useKeyboardShortcuts hook**
   - Central keyboard event handler
   - Context-aware (check if in input)
   - Register/unregister shortcuts

3. **Create KeyboardHintsOverlay component**
   - Modal showing all shortcuts
   - Grouped by category
   - Toggle with ?

4. **Create UndoToast component**
   - 5-second countdown
   - Undo button
   - Auto-dismiss

5. **Update InboxManager keyboard handling**
   - Use new hook instead of inline useEffect
   - Add missing shortcuts

6. **Add shortcut hints to buttons**
   - Tooltip with keyboard hint
   - Subtle text in buttons (optional)

## Files to Modify
- `services/web/src/components/CommandPalette.tsx`
- `services/web/src/pages/InboxManager.tsx`

## Files to Create
- `services/web/src/hooks/useKeyboardShortcuts.ts`
- `services/web/src/components/KeyboardHintsOverlay.tsx`
- `services/web/src/components/UndoToast.tsx`
- `services/web/src/config/keyboard-shortcuts.ts`

## Success Criteria
- [ ] All shortcuts work as documented
- [ ] Command palette opens with Cmd+K
- [ ] ? shows keyboard overlay
- [ ] Undo works for delete actions
- [ ] No shortcut conflicts

## Risk Assessment
- **Low:** Keyboard handling is straightforward
- **Low:** Existing CommandPalette to enhance

## Security Considerations
- No new security concerns
