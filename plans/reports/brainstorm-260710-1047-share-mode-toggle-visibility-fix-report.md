# Brainstorm: Share Mode Toggle Visibility Fix

## Problem Statement

Per-inbox share toggle (`shareMode`: `PUBLIC`/`PRIVATE`, controls access to `/inbox-viewer`) exists end-to-end (backend fully wired, no feature flag disabling it) but is effectively invisible to users in the two UI surfaces they actually use:

1. Mobile inbox list tab: toggle button rendered but CSS-hidden below 640px viewport — the exact width the mobile tab runs at.
2. Desktop `/app/manager` (primary dashboard): only shows `Chế độ chia sẻ: {shareMode}` as plain text, no control to change it.

Not a backend bug, not a missing feature — a wiring/CSS gap in already-built components.

## Requirements (confirmed with user)

- Expected output: working toggle visible+functional on (a) mobile inbox tab card, (b) desktop `/app/manager` workspace pane.
- Acceptance: user can change `shareMode` from both locations without needing right-click context menu.
- Scope boundary: NOT touching context menu (works), NOT touching mobile long-press action sheet (works), NOT touching backend, NOT the separate `/inbox-viewer` routing regression (`plans/260409-1638-public-inbox-viewer-regression/plan.md` — unrelated, tracked separately).
- Constraints: reuse existing `ShareModeToggle` component (`inbox-card-modules/inbox-card-components.tsx:61-101`), no new abstractions, no redesign.

## Evidence Gathered

| File | Finding |
|---|---|
| `services/web/src/components/InboxCard.tsx:129-137` | Toggle wrapped in `hidden sm:block`. Comment says "hidden on mobile variant" but `isMobile = variant === 'mobile'` — grep across `services/web/src` confirms `variant="mobile"` is **never used anywhere**, so `!isMobile` is always `true` and the only thing hiding the toggle is the CSS class. |
| `services/web/src/components/mobile/VirtualizedInboxList.tsx:110-124` | Renders `InboxCard` with no `variant` prop → defaults to `'default'` → `hidden sm:block` hides toggle at the exact viewport width (<640px) this mobile-tab list always runs at. Confirmed root cause. |
| `services/web/src/components/inbox-manager/desktop-inbox-layout.tsx:23,45,69` | `onShareModeChange` handler already exists at this layout level and is passed to `LeftPane` (powers the context-menu toggle) but **not passed to `ManagerWorkspacePane`** (line 80-84). |
| `services/web/src/components/inbox-manager/desktop-layout-modules/desktop-manager-workspace-pane.tsx:8-12,64` | `ManagerWorkspacePaneProps` has no `onShareModeChange`; line 64 renders shareMode as static text only. |
| `services/web/src/components/inbox-card-modules/inbox-card-components.tsx:61-101` | `ShareModeToggle` component — fully functional, self-contained, ready to reuse as-is. |

## Approaches Evaluated

**A — Minimal (CSS fix only)**
Remove `hidden sm:block` in `InboxCard.tsx`. Pros: trivial, near-zero risk. Cons: leaves desktop dashboard — the most-used screen — still read-only.

**B — Fix bug + wire desktop dashboard (recommended, chosen)**
Fix A + pass `onShareModeChange` through `desktop-inbox-layout.tsx` into `ManagerWorkspacePane`, replace the read-only text line with the reused `ShareModeToggle` component. Pros: fixes both reported entry points, reuses existing component (DRY), ~3 files. Cons: none material.

**C — Full redesign (rejected)**
Dedicated Share Settings panel/modal, unify all entry points, add copy-link UX. Rejected: over-engineering relative to reported symptom (YAGNI), materially larger effort with no requirement backing it.

## Final Recommended Solution — Approach B

### Fix 1: Mobile toggle visibility
`services/web/src/components/InboxCard.tsx:129-137` — remove the `<div className="hidden sm:block">` wrapper around `<ShareModeToggle />`; render it directly (keep existing `{onShareModeChange && !isMobile && (...)}` guard, it's harmless and matches existing prop contract).

### Fix 2: Desktop dashboard toggle
- `services/web/src/components/inbox-manager/desktop-inbox-layout.tsx` — pass existing `onShareModeChange` prop (already in scope, line 45) down to `<ManagerWorkspacePane />` (currently only passes `activeInbox`, `filteredCount`, `onCreateInbox`).
- `services/web/src/components/inbox-manager/desktop-layout-modules/desktop-manager-workspace-pane.tsx` — add `onShareModeChange: (inboxId: string, mode: ShareMode) => void` to `ManagerWorkspacePaneProps`; import `ShareModeToggle` from `../../inbox-card-modules`; replace the static text line (line 64) with `<ShareModeToggle shareMode={activeInbox.shareMode ?? 'PRIVATE'} onChange={(mode) => onShareModeChange(activeInbox.id, mode)} />`.

## Implementation Considerations / Risks

- Low risk: no backend/schema/API change, no new component, reuses tested `ShareModeToggle`.
- Existing tests to check: `services/web/src/components/mobile/VirtualizedInboxList.test.tsx`, `services/web/src/__tests__/InboxManager.management.test.tsx` — verify they don't snapshot/assert the removed wrapper div or the static text line.
- User selected `/ck:plan --tdd` — write/adjust tests asserting toggle is visible+clickable in both surfaces before implementing.

## Success Metrics / Validation

- Manual: resize browser <640px on mobile inbox tab → toggle visible and clickable.
- Manual: `/app/manager`, select inbox → toggle button present next to share status, click changes `shareMode` via existing `PATCH /inboxes/:id`.
- Automated: existing + new tests green.

## Next Steps

Hand off to `/ck:plan --tdd` with this report as context.

## Unresolved Questions

None — all scope/design decisions confirmed by user during this session.
