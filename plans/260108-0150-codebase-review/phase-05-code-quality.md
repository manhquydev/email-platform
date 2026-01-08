# Phase 05: Code Quality Improvements

**Status:** completed | **Priority:** P3 | **Effort:** 4h

## Context

General code quality issues identified: type safety gaps, missing error handling, inconsistent patterns.

## Objective

Address cross-cutting quality concerns that don't fit into specific refactoring phases.

## Implementation Summary

### 1. Constants Extraction ✅

Created `config/constants.ts` with:

```typescript
// Rate limits
export const RATE_LIMITS = {
    AUTH: { max: 5, windowMs: 60 * 1000 },
    API: { max: 100, windowMs: 60 * 1000 },
    PUBLIC: { max: 30, windowMs: 60 * 1000 },
    ADMIN: { max: 200, windowMs: 60 * 1000 },
};

// Time durations (milliseconds)
export const DURATIONS = {
    TOKEN_EXPIRY: 15 * 60 * 1000,
    FETCH_TIMEOUT: 10 * 1000,
    TELEGRAM_TIMEOUT: 15 * 1000,
    // ... more
};

// Also includes: RETENTION, PAGINATION, TIER_LIMITS, SIZE_LIMITS, SECURITY, TELEGRAM, EMAIL
```

### 2. Fetch Timeout Utility ✅

Created `utils/fetch.ts`:

```typescript
export async function fetchWithTimeout(url: string, options?: FetchWithTimeoutOptions): Promise<Response>
export async function fetchJsonWithTimeout<T>(url: string, options?: FetchWithTimeoutOptions): Promise<T>
export async function postJsonWithTimeout<T>(url: string, body: unknown, options?: FetchWithTimeoutOptions): Promise<T>
```

Features:
- AbortController-based timeout handling
- Configurable timeout per request
- Type-safe JSON responses
- Error wrapping with context

### 3. Type Safety Improvements ✅

Enhanced `types/fastify-jwt.d.ts`:

```typescript
// Before: role: string
// After: role: UserRole (from Prisma)

// Added helper types
export interface AuthenticatedUser { ... }
export interface AdminUser extends AuthenticatedUser { role: "ADMIN"; }
export function isAdminUser(user: AuthenticatedUser): user is AdminUser;
```

### 4. Error Boundaries (Web)

Already exists: `components/ErrorBoundary.tsx`

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `config/constants.ts` | Created | 85 lines - All magic numbers extracted |
| `utils/fetch.ts` | Created | 78 lines - Timeout wrapper for fetch |
| `types/fastify-jwt.d.ts` | Updated | Strict typing with UserRole enum |
| `__tests__/fetch.test.ts` | Created | 116 lines - Tests for fetch utility |

## Success Criteria

- [x] Magic numbers extracted to constants
- [x] Fetch calls have timeout utility
- [x] User type uses UserRole enum instead of string
- [x] Type guard for admin users
- [x] New utility has tests
- [x] TypeScript compiles successfully

## Deferred Items

| Item | Reason |
|------|--------|
| Replace all `.parse()` with `.safeParse()` | Requires auditing all routes, low risk |
| Replace all `any` types | Large scope, incremental improvement |
| Structured logging migration | Already using pino in most places |

## Usage Examples

```typescript
// Using constants
import { DURATIONS, RATE_LIMITS } from '../config/constants';

// Rate limiting
app.register(rateLimit, {
    max: RATE_LIMITS.API.max,
    timeWindow: RATE_LIMITS.API.windowMs
});

// Using fetch with timeout
import { fetchJsonWithTimeout } from '../utils/fetch';

const data = await fetchJsonWithTimeout<TelegramResponse>(
    `${TELEGRAM_API}/sendMessage`,
    { timeout: DURATIONS.TELEGRAM_TIMEOUT }
);

// Type-safe user checks
import { isAdminUser } from '../types/fastify-jwt';

if (isAdminUser(request.user)) {
    // TypeScript knows role is "ADMIN"
}
```
