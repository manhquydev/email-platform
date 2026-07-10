---
phase: 1
title: Wire Share and Visibility Rules Into Live Page
status: completed
priority: P1
dependencies: []
effort: 1h
---

# Phase 1: Wire Share and Visibility Rules Into Live Page

## Overview

Add a working `ShareModeToggle` and a "Quy tắc hiển thị" (Visibility Rules) button to each inbox card in the real `pages/InboxManager.tsx` (the page actually routed at `/app/manager`). Reuse `ShareModeToggle` (`components/inbox-card-modules`) and `VisibilityRulesPanel` (`components/VisibilityRulesPanel.tsx`) as-is — both are self-contained, independent of the dead `components/inbox-manager/` tree, confirmed via grep (no cross-imports). `VisibilityRulesPanel` fetches its own token via `useAuth()` internally, needs only `inboxId`, `inboxEmail`, `onClose` props.

## Requirements

- Functional: user can toggle `shareMode` (PUBLIC/PRIVATE) per inbox directly from the `/app/manager` card grid, and open the existing Visibility Rules modal for that inbox from the same card.
- Non-functional: reuse `ShareModeToggle` and `VisibilityRulesPanel` unmodified; no new component; no change to backend (already correct — `PATCH /inboxes/:id`, `visibility-rules.ts` routes, `visibility-engine.ts` all confirmed working in prior scout).
- **Critical regression-prevention requirement**: the RED test in this phase MUST render the actual `InboxManager` page component (`import { InboxManager } from '../pages/InboxManager'`), not a decoupled sub-component — this is what the prior mistake skipped, and is why it went undetected.

## Architecture

`pages/InboxManager.tsx` currently renders one card per inbox (lines ~313-352) with three buttons (Mở inbox / Copy email / Xóa) inside `<div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">`. Add:
1. A new async handler `handleShareModeChange(inbox: Inbox, shareMode: ShareMode)` — same pattern as the existing `handleDelete` (uses `api` utility + `token` from `useAuth()`), `PATCH /inboxes/:id` with `{ shareMode }` body, then updates local `inboxes` state via `setInboxes`.
2. New state `const [visibilityRulesInbox, setVisibilityRulesInbox] = useState<Inbox | null>(null)`.
3. Render `<ShareModeToggle shareMode={...} onChange={...} />` inside each card (own row, below the action buttons — it's a full-width styled block, doesn't fit inline with the icon-text buttons).
4. Add a new button "Quy tắc hiển thị" in the existing button row that calls `setVisibilityRulesInbox(inbox)`.
5. Conditionally render `<VisibilityRulesPanel inboxId={visibilityRulesInbox.id} inboxEmail={toInboxEmail(visibilityRulesInbox)} onClose={() => setVisibilityRulesInbox(null)} />` near the existing `{showCreateModal && (...)}` block at the bottom of the component.

## Related Code Files

- Create: `services/web/src/pages/InboxManager.share-visibility.test.tsx`
- Modify: `services/web/src/pages/InboxManager.tsx`

## Implementation Steps

1. **RED** — Create `InboxManager.share-visibility.test.tsx`. Mock `../context/AuthContext` (`useAuth` → fixed token/user, matching the pattern in the existing but now-stale `src/__tests__/InboxManager.management.test.tsx`), mock `../utils/api` (`vi.fn()` resolving inbox list + PATCH), mock `react-hot-toast`. Render the real `<InboxManager />` inside `<MemoryRouter>`. Assert: (a) a share-mode toggle button is present per inbox card, (b) a "Quy tắc hiển thị" button is present per inbox card, (c) clicking the share toggle calls the mocked `api` with `PATCH /inboxes/:id` and `{ shareMode: 'PUBLIC' }`, (d) clicking "Quy tắc hiển thị" renders the `VisibilityRulesPanel` (mock it minimally to avoid pulling in its full API chain, matching how `CreateInboxModal` is already mocked in existing tests). Run `npx vitest run InboxManager.share-visibility.test.tsx` from `services/web` — confirm it fails (neither control exists yet in the current page).
2. **GREEN** — Implement the 5 architecture steps above in `pages/InboxManager.tsx`. Import `ShareModeToggle` from `../components/inbox-card-modules`, `VisibilityRulesPanel` from `../components/VisibilityRulesPanel`, `ShareMode` type from `../types`.
3. Re-run `npx vitest run InboxManager.share-visibility.test.tsx` — confirm it passes.
4. Run the full existing suite touching this page: `npx vitest run src/__tests__/InboxManager.management.test.tsx src/__tests__/InboxManager.search.test.tsx` — both are already `describe.skip`'d (stale, pre-date the current page shape) so should remain skipped/unaffected; confirm no new failures.
5. `npx tsc --noEmit` in `services/web` — confirm clean.
6. Manual check: open `/app/manager` in a real browser, confirm both controls render on inbox cards, share toggle flips `shareMode` via network tab, Visibility Rules button opens the modal and it functions (list/add/edit rules) same as it did when reachable via the old dead-code path.

## Success Criteria

- [x] `InboxManager.share-visibility.test.tsx` created, renders the REAL `pages/InboxManager.tsx`, fails before fix (RED), passes after (GREEN). Code-reviewer independently re-verified the live-route claim by tracing `App.tsx` and the test's import path.
- [x] `ShareModeToggle` rendered per inbox card in `pages/InboxManager.tsx`, wired to a real `PATCH /inboxes/:id` handler.
- [x] "Quy tắc hiển thị" button rendered per inbox card, opens `VisibilityRulesPanel` for that inbox.
- [x] No new component created; both reused as-is.
- [x] `tsc --noEmit` clean; no regression in any other currently-passing test (226 passed vs 223 before, same 10 pre-existing unrelated `EmailStream.labels.test.tsx` failures).
- [ ] Manual browser verification — still not performed in this session (no dev server run); flagged as open by code-reviewer too.

## Post-Review Amendment

Code-reviewer flagged a UX papercut: non-owner users viewing a "Shared" inbox saw the toggle/rules button render but always fail with a generic error (backend correctly 403s, but the UI didn't explain why). User decided to hide both controls when `!isOwnInbox` (same ownership check already used for the existing "Shared" badge: `user?.id && inbox.ownerId && inbox.ownerId !== user.id`). Implemented, added a 4th test case (`hides the share toggle and visibility rules button for inboxes the user does not own`), re-verified: 4/4 tests pass, `tsc --noEmit` clean, full suite still only shows the same pre-existing unrelated `EmailStream.labels.test.tsx` failures.

## Risk Assessment

Medium (elevated from the prior phase's "Low" specifically because the prior "Low" risk assessment was itself wrong — it never questioned whether the touched component was reachable). Mitigation: the RED test renders the real page component by import path, which fails loudly if the controls aren't actually in the live render tree — this is the concrete guard against repeating the same class of mistake. Secondary risk: `ShareModeToggle`'s full-width bordered-block styling may look visually awkward inside the compact card grid layout of `InboxManager.tsx` (different visual language than the old 2-pane UI it was designed for) — flagged for manual visual check, no code mitigation planned unless the user finds it unacceptable after seeing it.
