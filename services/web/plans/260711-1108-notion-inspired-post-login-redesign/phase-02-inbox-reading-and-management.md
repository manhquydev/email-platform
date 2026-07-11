---
phase: 2
title: "Inbox Reading and Management"
status: completed
effort: ""
---

# Phase 2: Inbox Reading and Management

## Overview

Highest-priority page redesign (user's explicit emphasis): `/app/inbox/:inboxId` — `InboxWorkspace.tsx` + `email-viewer/*`. Restyle message list + reading pane to Notion-inspired density/typography using Phase 1 tokens; keep the existing `@tanstack/react-virtual`-based `EmailStream` virtualization as-is (no library swap); preserve the sandboxed-iframe email body rendering (already correct per research) and the OTP banner behavior unchanged.

Priority: P1 (user's stated priority page).
Depends on: Phase 1 (tokens/primitives).

Research basis: `researcher-260711-1122-design-tokens-email-ux-report.md` (email reading-pane UX patterns).

**Revised after red team review (2026-07-11):** `EmailStream.tsx` was wrongly flagged as possibly-dead — it's confirmed LIVE (directly imported by `desktop-middle-pane.tsx` and `mobile-messages-tab.tsx`, the exact components this phase restyles). It is now in-scope for restyling, not deletion. The `react-virtuoso` adoption idea is dropped — `EmailStream` already uses `@tanstack/react-virtual`, and swapping virtualization libraries is a functional migration disguised as visual work, out of scope here (red team findings #4, #8).

## Key Insights

- Live component chain: `InboxWorkspace.tsx` → `components/inbox-manager/desktop-layout-modules/desktop-middle-pane.tsx` (message list, when no message selected) → swaps to `components/email-viewer/MessageViewer.tsx` (composes `EmailHeader`, `EmailBody`, `EmailActionToolbar`, `AttachmentGrid`, `OTPBanner`) when a message is selected. Mobile: full-screen swap, `MessageViewer variant="modal"`.
- `EmailBody.tsx` already renders the message body inside a sandboxed `<iframe srcDoc>` with an image-block toggle — this is the industry-correct pattern (confirmed by research, matches Gmail/Superhuman). **Do not change the sandboxing/sanitization mechanism.** Only restyle the chrome around it (header, toolbar, spacing, typography of non-iframe UI).
- Two virtualization libs coexist in the codebase (`react-virtuoso` in public `InboxViewer`, `@tanstack/react-virtual` in `EmailStream`). Research recommended `react-virtuoso` as a general 2026 default, but red team review confirmed `EmailStream` (the live message list here) already uses `@tanstack/react-virtual` — **keep it as-is**. Consolidating virtualization libraries is a separate functional-consistency cleanup, not part of this visual redesign.
- `EmailStream.tsx`/`email-stream-modules/*` is CONFIRMED LIVE (red team finding #4) — directly imported by `desktop-middle-pane.tsx` and `mobile-messages-tab.tsx`. It is the actual message-list renderer this phase restyles. Do not attempt to delete it.
- Message row pattern (research): 52-64px height, unread = left border (3-4px accent) + subtle bg tint (not full-background color change), 32px circular avatar with initials, single-line subject truncate + muted preview snippet.
- OTP banner: preserve exact detection/copy behavior (business logic, out of scope for visual redesign) — only restyle banner chrome/placement per Phase 1 tokens.
- Attachment preview: current icon+filename+size pattern (no inline thumbnails) is the research-recommended safe default — keep as-is, restyle only.

## Requirements

- Functional: message read/unread, pin/archive/delete, attachment download, OTP detect/copy, image-block toggle, HTML/Text view switch — all unchanged behavior.
- Non-functional: both light+dark; desktop 2-pane + mobile full-screen swap layout preserved (no new layout paradigm — do NOT resurrect the unused `SplitPaneLayout` 3-pane component, it stays deleted per Phase 3 or earlier dead-code sweep if not already gone).

## Related Code Files

- Modify: `src/pages/InboxWorkspace.tsx`
- Modify: `src/components/inbox-manager/desktop-layout-modules/desktop-middle-pane.tsx` (renders `EmailStream` — restyle chrome around it)
- Modify: `src/components/EmailStream.tsx`, `src/components/email-stream-modules/*` (confirmed live message-list renderer — restyle rows per research pattern: row height, unread state, avatar, truncation; keep `@tanstack/react-virtual` as-is)
- Modify: `src/components/email-viewer/MessageViewer.tsx`
- Modify: `src/components/email-viewer/EmailHeader.tsx`, `EmailBody.tsx` (chrome only, keep iframe sandboxing), `EmailActionToolbar.tsx`, `AttachmentGrid.tsx`, `OTPBanner.tsx` (verify exact file names at execution time — scout inferred names from composition, not confirmed 1:1 file listing)
- Do NOT modify (shared with Phase 3, logic-only, no UI change needed here): `src/components/inbox-manager/hooks/use-inbox-manager-data.ts`, `use-inbox-search.ts`

## Implementation Steps

1. Confirm exact file names for `EmailHeader`/`EmailActionToolbar`/`AttachmentGrid`/`OTPBanner` via `gitnexus_context({name: "MessageViewer"})` outgoing refs or a directory listing of `components/email-viewer/`.
2. Restyle `EmailStream.tsx`/`email-stream-modules/*` message rows to the research-recommended pattern (row height, unread state, avatar, truncation) using Phase 1 tokens — keep `@tanstack/react-virtual` integration untouched.
3. Restyle `desktop-middle-pane.tsx` chrome around the message list.
4. Restyle `MessageViewer`/`EmailHeader`/`EmailActionToolbar`/`AttachmentGrid`/`OTPBanner` chrome — keep `EmailBody`'s body-rendering mechanism untouched, only restyle surrounding spacing/typography/toolbar.
5. Restyle mobile full-screen swap variant (`MessageViewer variant="modal"`).
6. Verify light+dark, empty state (no message selected), populated state, attachment-present state, OTP-present state, image-blocked state.

## Success Criteria

- [x] Message list + reading pane visually match Phase 1 `semantic-*` tokens in both light+dark (structurally verified — no legacy `nebula-`/`v3-` classes remain, grep-confirmed)
- [x] `EmailBody` sandboxing mechanism unchanged (security-critical) — `sandbox="allow-same-origin"`, `srcDoc`, and `sanitizedHtml` computation confirmed byte-identical to HEAD by both tester and code-reviewer independently
- [x] OTP banner detect/copy, attachment download, pin/archive/delete, image-block toggle all functionally unchanged — event handlers/state/hooks untouched, verified via diff
- [~] Desktop 2-pane + mobile full-screen swap layouts — structurally verified via diff (no layout-breaking changes); full manual dev-server walkthrough not performed this session (optional follow-up)
- [x] `EmailStream`/`email-stream-modules` restyled in place (confirmed live, not deleted)
- [x] Scope check — confirmed via `git status`: exactly the 12 expected files touched

## Fixes Applied Post-Review

- **Broken focus ring** (`InboxWorkspace.tsx`, 2 occurrences): `ring-[var(--semantic-focus-ring)]` misused a box-shadow-shaped CSS var as a Tailwind ring color, silently dropping the focus ring (accessibility regression). Fixed to `focus:ring-2 focus:ring-semantic-accent/50`, matching Phase 1's `Input.tsx` convention.
- **6 test assertions updated** in `EmailStream.labels.test.tsx` to match intentional new markup: OTP button text (was `"OTP: 654321"`, now bare code `"654321"` — copy behavior itself unchanged), unread/selected row classes (`from-primary` → `border-l-semantic-accent`/`bg-semantic-*`), and subject+preview single-line format (140-char truncation, `"— "` separator, was two-line 120-char clamp).

## Known Pre-Existing Issue (not caused by this phase, not fixed)

`EmailStream.labels.test.tsx`'s 8 "Labels Display" tests fail due to a data-shape mismatch between test mocks (flat `{id, name, color}`) and the component's actual expected shape (`{label: {id, name, color}}`) in `email-stream-components.tsx`. Confirmed present in the codebase at `HEAD` (Phase 1's commit `c784e9d`), i.e. before this phase touched the file — a pre-existing bug unrelated to the visual redesign, out of Phase 2's scope. Flagged for separate triage.

## Decision Log

- Label display was condensed from full-width pills-with-text to compact colored dots (names in a hover `title` tooltip only, capped at 3 visible) to fit the spec-mandated 52-64px row height. This is a minor information-density trade-off, not a functional regression — flagged by code review, accepted as within the phase's visual-restyle intent.

## Risk Assessment

- **Risk:** touching `EmailBody.tsx`'s body-rendering/sanitization logic while restyling — highest-severity mistake possible in this phase (XSS surface). **Mitigation:** review diff specifically for the iframe/sandbox/sanitizer lines before commit; if none changed, good.
- **Risk:** virtualizer swap (tanstack → virtuoso) introduces scroll-position or dynamic-height bugs. **Mitigation:** treat as optional/deferrable within this phase; core ask is visual restyle, not virtualization consolidation — don't block phase completion on it.
- **Risk:** `use-inbox-manager-data.ts`/`use-inbox-search.ts` are shared with Phase 3 (`InboxManager.tsx` doesn't use them per Phase 3 notes, but confirm no accidental shared-state coupling when restyling consumers). **Mitigation:** UI-only changes, no hook signature changes.

## Security Considerations

- `EmailBody.tsx`'s sandboxed body rendering is the XSS defense boundary for untrusted email HTML — this phase must not weaken it. No new raw-HTML injection APIs added.
- Red team finding #15: the sandboxing's safety is entirely contingent on never adding `allow-scripts` to the sandbox attribute (no DOMPurify layer exists as backup). Explicitly verify the sandbox attribute value is unchanged after restyle, not just visually spot-checked.
