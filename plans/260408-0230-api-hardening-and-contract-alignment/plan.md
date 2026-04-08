---
title: "API hardening and contract alignment plan"
description: "Close production-critical API gaps from live/code/test audits and define hard readiness gates."
status: in_progress
priority: P1
effort: 54h
branch: main
tags: [api, hardening, contract, testing, production]
created: 2026-04-08
---

# Objective
Answer the question: "Is the API truly complete for production?"
Current answer: **No**. Core API works, but contract, edge routing, auth/data exposure, and test-readiness gaps are still blocking production confidence.

## Inputs used
- `plans/reports/researcher-2026-04-08-live-api-audit.md`
- `plans/reports/researcher-2026-04-08-codebase-api-audit.md`
- `plans/reports/tester-20260408-api-test-readiness.md`
- Verified in code/config:
  - `Caddyfile`
  - `services/api/src/server.ts`
  - `services/api/src/routes/public.ts`
  - `services/api/src/routes/domains.ts`
  - `services/api/src/routes/webhooks.ts`
  - `services/api/vitest.config.ts`
  - `services/api/src/plugins/swagger.ts`

## Gap -> remediation map (focus on completion question)
| ID | Gap | Evidence | Remediation | Priority |
|---|---|---|---|---|
| G1 | `app.<domain>/api/*` routing mismatch with API paths | `Caddyfile` proxies `/api/*` to API without prefix strip; live `/api/health` 404 | Add path rewrite (`/api/*` -> `/*`) or deprecate app-domain API entrypoint and enforce single canonical base URL | P0 |
| G2 | OpenAPI is non-actionable (localhost server, weak schema/response coverage) | `services/api/src/plugins/swagger.ts` hardcodes localhost; live audit shows empty schemas and mostly 200 | Define real server URL(s), add request/response schemas and error codes for priority routes, add contract tests | P0/P1 |
| G3 | Sensitive domain fields can leak to authenticated anonymous context | `/domains` includes `verificationToken`, `owner.email`, `ownerId`; `authenticate` accepts anonymous JWT path | Add response projection by actor type (admin/owner/anonymous), redact sensitive fields by default | P0 |
| G4 | Webhook signature verification can throw 500 on malformed signature | `webhooks.ts` uses `timingSafeEqual` without length guard | Validate signature format + equal length before compare; return 400 for malformed input | P0 |
| G5 | Feature-disabled status code semantics incorrect | `public.ts` returns 404 when public inbox feature disabled | Return 403 (feature disabled by policy) or 409 (state conflict); keep 404 only for missing resource/route | P0 |
| G6 | Runtime/docs drift on public vs protected endpoints | README says almost all auth-required; code exposes several public routes | Update README/API docs to runtime truth and formalize endpoint visibility policy | P0 |
| G7 | Test command misses legacy backend suites by default | `vitest.config.ts` includes only `src/test/**/*.test.ts` | Include both `src/test/**/*.test.ts` and `test/**/*.test.ts` or migrate legacy suites with explicit policy | P1 |
| G8 | Many failing tests + uncovered route modules reduce readiness trust | tester report: 41 failures, broken imports/schema drift, missing coverage for many modules | Repair failing suites first, then add route coverage targets and contract checks | P1 |
| G9 | Unregistered route modules / route sprawl | `emailValidationRoutes` exported in `domains.ts` but not registered in `server.ts` | Decide keep/remove/register each orphan module; test and document final surface | P1 |

## Phase plan (P0/P1/P2)

## P0 - Production blocking quick fixes (target: 2-3 days, 16h)
- Priority: P0
- Risk if skipped: High (consumer breakage, data leak risk, false API completeness)
- Dependencies: access to edge proxy config, API deploy pipeline, smoke test env
- Success criteria:
  - `/api/*` entrypoint behavior is deterministic and documented (works or explicitly removed)
  - Sensitive fields no longer returned to anonymous/auth contexts that do not need them
  - `/webhooks/verify-signature` never 500s on malformed signature
  - `POST /public/inboxes` returns policy-appropriate status code for disabled mode
  - README + API docs match runtime public/protected surface
- Test strategy:
  - Live smoke probes for `/api/health`, `/health`, `/docs/json`, `/domains`, `/public/inboxes`, `/webhooks/verify-signature`
  - Negative tests: malformed webhook signature, anonymous token access to domain listing
  - Status-code contract assertions for disabled public inbox flow

### P0 checklist
- [ ] Fix Caddy app-domain API routing (`/api/*` rewrite) OR remove/deprecate that entrypoint and update all docs/clients
- [ ] Add canonical API base URL policy (single source of truth in README + docs)
- [ ] Patch `webhooks.ts` signature verify path: format + length guards before `timingSafeEqual`
- [ ] Patch `public.ts` disabled-feature response code and message semantics
- [ ] Add redacted projection for `/domains` list/details for non-admin/non-owner actors
- [ ] Publish a short API visibility matrix (public/auth/admin) and align README statements
- [ ] Execute production-like smoke tests and save report to `plans/reports/`

## P1 - Contract and test reliability alignment (target: 1-2 weeks, 26h)
- Priority: P1
- Risk if skipped: Medium-High (silent contract regressions, false green from partial tests)
- Dependencies: P0 merged, CI permissions, agreement on OpenAPI as source-of-truth level
- Success criteria:
  - OpenAPI has valid server URLs (non-localhost for production) and concrete schemas for priority routes
  - Error model includes at least `400/401/403/404/500` where applicable
  - Default test command covers intended backend suites
  - Existing failing suites fixed to acceptable threshold (target: 0 critical infra/import failures)
  - Route registration inventory is explicit (kept/removed/or registered)
- Test strategy:
  - CI job: OpenAPI snapshot and schema validation
  - Contract tests for top public/auth/admin endpoints
  - Route inventory test: runtime registered routes vs expected list
  - Regression run on full backend suite after vitest include changes

### P1 checklist
- [x] Update swagger setup: server URLs by env (prod/staging/dev), not hardcoded localhost
- [x] Add schemas for high-traffic endpoints first (`auth`, `domains`, `inboxes`, `messages`, `webhooks`)
- [ ] Standardize error envelope baseline (at least key fields/code semantics)
- [x] Expand `vitest.config.ts` include patterns or migrate legacy tests and remove ambiguity
- [x] Fix broken test imports/setup and Prisma drift in enterprise tests
- [ ] Add explicit tests for currently uncovered modules (start with `abuse`, then `teams/support/sso/scim/sepay/referral/forwarding`)
- [x] Audit route modules not registered (ex: `emailValidationRoutes`), then register/remove with docs + tests
- [ ] Add CI gate for OpenAPI + route-map diff checks

## P2 - Governance and long-term completeness guardrails (target: 2-3 weeks, 12h)
- Priority: P2
- Risk if skipped: Medium (future drift and repeated readiness debates)
- Dependencies: P1 baseline stable
- Success criteria:
  - Clear API lifecycle policy (draft, beta, GA, deprecated)
  - Automated drift detection between runtime routes, docs, and tests
  - Observability policy for public operational endpoints (`/metrics`, `/ready`)
- Test strategy:
  - Scheduled contract drift checks
  - Release checklist requiring doc/runtime/test alignment sign-off

### P2 checklist
- [ ] Define API lifecycle labels and deprecation process
- [ ] Add release checklist item: route map + OpenAPI + README must align
- [ ] Add periodic API conformance report generation to `plans/reports/`
- [ ] Decide `/metrics` and `/ready` exposure policy (public vs protected) and enforce it

## De-scope (not in this plan)
- Full feature expansion of non-core modules (new SSO/SCIM/referral features)
- UI redesign or frontend refactor unrelated to API contract/routing/security gaps
- Large architectural migration (framework swap, database redesign)
- Outbound mail pipeline redesign (unless directly needed for contract fixes)
- Non-API platform initiatives (marketing automation flows, campaign features)

## Execution order and dependencies
1. P0 must land first (routing + security/semantics + docs truth).
2. P1 starts only after P0 smoke checks are stable.
3. P2 starts after P1 CI gates are green for at least 2 consecutive runs.

## Readiness gate to answer "API complete?"
API can be considered "production-complete" only when all are true:
- Gate A: Canonical API entrypoint works exactly as documented.
- Gate B: No critical data exposure from anonymous/auth contexts.
- Gate C: OpenAPI is actionable (schemas + status codes + correct servers).
- Gate D: Default test command represents real backend coverage and passes reliability threshold.
- Gate E: Runtime route inventory and docs are aligned and CI-enforced.

## Unresolved questions
1. Should `app.<domain>/api/*` remain a supported API gateway, or should only `api.<domain>` be official?
2. Is anonymous-token access to `/domains` intended product behavior, and if yes, which exact fields are allowed?
3. Should OpenAPI be enforced as strict client contract (breaking-change policy), or documentation-first with looser guarantees?
4. Should `/metrics` and `/ready` stay public in production, or be restricted by auth/IP allowlist?
5. Keep and register orphan route modules (e.g., `emailValidationRoutes`) or remove until truly ready?
