---
phase: 2
title: Desktop Workspace Pane Toggle
status: completed
priority: P2
dependencies: []
effort: 45m
---

# Phase 2: Desktop Workspace Pane Toggle

## Overview

Thread the existing `onShareModeChange` handler (already available in `desktop-inbox-layout.tsx`, already wired to the working context-menu toggle) down into `ManagerWorkspacePane`, and replace the read-only `Chế độ chia sẻ: {shareMode}` text with the reused `ShareModeToggle` component. This is the primary `/app/manager` dashboard — the most-used screen — currently showing state with no way to change it.

## Requirements

- Functional: user can toggle `shareMode` for the selected inbox directly from the `/app/manager` right-hand pane, using the same `PATCH /inboxes/:id` path already exercised by the context-menu toggle.
- Non-functional: reuse `ShareModeToggle` as-is (no new component); no change to `onShareModeChange`'s existing signature or call sites (`LeftPane` continues to work unmodified).

## Architecture

`onShareModeChange: (inboxId: string, mode: ShareMode) => void` already exists in `DesktopInboxLayoutProps` (`desktop-inbox-layout.tsx:23`) and is passed to `LeftPane` (line 69). Same prop gets passed to `ManagerWorkspacePane` (currently only receives `activeInbox`, `filteredCount`, `onCreateInbox` at lines 80-84). Inside `ManagerWorkspacePane`, `ShareModeToggle` (imported from `../../inbox-card-modules`) replaces the static text line, bound via `onChange={(mode) => onShareModeChange(activeInbox.id, mode)}`.

## Related Code Files

- Create: `services/web/src/components/inbox-manager/desktop-layout-modules/desktop-manager-workspace-pane.test.tsx`
- Modify: `services/web/src/components/inbox-manager/desktop-layout-modules/desktop-manager-workspace-pane.tsx`
- Modify: `services/web/src/components/inbox-manager/desktop-inbox-layout.tsx`

## Implementation Steps

1. **RED** — Create `desktop-manager-workspace-pane.test.tsx` (vitest + RTL). Render `ManagerWorkspacePane` with an `activeInbox` (`shareMode: 'PRIVATE'`) and an `onShareModeChange` mock (`vi.fn()`). Assert: (a) a clickable toggle button is present (not just the word "PRIVATE" as plain text), (b) clicking it calls `onShareModeChange(activeInbox.id, 'PUBLIC')`. Run `npx vitest run desktop-manager-workspace-pane.test.tsx` from `services/web` — confirm it fails (current component has no `onShareModeChange` prop, renders static text only).
2. **GREEN** — In `desktop-manager-workspace-pane.tsx`:
   - Add `onShareModeChange: (inboxId: string, mode: ShareMode) => void` to `ManagerWorkspacePaneProps` (import `ShareMode` type from `../../../types`).
   - Import `ShareModeToggle` from `../../inbox-card-modules`.
   - Replace line 64 (`<div className="text-text-secondary">Chế độ chia sẻ: {activeInbox.shareMode ?? "PRIVATE"}</div>`) with `<ShareModeToggle shareMode={(activeInbox.shareMode as 'PUBLIC' | 'PRIVATE') ?? 'PRIVATE'} onChange={(mode) => onShareModeChange(activeInbox.id, mode)} />`.
3. In `desktop-inbox-layout.tsx`, add `onShareModeChange={onShareModeChange}` to the `<ManagerWorkspacePane />` call (line 80-84) — the prop already exists on `DesktopInboxLayoutProps` and is already received by the component, just wasn't forwarded.
4. Re-run `npx vitest run desktop-manager-workspace-pane.test.tsx` — confirm it passes.
5. Manual check: open `/app/manager`, select an inbox, confirm the toggle button renders in the "Inbox đang chọn" section and clicking it fires `PATCH /inboxes/:id` and updates the displayed state.

## Success Criteria

- [x] `desktop-manager-workspace-pane.test.tsx` created, fails before fix (RED), passes after (GREEN).
- [x] `onShareModeChange` threaded from `desktop-inbox-layout.tsx` into `ManagerWorkspacePane`.
- [x] Static text line replaced with reused `ShareModeToggle`; no new toggle component created.
- [ ] Manual verification: toggle works on `/app/manager`, persists via existing `PATCH /inboxes/:id`. (not verified in a real browser this session)

## Risk Assessment

Low — additive prop threading, no existing prop or call site removed (`LeftPane` untouched). Only manual-check risk: `ShareModeToggle` is styled as a full-width bordered button block (`inbox-card-modules/inbox-card-components.tsx:70-100`); confirm it fits visually inside the "Inbox đang chọn" summary section without layout overflow — no code mitigation planned unless observed during manual check.
