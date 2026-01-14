# Research: Modern Inbox Card UI Patterns

**Date:** 2026-01-14
**Context:** React 19 + TailwindCSS Email Platform (Ephemera)
**Focus:** Card-based interfaces for high-volume data

## 1. Card Layout Patterns
**Recommendation: Dense Hybrid List**
- **Pure Card (Grid):** Too low density for email. Only suitable for "Pinterest-style" discovery or heavy attachment browsing.
- **Pure List:** High density but poor visual hierarchy for rich metadata.
- **Hybrid (Recommended):** "Card-like" rows. Full-width, taller than standard rows (64px-80px), distinct borders/shadows on hover, clear separation.
- **Responsive:** Transform to full cards on mobile (<640px), retain list-like density on desktop.

## 2. Status Indicators & Badges
- **Unread State:**
  - **Primary:** Bold font for sender/subject.
  - **Secondary:** Left-border accent color (blue/primary) or dot indicator.
  - **Background:** Subtle color shift (bg-blue-50/5 dark:bg-blue-900/10) for unread items.
- **Badges:**
  - Pill-shaped, muted backgrounds (bg-gray-100 text-gray-600).
  - Limit to 2-3 visible tags; collapse rest into "+N" overflow.
  - **Urgency:** Red/Orange icons (flags) rather than full colored backgrounds to reduce visual noise.

## 3. Quick Actions & Context Menus
- **Hover Reveal:** Show action buttons (Archive, Delete, Snooze, Reply) *only* on row hover (Desktop). Always visible or swipe-actions on Mobile.
- **Placement:** Absolute positioned to the right, opaque background to cover timestamp/meta.
- **Context Menu:** Custom right-click menu (Radix UI Context Menu) for power users.
  - *Must include:* Reply, Forward, Move to, Label, Delete, Mute.

## 4. Selection Patterns
- **Checkbox Behavior:**
  - **Implicit:** Click anywhere on card to open.
  - **Explicit:** Hover reveals checkbox avatar replacement (Gmail pattern) or dedicated left column gutter.
  - **Multi-select:** Shift+Click range selection is critical for power users.
- **Floating ActionBar:** When items selected, show floating sticky bottom/top bar with bulk actions (Delete, Archive, Mark Read).

## 5. Drag-and-Drop Organization
- **Visuals:** "Ghost" image of dragged cards (opacity 50%).
- **Drop Targets:** Highlight folders/labels in sidebar when dragging.
- **Interaction:**
  - Drag to Label: Applies label.
  - Drag to Folder: Moves message.

## 6. Empty States & Onboarding
- **Zero Data:** Don't just say "No emails".
  - **Action:** "Waiting for incoming mail... [Copy Address]" or "Send test email".
  - **Visual:** Subtle illustration (ghost mailbox).
- **Search/Filter Empty:** "No matches found. Clear filters?"

## 7. Loading States
- **Skeleton Screens:** Match the exact height/layout of the card rows.
  - Circle for avatar.
  - 3 varying width lines for Text (Sender, Subject, Preview).
- **Progressive:** Load text metadata first, then async load avatars/attachments.
- **Pagination:** Infinite scroll trigger at 80% scroll depth.

## 8. Accessibility (ARIA & Nav)
- **Role:** `role="grid"` or `role="feed"` with `aria-label="Email list"`.
- **Focus:** Roving `tabindex` (-1 for non-active rows, 0 for active).
- **Keyboard Shortcuts:**
  - `j` / `k`: Next/Prev email.
  - `x`: Select.
  - `Enter`: Open.
  - `Del` / `#`: Delete.
- **Screen Readers:** Hidden text for icon-only buttons (`aria-label="Delete thread"`).

## Actionable Recommendations for Ephemera
1. **Refactor `MessageList.tsx`:** Move from simple table/list to Semantic `<ul>` with accessible Card components.
2. **Implement Roving Tabindex:** Ensure arrow key navigation works immediately.
3. **Add Swipe Actions:** For mobile view (react-swipeable-list).
4. **Visual Polish:**
   - Use `group` and `group-hover` Tailwind classes for Quick Actions.
   - Add `line-clamp-1` for subject and `line-clamp-2` for preview text.

## Unresolved Questions
- Does the current `mailparser` setup extract user avatars/logos (BIMI)?
- Do we need "Thread view" (conversation grouping) in the card design immediately?

## Sources
- [PatternFly: Card View Accessibility](https://www.patternfly.org/components/card/accessibility)
- [Nielsen Norman: Cards vs Lists](https://www.nngroup.com/articles/cards-component/)
- [Gmail & Outlook Standard Patterns](https://support.google.com/mail/answer/6594)
