# Red-Team Review — Scope Auditor — Post-login UI Redesign Plan

Role: Scope Auditor. Focus: state/lifetime boundaries for every add/remove, dead-code deletion reachability, shared-state leaks, redundant existing state. All findings verified by direct grep against `services/web/src` (GitNexus hover results included where the tool surfaced them alongside the grep).

## Finding 1: Phase 3 deletes `QuickGenerateCard`, but its only importer is a Phase-4-owned dead file — cross-phase build break

- **Severity:** Critical
- **Location:** Phase 3 "Related Code Files" (`Delete (after impact re-check): src/components/QuickGenerateCard*`) vs. Phase 4 "Related Code Files" (`focus-dashboard-modules/welcome-state.tsx` confirmed dead)
- **Flaw:** `src/components/QuickGenerateCard.tsx`'s sole importer in the entire codebase is `src/pages/focus-dashboard-modules/welcome-state.tsx:6` (`import { QuickGenerateCard } from '../../components/QuickGenerateCard';`). `welcome-state.tsx` itself is correctly identified as dead by **Phase 4** ("`WelcomeState` GitNexus-confirmed zero-consumer — safe to delete") — but Phase 4 runs two phases *after* Phase 3, which is where `QuickGenerateCard.tsx` gets deleted.
- **Failure scenario:** Phase 3 completes and deletes `src/components/QuickGenerateCard.tsx` + `src/components/quick-generate-card-modules/*` (its `impactedCount` at delete-time will correctly show only `welcome-state.tsx` as a consumer, which the agent may dismiss as "already dead, so 0 real impact"). `welcome-state.tsx` is NOT scheduled for deletion until Phase 4. Between Phase 3 and Phase 4, `welcome-state.tsx` still physically exists in `src/` with a static import to a now-nonexistent module. `services/web/package.json:8` build script is `"build": "node scripts/generate-version.js && tsc -b && vite build"` — `tsc -b` type-checks via `tsconfig.app.json` which has `"include": ["src"]` (only excludes `*.test.*`/`*.spec.*`), so it compiles `welcome-state.tsx` regardless of route-reachability. Result: `tsc -b` fails with `TS2307: Cannot find module '../../components/QuickGenerateCard'` — the entire app fails to build for the duration between the two phase commits (and CI/any intermediate deploy in that window breaks).
- **Evidence:**
  - `src/pages/focus-dashboard-modules/welcome-state.tsx:6` — `import { QuickGenerateCard } from '../../components/QuickGenerateCard';`
  - Grep for `from ['"].*components/QuickGenerateCard['"]` across `src/` returns exactly this one hit — no other importer exists.
  - `services/web/package.json:8`, `services/web/tsconfig.app.json:31-33` (`"include": ["src"]`).
- **Suggested fix:** Either (a) delete `welcome-state.tsx` in the same phase/commit as `QuickGenerateCard.tsx` (move the dead-code deletion into Phase 3, since Phase 3 is what triggers it becoming provably dead-weight), or (b) delete `QuickGenerateCard.tsx` in Phase 4 alongside `welcome-state.tsx`, not in Phase 3. Do not split a dead-code chain's leaf and root across non-adjacent phases.

## Finding 2: Phase 2 attributes `EmailStream` dead-code cleanup to itself, but the actual (dead) consumer belongs to Phase 4 — same cross-phase dangling-import bug as Finding 1

- **Severity:** Critical
- **Location:** Phase 2 "Key Insights" bullet 4 and "Implementation Steps" step 1 ("If dead, it's this phase's dead-code deletion... since it's inbox-reading-shaped code")
- **Flaw:** `EmailStream.tsx`'s only non-test importer in the codebase is `src/components/dashboard/MessageListPane.tsx:11` (`import { EmailStream } from "../EmailStream";`). `MessageListPane.tsx` is explicitly listed for deletion in **Phase 4** ("`Delete (after fresh impact re-check): src/components/dashboard/MessageListPane.tsx, MessageDetailPane.tsx, MobileSidebar.tsx`"). `EmailStream` is not reachable from `InboxWorkspace`/`InboxManager` at all — it is dashboard dead-tree code, not "inbox-reading-shaped" code as Phase 2 assumes.
- **Failure scenario:** If Phase 2 runs its own `gitnexus_impact` check on `EmailStream`, sees a nonzero-but-only-from-dead-code result, and (per its own instruction) deletes `EmailStream.tsx` as "this phase's dead-code deletion," then `src/components/dashboard/MessageListPane.tsx` — which is not deleted until Phase 4 — is left with a dangling import to a file that no longer exists. `tsc -b` (same `include: ["src"]` config as Finding 1) breaks for every commit between Phase 2 and Phase 4.
- **Evidence:**
  - `src/components/dashboard/MessageListPane.tsx:11` — `import { EmailStream } from "../EmailStream";`
  - Grep for `from ['"].*components/EmailStream['"]` across `src/` returns exactly two hits: this one and a test file (`__tests__/EmailStream.labels.test.tsx`, excluded from `tsc` via `tsconfig.app.json` test exclusions, so it doesn't affect the build-break analysis but confirms no other production consumer).
  - Phase 4 "Related Code Files": `Delete (after fresh impact re-check): src/components/dashboard/MessageListPane.tsx...`
- **Suggested fix:** Reassign `EmailStream.tsx` + `email-stream-modules/*` deletion to Phase 4 (where its actual consumer `MessageListPane.tsx` lives), not Phase 2. Phase 2's framing ("if dead, it's this phase's cleanup because it's inbox-reading-shaped") is a naming-based guess, not a verified import-graph fact — the file's real coupling is to the Phase-4 dashboard dead tree.

## Finding 3: Phase 1 deletes `ConfirmationModal.tsx` without accounting for callers on routes entirely outside the plan's 6-phase scope

- **Severity:** Critical
- **Location:** Phase 1 "Related Code Files" (`Delete (after impact re-check + migrating callers): src/components/ConfirmationModal.tsx`) and Phase 5 (only tracks the `MyDomains.tsx` call site)
- **Flaw:** `ConfirmationModal` is imported by `src/pages/Forwarding.tsx:10` and `src/pages/Authenticator.tsx:5`, both of which are live, routed pages (`App.tsx:137` `<Route path="/authenticator" .../>`, `App.tsx:140` `<Route path="/forwarding" .../>`). Neither page is one of the plan's stated "5 live post-login page areas" (`/app`, `/app/manager`, `/app/inbox/:inboxId`, `/my-domains`, `/settings` per `plan.md` line 26) and neither is mentioned in any phase's Related Code Files.
- **Failure scenario:** Phase 1 migrates only the callers it's aware of (implicitly assumed to be inside the 6-phase scope) and deletes `ConfirmationModal.tsx`. `Forwarding.tsx` and `Authenticator.tsx` — pages the plan never touches — retain `import { ConfirmationModal } from "../components/ConfirmationModal";` pointing at a deleted file. `tsc -b` breaks immediately at Phase 1's own commit (not even a cross-phase window this time — Phase 1 alone breaks the build unless these two out-of-scope pages are migrated as an unplanned side effect).
- **Evidence:**
  - `src/pages/Forwarding.tsx:10,147,158` — imports and renders `<ConfirmationModal>` twice.
  - `src/pages/Authenticator.tsx:5,82` — imports and renders `<ConfirmationModal>`.
  - `src/App.tsx:137,140` — both routes are live (`/authenticator`, `/forwarding`), not lazy-dead.
  - Grep `ConfirmationModal` across `src/` also surfaces `src/components/Auth/PasskeyManager.tsx` as a caller — worth re-verifying it's actually covered by Phase 6 (Settings → Security tab) before assuming it's in scope.
- **Suggested fix:** Before deleting `ConfirmationModal.tsx` in Phase 1, either (a) migrate ALL callers repo-wide (including `Forwarding.tsx`, `Authenticator.tsx`, `PasskeyManager.tsx`) as part of Phase 1's own scope — which is itself a quiet scope expansion beyond "5 post-login page areas" that needs explicit user sign-off — or (b) keep `ConfirmationModal.tsx` alive until every caller across the whole app (not just the 6 phases) is migrated, and say so explicitly in the plan's constraints.

## Finding 4: `LeftPane`/`ManagerWorkspacePane` (+ a dedicated test file) become orphaned once `desktop-inbox-layout.tsx` is deleted, but are absent from Phase 3's delete list — dead code and a phantom test survive the "cleanup" phase

- **Severity:** High
- **Location:** Phase 3 "Related Code Files" — lists `desktop-inbox-layout.tsx` for deletion but not its exclusive children
- **Flaw:** `src/components/inbox-manager/desktop-layout-modules/desktop-left-pane.tsx` (`LeftPane`) and `desktop-manager-workspace-pane.tsx` (`ManagerWorkspacePane`) have exactly one production consumer each: `desktop-inbox-layout.tsx:6` (`import { LeftPane, ManagerWorkspacePane } from "./desktop-layout-modules";`). Phase 3 correctly schedules `desktop-inbox-layout.tsx` for deletion but never mentions `desktop-left-pane.tsx`, `desktop-manager-workspace-pane.tsx`, or `desktop-manager-workspace-pane.test.tsx` — because Phase 3 also states `desktop-layout-modules/desktop-middle-pane.tsx` "IS live... do NOT delete" and treats the whole `desktop-layout-modules/` folder as a mixed no-touch zone without auditing which files inside it are actually live vs. dead.
- **Failure scenario:** After Phase 3 "completes" (deletes `desktop-inbox-layout.tsx`, `mobile-inbox-layout.tsx`, etc.), `desktop-left-pane.tsx` and `desktop-manager-workspace-pane.tsx` remain in the tree as newly-orphaned dead code, permanently below the plan's radar (no later phase revisits `desktop-layout-modules/`). Worse, `desktop-manager-workspace-pane.test.tsx` continues to pass in CI, exercising a component (`ManagerWorkspacePane`) that is no longer reachable from any route — a phantom test that gives false confidence the redesign phase is "clean."
- **Evidence:**
  - `src/components/inbox-manager/desktop-layout-modules/index.ts:4-5,8` exports `LeftPane` and `ManagerWorkspacePane`.
  - `src/components/inbox-manager/desktop-inbox-layout.tsx:6,56,80` is the only production import site of both.
  - `src/components/inbox-manager/desktop-layout-modules/desktop-manager-workspace-pane.test.tsx:8` imports `ManagerWorkspacePane` directly by file path (bypasses the dead barrel, so the test alone won't catch that the component is unreachable in production).
  - GitNexus symbol lookup for `LeftPane`/`ManagerWorkspacePane` returned no other callers.
- **Suggested fix:** Add `desktop-left-pane.tsx`, `desktop-manager-workspace-pane.tsx`, and `desktop-manager-workspace-pane.test.tsx` to Phase 3's explicit delete list (re-verify with `gitnexus_impact` per the plan's own methodology, same as its siblings). Do not blanket-protect `desktop-layout-modules/` just because one file (`desktop-middle-pane.tsx`) in it is live.

## Finding 5: `components/inbox-manager/hooks/*` is blanket-protected as "do NOT touch" in Phases 2 and 3, but 3 of its files have zero consumers — contradicts the plan's own per-file audit rule

- **Severity:** High
- **Location:** Phase 2 "Related Code Files" (`Do NOT modify... use-inbox-manager-data.ts, use-inbox-search.ts`) and Phase 3 "Related Code Files" (`Do NOT touch: src/components/inbox-manager/hooks/*`)
- **Flaw:** Only two files in `components/inbox-manager/hooks/` are actually imported by production code: `use-inbox-manager-data.ts` and `use-inbox-search.ts` (both directly imported by file path in `src/pages/InboxWorkspace.tsx:7-8`). The remaining three files — `use-inbox-manager-actions.ts`, `use-inbox-data.ts`, `use-inbox-actions.ts` — are exported only through `hooks/index.ts`, and that barrel itself has zero importers anywhere in `src/` (grep for `from ['"].*inbox-manager['"]` matches nothing). Phases 2 and 3 both write a folder-level blanket exemption ("do NOT touch `hooks/*`") instead of auditing file-by-file — exactly the anti-pattern Phase 4 explicitly warns against elsewhere in the same plan ("do not assume dead without a fresh per-file `gitnexus_impact` upstream check... do not batch-assume based on folder name alone").
- **Failure scenario:** Because the whole folder is marked untouchable, `use-inbox-manager-actions.ts`, `use-inbox-data.ts`, and `use-inbox-actions.ts` are guaranteed to survive the entire 6-phase redesign as unflagged dead code — the inverse of the QuickGenerateCard/EmailStream failures above, but still a scope-auditing miss: dead state-management hooks (with `api`/`useAuth` calls per GitNexus) never get inventoried or scheduled for cleanup because the folder-level rule short-circuits the per-file check the plan otherwise insists on.
- **Evidence:**
  - `src/pages/InboxWorkspace.tsx:7-8` — direct file-path imports of only `use-inbox-manager-data` and `use-inbox-search`.
  - `src/components/inbox-manager/hooks/index.ts:4-5,10-11,16-17,19-20` — barrel exports `useInboxData`, `useInboxActions`, `useInboxManagerData`, `useInboxManagerActions`.
  - Grep `from ['"].*inbox-manager['"]` (the barrel import path) across `src/` returns zero hits — nothing imports the barrel.
  - Direct grep for `useInboxManagerActions`, `use-inbox-data['"]`, `use-inbox-actions['"]` outside the hooks folder itself: zero hits.
- **Suggested fix:** Scope the "do NOT touch" exemption to the two confirmed-live files (`use-inbox-manager-data.ts`, `use-inbox-search.ts`) only. Run the standard per-file `gitnexus_impact` check on `use-inbox-manager-actions.ts`, `use-inbox-data.ts`, `use-inbox-actions.ts` before deciding their fate — either fold them into Phase 3's dead-code delete list or explicitly document them as known-dead-but-deferred, rather than silently exempting them via folder-name pattern matching.

---

## Unresolved Questions

1. Is `src/components/Auth/PasskeyManager.tsx` (a `ConfirmationModal` caller) actually mounted inside Phase 6's Settings → Security tab scope, or is it reachable from another out-of-scope route? Not fully traced in this review — verify before Phase 1 deletes `ConfirmationModal.tsx`.
2. Does the team want `EmailStream.tsx`/`email-stream-modules/*` deletion reassigned to Phase 4 (per Finding 2), or should Phase 2 keep first-mover claim and simply add `MessageListPane.tsx`/`MessageDetailPane.tsx` to its own delete list instead (pulling part of Phase 4's scope forward)? Either resolves the cross-phase break; the plan needs to pick one and update both phase files consistently.

Status: DONE
