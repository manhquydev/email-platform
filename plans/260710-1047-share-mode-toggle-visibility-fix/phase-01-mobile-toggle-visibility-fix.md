---
phase: 1
title: Mobile Toggle Visibility Fix
status: completed
priority: P2
dependencies: []
effort: 30m
---

# Phase 1: Mobile Toggle Visibility Fix

## Overview

Remove the `hidden sm:block` wrapper in `InboxCard.tsx` that hides the already-functional `ShareModeToggle` on narrow viewports (<640px) — the exact width the mobile inbox tab always renders at. TDD: write a failing test proving the toggle is unreachable in DOM query terms first, then fix.

## Requirements

- Functional: `ShareModeToggle` renders unconditionally whenever `onShareModeChange` prop is provided (existing `!isMobile` guard stays — it's a no-op today since `variant='mobile'` is never passed, but removing it is out of scope for this fix).
- Non-functional: no visual regression on desktop card layout; no change to `ShareModeToggle` component itself (reuse as-is).

## Architecture

No structural change — deletes one wrapper `<div>` around an already-correct component call. No new props, no new files besides the test.

## Related Code Files

- Create: `services/web/src/components/InboxCard.test.tsx`
- Modify: `services/web/src/components/InboxCard.tsx` (lines 129-137)

## Implementation Steps

1. **RED** — Create `services/web/src/components/InboxCard.test.tsx` (vitest + `@testing-library/react`, follow conventions in `services/web/src/components/mobile/VirtualizedInboxList.test.tsx`). Render `InboxCard` with a mock `Inbox` (`shareMode: 'PRIVATE'`) and `onShareModeChange` prop set. Assert the share toggle button (`getByRole('button', { name: /riêng tư/i })` or by `title` attr) exists AND that none of its ancestor elements up to the card root carry a `hidden` class (query the DOM tree / use `closest('.hidden')` returns null). Run `npx vitest run InboxCard.test.tsx` from `services/web` — confirm it fails against current code (the `hidden sm:block` wrapper is present).
2. **GREEN** — In `InboxCard.tsx:129-137`, remove the `<div className="hidden sm:block">...</div>` wrapper; render `<ShareModeToggle shareMode={...} onChange={onShareModeChange} />` directly inside the existing `{onShareModeChange && !isMobile && (...)}` guard.
3. Re-run `npx vitest run InboxCard.test.tsx` — confirm it passes.
4. Run the broader touched-area suite: `npx vitest run VirtualizedInboxList.test.tsx InboxManager.management.test.tsx InboxManager.search.test.tsx` from `services/web` — these mock `InboxCard` so should be unaffected; confirm no regression.
5. Manual check: run the web app, open the mobile inbox tab (or resize browser <640px), confirm the share toggle button is visible and clicking it flips `shareMode` (network tab shows `PATCH /inboxes/:id`).

## Success Criteria

- [x] `InboxCard.test.tsx` created, fails before the fix (RED), passes after (GREEN).
- [x] `hidden sm:block` wrapper removed from `InboxCard.tsx`.
- [x] `VirtualizedInboxList.test.tsx`, `InboxManager.management.test.tsx`, `InboxManager.search.test.tsx` still pass unmodified.
- [ ] Manual verification: toggle visible and clickable on <640px viewport in mobile inbox tab. (not verified in a real browser this session — code-reviewer flagged this as the one open item)

## Risk Assessment

Low. Single CSS-class removal, no logic change, `ShareModeToggle` component untouched. Only spot-check risk: confirm the card doesn't visually overflow on very narrow widths now that the toggle always renders (quick manual check, no code mitigation needed unless observed).
