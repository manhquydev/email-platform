# API Test Readiness Report

Date: 2026-04-08  
Scope: `services/api` backend API tests (Vitest)

## 1) Suite discovery (API/backend)

Detected in `services/api`:
- Total test files: `50`
- `unit`: `6`
- `integration`: `5`
- `e2e`: `2`
- `smoke`: `0`
- other backend/API-focused suites: `37`

Important config note:
- `services/api/vitest.config.ts` includes only: `src/test/**/*.test.ts`
- Legacy API suites under `services/api/test/*.test.ts` are **not run by default**.

## 2) Executed tests and results

### Run A (default backend command)
- Command: `npm test -- --reporter=json --outputFile=vitest-report.json`
- Result: `FAIL`
- Suites: `171 total` (`126 passed`, `45 failed`)
- Tests: `347 total` (`308 passed`, `39 failed`, `0 skipped/pending`)
- Runtime: ~`205s`

### Run B (legacy backend suites, custom temp config)
- Command: `npx vitest run --config vitest.legacy.config.ts --reporter=json --outputFile=vitest-legacy-report.json`
- Result: `FAIL`
- Suites: `6 total` (`2 passed`, `4 failed`)
- Tests: `11 total` (`9 passed`, `2 failed`, `0 skipped/pending`)
- Runtime: ~`19s`

### Combined executed backend API tests
- Tests executed: `358`
- Passed: `317`
- Failed: `41`
- Skipped/Pending: `0`

## 3) Findings by severity

### CRITICAL
- `services/api/vitest.config.ts` excludes `services/api/test/*.test.ts` from normal CI/local `npm test` run.  
  Impact: legacy API integration/e2e regressions can slip if team assumes `npm test` is full API coverage.
- Multiple suites fail due code/test drift and broken imports, not just business assertions.
  - Missing modules/import path:
    - `src/test/enterprise/folders.test.ts` (`Cannot find module '../../setup'`)
    - `src/test/enterprise/multitenancy.test.ts` (`Cannot find module '../../setup'`)
    - `src/test/unit/reply-forward-logic.test.ts` (`Cannot find module '/src/services/credit.service'`)
  - Prisma schema mismatch in enterprise protocol tests (`domain` field no longer valid, missing `localPart`).
  Impact: parts of suite are effectively non-functional; signal quality low.

### HIGH
- Endpoint-module coverage gaps (no direct endpoint-path evidence in tests) on many route modules, including:
  - `src/routes/teams.ts`
  - `src/routes/support.ts`
  - `src/routes/sso.ts`
  - `src/routes/scim.ts`
  - `src/routes/sepay.ts`
  - `src/routes/referral.ts`
  - `src/routes/push.ts`
  - `src/routes/forwarding.ts`
  - `src/routes/visibility-rules.ts`
  - `src/routes/abuse.ts`
  - many admin route modules (`admin/analytics`, `admin/system`, `admin/users`, ...)
- No API contract guard found for OpenAPI/Swagger/public response shape in test layer (`rg` on `openapi|swagger|contract` in test folders returns none).
  Impact: API docs/public contract can change silently without explicit contract-test failure.

### MEDIUM
- Potential happy-path-heavy suites (status assertions mostly/only 2xx):
  - `src/test/webhooks.test.ts`
  - `src/test/webhook-idempotency.test.ts`
  - `src/test/webauthn.test.ts`
  - `src/test/system.test.ts`
  - `src/test/messages.security.test.ts`
  - `src/test/mail_flow.test.ts`
  - `src/test/codes.deletion.test.ts`
- Some failing suites indicate brittle mocks/fixture assumptions (e.g., expected `201` but actual `400/500/403`) rather than robust behavior contracts.

## 4) Risk if API docs/public contract changes

Main risks if docs/contract change now:
- Response payload/key changes likely undetected for many endpoints because there is no dedicated contract validation against OpenAPI/public docs.
- Route renames/path changes in untested modules (teams/support/scim/sso/sepay/referral/forwarding/admin*) may ship without failing tests.
- Legacy API suites not in default include create false confidence from green-ish local runs.
- Happy-path-only tests miss backward-compatibility regressions on error model (`4xx/5xx` body shape, validation messages, auth errors).

## 5) Recommended next actions

1. Merge test entry points:
- Update Vitest include to run both:
  - `src/test/**/*.test.ts`
  - `test/**/*.test.ts`

2. Repair broken suites first (fastest trust recovery):
- Fix missing imports/setup in:
  - `enterprise/folders.test.ts`
  - `enterprise/multitenancy.test.ts`
  - `unit/reply-forward-logic.test.ts`
- Align enterprise protocol tests with current Prisma schema.

3. Add contract-focused tests:
- Snapshot/validate OpenAPI spec generation.
- For public endpoints, assert response shape keys/types + error schema (`4xx/5xx`).

4. Backfill endpoint tests for currently uncovered route modules:
- Priority order: `teams`, `support`, `sso`, `scim`, `sepay`, `referral`, `forwarding`, `visibility-rules`, core admin management APIs.

## Unresolved questions

- CI currently runs which exact backend test command: only `npm test` in `services/api`, or custom matrix?
- Should legacy `services/api/test/*` suites be kept and integrated, or migrated fully into `src/test/*`?
- Is OpenAPI spec considered source-of-truth contract for clients, or only documentation artifact?
