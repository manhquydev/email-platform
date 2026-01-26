## Code Review Summary

### Scope
- **Files reviewed**:
  - `services/api/src/lib/alias-validation.ts`
  - `services/api/src/services/ephemeral-inbox.service.ts`
  - `services/api/src/routes/ephemeral-inbox.ts`
- **Focus**: Backend implementation of custom aliases and domain support (Phase 1)
- **Status**: Code implemented, functional, needs hardening

### Overall Assessment
The implementation is solid, following the Service-Repository pattern and maintaining separation of concerns. Security is well-handled with strict Zod validation, regex patterns, and rate limiting. However, there are concurrency risks regarding alias uniqueness and a potential reliability issue with random alias generation collisions.

**Score: 8.5/10**

### Critical Issues
1. **Random Alias Collision Handling**: The `generateLocalPart()` function creates an alias from a pool of ~225,000 combinations (`15 adj * 15 nouns * 1000 nums`). There is **no check for existence** or retry logic for random aliases. If a collision occurs, `prisma.inbox.create` will throw a Unique Constraint error, causing a 500/400 failure for the user.
   - *Fix*: Implement a retry loop (e.g., max 3 attempts) for random alias generation inside `create()`.

2. **Race Condition on Custom Alias Creation**: The check `prisma.inbox.findFirst(...)` followed by `prisma.inbox.create(...)` is not atomic. Two requests for the same alias can pass the check simultaneously, leading to one failing at the DB level.
   - *Fix*: Catch the specific Prisma P2002 (Unique Constraint) error in `create()` and rethrow a friendly "Alias already taken" error, or handle it in the route.

### High Priority Findings
1. **Restrictive Abuse Pattern**: The regex `/^[0-9]+$/` in `ABUSE_PATTERNS` blocks aliases like `12345` or `2024`. This might be overly restrictive for legitimate use cases where users want numeric-only aliases.
   - *Recommendation*: Consider removing this restriction or making it configurable/length-dependent (e.g., allow 4+ digits).

2. **Error Handling Specificity**: The route handler catches errors checking `error.message?.includes('alias')`. If Prisma throws a raw database error for uniqueness, the message might not contain "alias" (depending on Prisma version/driver), resulting in a generic 500 error instead of 400.
   - *Recommendation*: Explicitly handle known error types in the service or route.

### Medium Priority Improvements
1. **Redundant Validation**: The pattern `/^.{0,2}$/` in `ABUSE_PATTERNS` is redundant with the explicit `sanitized.length < 3` check.
2. **Domain Cache Invalidation**: `cachedDomainId` is never invalidated. If the `EPHEMERAL_DOMAIN` configuration changes or the domain is deleted/recreated in DB, the service requires a restart.
3. **Magic Numbers**: Rate limit windows and counts are hardcoded in the route configuration. Move to environment variables or constants.

### Recommended Actions
1. **Implement Retry Logic**: Add a loop in `ephemeralInboxService.create` for random alias generation.
   ```typescript
   // Pseudo-code
   let attempts = 0;
   while (attempts < 3) {
     try {
       localPart = customAlias || generateLocalPart();
       // create...
       break;
     } catch (e) {
       if (isUniqueConstraintError(e) && !customAlias) {
         attempts++;
         continue;
       }
       throw e;
     }
   }
   ```
2. **Harden Error Handling**: Wrap the `create` call in `routes/ephemeral-inbox.ts` or inside the service to specifically catch unique constraint violations and return `409 Conflict`.
3. **Relax Numeric Restriction**: Remove `/^[0-9]+$/` from `alias-validation.ts` unless strictly required by business logic.

### Metrics
- **Type Coverage**: 100% (Strict TypeScript usage)
- **Security**: High (Rate limits: 5/hr/IP creation, Input validation: Strict whitelist)
- **Performance**: High (Cached domain ID, efficient queries)
