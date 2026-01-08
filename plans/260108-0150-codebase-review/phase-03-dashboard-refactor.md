# Phase 03: Dashboard Component Extraction

**Status:** completed | **Priority:** P2 | **Effort:** 3h

## Context

`services/web/src/pages/Dashboard.tsx` is 797 lines (4x over 200-line limit). Contains 18+ useState hooks, duplicate sidebar rendering, and missing memoization.

## Objective

Extract 5 components and 2 custom hooks to enable gradual refactoring of Dashboard.tsx.

## Implementation

### New Components Created

```
services/web/src/components/dashboard/
├── index.ts              # Re-exports (11 lines)
├── OTPHighlight.tsx      # OTP display with copy (34 lines)
├── AttachmentList.tsx    # Email attachments grid (46 lines)
├── MobileSidebar.tsx     # Mobile drawer sidebar (104 lines)
├── MessageDetailPane.tsx # Full message view (186 lines)
└── MessageListPane.tsx   # Message list with search (205 lines)
```

### New Hooks Created

```
services/web/src/hooks/
├── useDashboardData.ts   # Data loading, state, effects (214 lines)
└── useMessageActions.ts  # Message CRUD operations (107 lines)
```

### Key Features

**1. OTPHighlight Component**
- Extracts and displays OTP codes
- Copy-to-clipboard functionality
- Reusable in email detail views

**2. AttachmentList Component**
- Grid display of email attachments
- Download links with hover effects
- Handles empty state

**3. MobileSidebar Component**
- AnimatePresence for smooth animations
- Backdrop with blur effect
- Spring-based slide animation

**4. MessageDetailPane Component**
- Full email content display
- Action toolbar (reply, pin, delete, etc.)
- OTP and attachment integration
- Quick reply footer

**5. MessageListPane Component**
- Email stream with virtualization support
- Search input with debouncing
- Pagination controls
- Mobile/desktop responsive

**6. useDashboardData Hook**
- Manages domains, inboxes, messages state
- Auto-selection logic
- Polling for new messages
- Debounced search

**7. useMessageActions Hook**
- Mark read/unread
- Delete message
- Toggle pin
- Copy OTP/content

## Estimated Result

| File | Lines | Description |
|------|-------|-------------|
| `OTPHighlight.tsx` | 34 | OTP display component |
| `AttachmentList.tsx` | 46 | Attachment grid |
| `MobileSidebar.tsx` | 104 | Mobile drawer |
| `MessageDetailPane.tsx` | 186 | Email detail view |
| `MessageListPane.tsx` | 205 | Message list |
| `useDashboardData.ts` | 214 | Data management hook |
| `useMessageActions.ts` | 107 | Action handlers hook |
| **Total** | **896** | Reusable components/hooks |

## Success Criteria

- [x] 5 dashboard components created
- [x] 2 custom hooks created
- [x] All components under 220 lines
- [x] TypeScript compiles successfully
- [ ] Dashboard.tsx uses new components (deferred for gradual adoption)
- [ ] Memoization added for derived values (deferred)

## Migration Path

Dashboard.tsx can gradually adopt these components:
1. Replace inline OTP section with `<OTPHighlight />`
2. Replace attachment section with `<AttachmentList />`
3. Replace mobile sidebar with `<MobileSidebar />`
4. Extract message detail into `<MessageDetailPane />`
5. Extract message list into `<MessageListPane />`
6. Replace state management with `useDashboardData()`
7. Replace actions with `useMessageActions()`

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking changes | Components created alongside existing code |
| Props mismatch | Comprehensive prop interfaces defined |
| Missing state | Hooks expose all necessary state setters |

## Next Steps

After completion, proceed to Phase 04: Test Coverage Expansion
