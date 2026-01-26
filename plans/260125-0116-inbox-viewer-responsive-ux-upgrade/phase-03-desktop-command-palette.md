---
title: "Phase 3: Desktop Command Palette & Ghost Actions"
status: pending
priority: P1
effort: 3h
---

# Phase 3: Desktop Command Palette & Ghost Actions

## Context Links
- [Desktop UX Research](./research/researcher-desktop-email-ux.md)
- [Phase 1: Layout Foundation](./phase-01-responsive-layout-foundation.md)

## Overview
Implement Superhuman-style desktop UX: command palette (Cmd+K), ghost action bar, and enhanced keyboard navigation. Runs in **parallel with Phase 2**.

## Parallelization Info
- **Can run parallel with:** Phase 2 (Mobile)
- **Depends on:** Phase 1
- **File ownership (EXCLUSIVE):**
  - `use-keyboard-navigation.ts`
  - NEW: `command-palette.tsx`
  - NEW: `ghost-action-bar.tsx`

## Conflict Prevention
- Phase 2 owns touch/swipe; Phase 3 owns keyboard
- No shared file modifications between Phase 2 and Phase 3

## Key Insights
- Command palette = highest ROI for "pro" feel
- Ghost actions = invisible until hover/focus
- Single-key shortcuts: E (archive), R (reply), J/K (nav)
- Selection must have strong visual indicator (border)

## Requirements

### Functional
- Cmd+K / Ctrl+K opens command palette
- Palette supports: Search, Navigate, Actions
- Ghost action bar appears on row hover
- Strong focus ring on selected message

### Non-Functional
- Palette opens in < 100ms
- Fuzzy search in palette
- Actions apply instantly (optimistic UI)

## Architecture

### Command Palette Actions
```
Search Commands:
- "Search emails..."
- "Go to inbox"
- "Go to settings"

Actions (on selected):
- "Archive" (E)
- "Delete" (D)
- "Mark as read" (M)
- "Refresh" (R)
```

### Component Structure
```
CommandPalette
├── SearchInput (auto-focus)
├── CommandList
│   ├── CommandGroup (Navigation)
│   └── CommandGroup (Actions)
└── KeyboardHint (shortcuts)

GhostActionBar
├── ArchiveButton
├── DeleteButton
└── MoreButton
```

## Related Code Files

### Modify
- `services/web/src/hooks/use-keyboard-navigation.ts`

### Create
- `services/web/src/components/inbox-viewer/command-palette.tsx`
- `services/web/src/components/inbox-viewer/ghost-action-bar.tsx`

## Implementation Steps

1. **Create command-palette.tsx**
   ```tsx
   interface CommandPaletteProps {
     isOpen: boolean;
     onClose: () => void;
     onCommand: (command: string) => void;
   }
   ```
   - Modal overlay with backdrop blur (subtle)
   - Input with auto-focus
   - Keyboard navigation (up/down/enter)
   - Fuzzy match using simple includes()

2. **Create ghost-action-bar.tsx**
   ```tsx
   interface GhostActionBarProps {
     onArchive: () => void;
     onDelete: () => void;
     onMore: () => void;
   }
   ```
   - Position absolute, right-aligned
   - `opacity-0 group-hover:opacity-100` transition
   - Icon-only buttons with tooltips

3. **Update use-keyboard-navigation.ts**
   - Add Cmd+K / Ctrl+K handler
   - Add E (archive), D (delete), M (mark read)
   - Expose `openCommandPalette` callback
   ```tsx
   case "k":
     if (e.metaKey || e.ctrlKey) {
       e.preventDefault();
       onOpenCommandPalette?.();
     }
     break;
   ```

4. **Integrate in InboxViewer.tsx**
   - Add state: `showCommandPalette`
   - Render `<CommandPalette>` conditionally
   - Pass command handlers

5. **Add ghost actions to message-list-item**
   - Wrap row in `group` class
   - Position ghost bar absolute right

## Todo List
- [ ] Create command-palette.tsx with search
- [ ] Implement fuzzy command matching
- [ ] Add keyboard nav in palette (up/down/enter)
- [ ] Create ghost-action-bar.tsx
- [ ] Add hover reveal transition
- [ ] Update keyboard hook with Cmd+K
- [ ] Add E/D/M single-key shortcuts
- [ ] Test on macOS and Windows (Cmd vs Ctrl)

## Success Criteria
- [ ] Cmd+K opens command palette
- [ ] Typing filters commands
- [ ] Enter executes selected command
- [ ] Ghost actions visible on hover only
- [ ] E/D/M shortcuts work when focused
- [ ] Strong focus indicator on selected row

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Shortcut conflicts with browser | Check common conflicts |
| Ghost actions obscure content | Right-align, small icons |
| Command palette slow with many commands | Limit to 50 results |

## Security Considerations
- Sanitize command input (no XSS in search)
- Rate limit destructive actions (delete)

## Next Steps
After Phase 2 + Phase 3 complete, proceed to Phase 4 (Density Controls).
