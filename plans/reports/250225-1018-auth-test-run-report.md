# Auth Test Run Report
**Date:** 2026-02-25
**Scope:** Authentication-related tests across `services/api` and `services/web`

---

## Test Results Overview

### services/web (Vitest)
| Metric | Count |
|--------|-------|
| Test Files | 22 total — 2 failed, 17 passed, 3 skipped |
| Tests | 239 total — **19 failed**, 202 passed, 18 skipped |
| Duration | 11.77s |

### services/api (Vitest)
Full suite timed out (>90s) due to DB/Redis unavailability.
Targeted auth tests run separately:

| File | Tests | Status |
|------|-------|--------|
| `src/test/auth.test.ts` | 3 | **3 failed** (DB unavailable) |
| `src/test/auth-refresh.integration.test.ts` | 8 | **8 failed** (DB unavailable) |
| `src/test/unit/` (5 of 6 files) | 62 | **62 passed** |
| `src/test/unit/reply-forward-logic.test.ts` | — | **1 suite failed** (missing module) |

---

## Auth-Related Failures

### services/api — Root Cause: Infrastructure Unavailable

**`src/test/auth.test.ts`** — 3/3 failed
- All tests hit `PrismaClientInitializationError`: `Can't reach database server at localhost:5434`
- Tests: login with wrong password, login with valid credentials, changing password

**`src/test/auth-refresh.integration.test.ts`** — 8/8 failed
- Same root cause: Postgres unreachable at `localhost:5434`
- Tests cover: valid refresh token flow, invalid token (401), missing token (400), expired token (401), token reuse/family revocation, deleted user, audit log creation, rate limiting
- Also emitting Redis `ECONNREFUSED` on port `6380` for token revocation checks

These are **infrastructure failures, not code failures** — tests cannot run without Postgres and Redis.

---

### services/web — Code Failures (2 files)

#### 1. `src/utils/api.test.ts` — 9/9 cases failed

**Root cause:** The `api()` utility function throws `ApiError: Request failed` on all requests. Tests expect the mock fetch to behave as configured, but the implementation's error handling intercepts before test assertions.

Key failures:
- `adds Authorization header when token provided` → `ApiError: Request failed`
- `throws ApiError on non-ok response` → expected `{ message: 'Bad request', status: 400 }`, got `{ status: 500 }`
- `calls handleCriticalError for error responses` → same throw behavior

**Relevant code:** `D:/project/Clone/email-platform/services/web/src/utils/api.ts:116`
```ts
throw new ApiError(errorMessage, status);
```
Tests are likely mocking fetch incorrectly or the api.ts implementation changed (CSRF cookie flow added?) and tests weren't updated.

#### 2. `src/__tests__/EmailStream.labels.test.tsx` — 10 failed

Two distinct issues:
- `should handle labels with default color when color is undefined` → `TypeError: Cannot read properties of undefined (reading 'color')` — null guard missing in label rendering
- `should display unread indicator for unread messages` / `should highlight selected message` → tests expect CSS class `from-primary` but actual classes are `glass-unread`, `glass-elevated`, `border-l-primary` — UI styling was refactored, tests not updated

---

## Unit Tests (API — No Infrastructure Needed)

`src/test/unit/` — 5 files, 62 tests — **all passed**
Covers: alias validation, condition matching, DKIM service, email validation, OTP extractor

1 suite skipped/broken: `reply-forward-logic.test.ts` — import error: `Cannot find module '/src/services/credit.service'` (path alias resolution issue)

---

## Infrastructure Issues

| Service | Status | Impact |
|---------|--------|--------|
| Postgres (`localhost:5434`) | NOT RUNNING | Blocks all API integration/auth tests |
| Redis (`localhost:6380`) | NOT RUNNING | Token revocation runs in fail-open mode; tests emit stderr noise |

---

## Critical Issues

1. **DB not running** — `auth.test.ts` and `auth-refresh.integration.test.ts` are completely blocked. These cover core auth flows including token reuse/family revocation which is security-critical.
2. **`api.test.ts` failures (web)** — 9 auth-adjacent tests broken. Likely caused by recent changes to `api.ts` (credentials/CSRF cookie handling) without updating test mocks.
3. **Missing module** — `credit.service` not found at expected path; breaks `reply-forward-logic.test.ts` suite.

---

## Recommendations

1. **Start Docker services** (`docker-compose up -d postgres redis`) before running integration tests — cannot assess actual auth logic correctness without DB.
2. **Fix `src/utils/api.test.ts`** — update fetch mocks to match current `api.ts` behavior (credentials: 'include', CSRF header handling); mock should return proper response objects.
3. **Fix `EmailStream.labels.test.tsx`** — update CSS class assertions from `from-primary` to `glass-unread`/`glass-elevated`/`border-l-primary` to match refactored styles; add null guard for `label.color`.
4. **Fix `reply-forward-logic.test.ts`** — verify `credit.service` file path; likely needs `../../services/credit.service` to resolve correctly or the file was renamed/moved.

---

## Unresolved Questions

- Were the `api.ts` changes (CSRF/cookie-based refresh) intentional without test updates? If so, tests need a full mock rewrite.
- Is `credit.service` at a different path or was it deleted? Grep needed to confirm actual location.
- Are auth integration tests expected to run locally (requiring Docker) or only in CI with services available?
