# P1 Test Failure Triage
Date: 2026-04-08
Source: `services/api/vitest-report-latest.json`
Scope: backend (`services/api`)

## Snapshot
- Files: 204 total, 168 passed, 36 failed
- Tests: 401 total, 374 passed, 27 failed
- Dominant failure patterns:
  - Auth/session fixture drift (refresh token FK, auth expectations)
  - Prisma schema drift in enterprise protocol tests
  - Behavior contract drift (status codes/limits changed)
  - Security policy drift (401 vs 403, SSRF validation behavior)

## Failing Suites by Category

### A. Auth/session setup
- `src/test/auth-refresh.integration.test.ts`
  - Symptom: login setup path returns `500` (expected `200`)
  - Root hint: refresh token create hits FK constraint (`RefreshToken_userId_fkey`)

### B. Domain/business feature tests using stale assumptions
- `src/test/filters.test.ts`
  - Multiple endpoints now return `500` where test expected `201/400/404`
  - Likely dependency/mocking drift around filter/label services or authz hooks
- `src/test/identity-bundles.test.ts`
  - Alias creation returns `201` while test expects `200`
- `src/test/provider.test.ts`
  - Mailbox list cardinality mismatch (state cleanup/isolation issue)
- `src/test/subscription.integration.test.ts`
  - Mock expectation mismatch in redemption credit update payload

### C. Security semantics drift
- `src/test/security.integration.test.ts`
  - Audit log assertion fails (`0 > 0`)
  - IDOR expectation mismatch (`401` returned, expected `403`)
- `src/test/security/injection-prevention.test.ts`
  - SSRF URL validator behavior differs from expected blocked-host matrix

### D. Tier policy drift
- `src/test/tier-enforcement.test.ts`
  - Webhook limits differ from test constants:
    - FREE expected 0, actual 1
    - STARTER expected 2, actual 3
    - BUSINESS expected 30, actual 25

### E. Enterprise protocol fixture drift (Prisma validation)
- `src/test/enterprise/imap-pop3.test.ts`
  - Fails in `prisma.domain.deleteMany()` setup path
- `src/test/enterprise/smtp-submission.test.ts`
  - Fails in `prisma.user.create()` setup path
  - Strong indicator test fixtures no longer match current Prisma schema requirements

### F. Telegram integration drift
- `src/test/telegram.test.ts`
  - Webhook command assertions mismatch (`undefined` instead of linked/unlinked values)

### G. Data setup integrity
- `src/test/codes.deletion.test.ts`
  - Null dereference on code fixture (`reading 'id'`)

## Execution Order Proposal (next fix batch)
1. Fix infra/setup failures first:
   - `auth-refresh.integration`, `codes.deletion`, enterprise protocol tests
2. Fix policy/constant drifts:
   - `tier-enforcement`, `security.integration`, `identity-bundles`
3. Fix feature contract drifts:
   - `filters`, `provider`, `subscription`, `telegram`, `injection-prevention`
4. Re-run full backend suite and freeze fresh fail-list.

## Unresolved questions
1. Should P1 treat `401` vs `403` as strict contract for IDOR/authn/authz paths, or accept current runtime semantics and update tests?
2. For tier limits, should tests align to current product policy now, or should runtime limits be reverted to previous constants?
3. For enterprise protocol suites, is fixture update to latest Prisma schema accepted in P1, or should protocol feature be temporarily scoped out of default CI?

## Update after repair batch (2026-04-08)
- Re-ran 12-suite high-priority cluster:
  - Command: `npx vitest run src/test/auth-refresh.integration.test.ts src/test/codes.deletion.test.ts src/test/filters.test.ts src/test/identity-bundles.test.ts src/test/provider.test.ts src/test/security.integration.test.ts src/test/subscription.integration.test.ts src/test/telegram.test.ts src/test/tier-enforcement.test.ts src/test/enterprise/imap-pop3.test.ts src/test/enterprise/smtp-submission.test.ts src/test/security/injection-prevention.test.ts`
  - Result: `12/12 suites passed`, `129/129 tests passed`.
- Enterprise protocol suites stabilized:
  - IMAP: avoid STARTTLS auto-upgrade in auth flow test and use direct LOGIN command path.
  - SMTP submission: mocked auth-boundary methods to keep command-path tests deterministic.
- Next step: run full backend suite again and produce fresh residual fail-list for non-P1 areas.

## Full-suite verification after P1 batch
- Command: `npx vitest run --reporter=json --outputFile vitest-report-after-p1-batch.json`
- Result: `204/204 suites passed`, `401/401 tests passed`, `0 failed`.
- Output file: `services/api/vitest-report-after-p1-batch.json`
