---
title: Wire Share Toggle and Visibility Rules into Live InboxManager Page
description: >-
  Correction plan: prior fix
  (plans/260710-1047-share-mode-toggle-visibility-fix) modified a component tree
  that turned out to be dead code, unreachable from any route. This plan wires
  the same reused components into the actual live /app/manager page.
status: completed
priority: P1
branch: main
tags:
  - ui-fix
  - tdd
  - share-mode
  - visibility-rules
  - correction
blockedBy: []
blocks: []
created: '2026-07-10T04:32:16.391Z'
createdBy: 'ck:plan'
source: skill
---

# Wire Share Toggle and Visibility Rules into Live InboxManager Page

## Overview

**Correction of a prior mistake.** Plan `plans/260710-1047-share-mode-toggle-visibility-fix` fixed the share-toggle visibility bug in `services/web/src/components/InboxCard.tsx` and `desktop-manager-workspace-pane.tsx` — but that whole component tree (`DesktopInboxLayout`, `ManagerWorkspacePane`, `InboxCard`, `VirtualizedInboxList`, `VisibilityRulesPanel` wiring via `inbox-manager-modals.tsx`) is **not reachable from any route**. Confirmed via grep: nothing under `services/web/src/pages/` imports from `components/inbox-manager` or `InboxCard`. `App.tsx:123` routes `/app/manager` to `services/web/src/pages/InboxManager.tsx` — a separate, simpler "Inbox Manager 2.0" grid-card page (introduced by a later refactor per git log: "revamp user dashboard and improve inbox manager UX", "split inbox workspace...") that has **zero** share or visibility-rules UI. The prior fix was real, tested, reviewed — just applied to dead code.

This plan wires the same already-working, already-reused components (`ShareModeToggle`, `VisibilityRulesPanel`) directly into the actual live `pages/InboxManager.tsx`, following the same reuse-only, no-new-abstraction approach as before, this time verified by a test that renders the real page component (which would have caught the previous mistake immediately).

**User-confirmed scope:** reuse the existing rule-based Visibility Rules system as-is (not building a new manual per-message checkbox picker — that doesn't exist and is out of scope).

**Out of scope:** the orphaned `components/inbox-manager/` tree is left as-is (not deleted, not further modified) — cleanup is a separate decision or a genuine "different UI path" the user may still want in future; not conflated with this fix.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Wire Share and Visibility Rules Into Live Page](./phase-01-wire-share-and-visibility-rules-into-live-page.md) | Completed |

## Dependencies

<!-- Cross-plan dependencies -->
