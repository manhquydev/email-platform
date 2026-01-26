# Code Review: Accessibility Phase 5

## Scope
- Files:
  - `services/web/src/components/inbox-viewer/command-palette.tsx`
  - `services/web/src/components/inbox-viewer/mobile-bottom-sheet.tsx`
  - `services/web/src/pages/inbox-viewer-modules/inbox-viewer-components.tsx`

## Assessment
**Score: 8/10**

### Critical Issues
1. **Focus Management (MobileBottomSheet)**: Focus is not moved into the sheet when opened. WCAG 2.4.3 requires focus to move to the dialog or first focusable element.
2. **Touch Target (MobileBottomSheet)**: The drag handle button is visually `w-10 h-1` with no padding, violating the 44x44px minimum touch target size (WCAG 2.5.5).
3. **Focus Trap (CommandPalette)**: Focus is not strictly trapped within the modal. Users can `Tab` out of the palette into the background content (WCAG 2.1.2).

### Warnings
1. **Dynamic Updates (CommandPalette)**: Search result changes are not announced. Screen reader users may not know results have updated without `aria-live` or status announcement.
2. **Target Size (CommandPalette)**: List items use `py-2.5`. With standard line-height, this is ~44px but potentially smaller depending on font settings.

### Suggestions
1. **MobileBottomSheet**:
   - Add `w-full h-full opacity-0` pseudo-element or increase padding to `p-4` on the drag handle.
   - Add `autoFocus` or `useEffect` to focus the sheet container on mount.
2. **CommandPalette**:
   - Implement focus trap logic (e.g., `react-focus-lock` or custom `keydown` handler for Tab).
   - Add `min-h-[44px]` to list items.
3. **General**:
   - `inbox-viewer-components.tsx` implementation is excellent, particularly the explicit `min-w-[44px] min-h-[44px]` on toolbar buttons.
