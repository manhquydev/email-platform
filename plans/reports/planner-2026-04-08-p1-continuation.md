# P1 Continuation Review
Date: 2026-04-08
Plan: `plans/260408-0230-api-hardening-and-contract-alignment/plan.md`
Branch: `main`

## 1) P1 checklist status (inferred from current repo)

| P1 item | Status | Evidence | Notes |
|---|---|---|---|
| Update swagger server URLs by env | Done | `services/api/src/plugins/swagger.ts` now uses `appConfig.apiUrl` (no hardcoded localhost) | Good baseline landed |
| Add schemas for high-traffic endpoints (`auth/domains/inboxes/messages/webhooks`) | Partial | Route schema blocks exist in those files; `src/test/openapi-contract.test.ts` asserts key paths + status codes | Coverage improved, but still baseline-only, not complete contract breadth |
| Standardize error envelope baseline | Partial | OpenAPI defines `ErrorResponse`; runtime still mixed (`errorHandler.ts` vs route-level `{ error: ... }`) | Needs runtime normalization strategy |
| Expand vitest include or migrate legacy suites | Done | `services/api/vitest.config.ts` includes both `src/test/**/*.test.ts` and `test/**/*.test.ts` | Scope ambiguity resolved |
| Fix broken test imports/setup + Prisma drift in enterprise tests | Partial | Import/setup blockers fixed; test run still failing (`vitest-report.json`: 37 failed tests, enterprise Prisma validation still present) | Functional drift still high |
| Add tests for uncovered modules (`abuse`, `teams`, `support`, `sso`, `scim`, `sepay`, `referral`, `forwarding`) | Partial | New `referral.test.ts` exists; no direct endpoint tests found for other listed modules | Major gap remains |
| Audit unregistered route modules, register/remove with docs+tests | Partial | Admin roadmap modules now registered via `routes/admin/index.ts`; `emailValidationRoutes` still exported but not registered in `server.ts` | Inventory closure incomplete |
| Add CI gate for OpenAPI + route-map diff checks | Partial | `.github/workflows/openapi.yml` exists for spec validate | Missing route-map diff gate; trigger paths currently may miss route code-only changes |

## 2) Immediate continuation TODO (today)

Goal today: close P1 critical uncertainty, reduce failing-test noise, unblock parallel delivery.

1. **P1-T1: Establish single source of truth for current failures (2h)**
- Action: regenerate one fresh backend test report from current HEAD (`services/api/vitest-report.json`) and extract failing suites by category.
- Dependency: none.
- Output: short failure triage note in `plans/reports/` (infra/schema/authz/behavior).

2. **P1-T2: Contract gate tightening scope definition (1.5h)**
- Action: define minimum contract set for "P1 done" (exact paths + required status codes + schema presence).
- Dependency: T1.
- Output: list of required operations used by CI/test (avoid open-ended contract work).

3. **P1-T3: Route inventory truth pass (2h)**
- Action: verify runtime registration for known orphan candidates, explicitly decide keep/register/remove (start with `emailValidationRoutes`).
- Dependency: none (can run parallel with T2).
- Output: one table `module -> decision -> owner -> test required`.

4. **P1-T4: Coverage backfill plan for uncovered modules (2h)**
- Action: define smallest endpoint-test set for `abuse`, `teams`, `support`, `sso`, `scim`, `sepay`, `forwarding` (smoke + authz + one negative each).
- Dependency: T2.
- Output: actionable test task list with file targets.

5. **P1-T5: CI gate delta plan (1.5h)**
- Action: specify changes needed so route code changes trigger OpenAPI validation and add route-map diff gate.
- Dependency: T2, T3.
- Output: CI update checklist with exact workflow/files/scripts.

## 3) Suggested parallelization boundaries (file ownership)

Use 3 parallel tracks. No overlapping file ownership.

### Track A - Contract & docs gate
- Owner scope:
  - `services/api/src/plugins/swagger.ts`
  - `services/api/src/routes/auth.ts`
  - `services/api/src/routes/domains.ts`
  - `services/api/src/routes/inboxes.ts`
  - `services/api/src/routes/messages.ts`
  - `services/api/src/routes/webhooks.ts`
  - `services/api/src/test/openapi-contract.test.ts`
- Deliverable:
  - Contract minimum set finalized and enforced in tests.

### Track B - Test reliability & coverage
- Owner scope:
  - `services/api/vitest.config.ts`
  - `services/api/src/test/enterprise/*`
  - `services/api/src/test/abuse*.test.ts` (new)
  - `services/api/src/test/teams*.test.ts` (new)
  - `services/api/src/test/support*.test.ts` (new)
  - `services/api/src/test/sso*.test.ts` (new)
  - `services/api/src/test/scim*.test.ts` (new)
  - `services/api/src/test/sepay*.test.ts` (new)
  - `services/api/src/test/forwarding*.test.ts` (new)
- Deliverable:
  - Failures reduced to business-known issues only; uncovered module tests present.

### Track C - Route inventory & CI automation
- Owner scope:
  - `services/api/src/server.ts`
  - `services/api/src/routes/admin/index.ts`
  - `services/api/src/routes/domains.ts` (registration decision only)
  - `.github/workflows/openapi.yml`
  - (if added) route inventory scripts under `services/api/scripts/*`
  - `plans/reports/api-endpoint-inventory*.json`
- Deliverable:
  - Explicit registered/unregistered decisions + CI gate for route-map diff.

## 4) Dependency graph (today)
- T1 -> T2 -> (T4, T5)
- T3 -> T5
- T2 + T3 are merge gates before committing CI changes.

## 5) Unresolved questions
1. Is `services/api/vitest-report.json` at `2026-04-08 09:44` the authoritative latest run, or do we need a clean rerun before planning execution?
2. For `emailValidationRoutes`: should we register now, or remove/export behind feature flag until fully productized?
3. Should P1 enforce a single runtime error envelope now, or defer to P2 governance to avoid broad refactor risk?
4. For CI trigger policy: should OpenAPI validation run on every `services/api/src/routes/**` change, or only when schema-annotated routes change?
5. What failure threshold is accepted for “P1 complete” (strict 0 failed tests vs allowlisted known failures)?
