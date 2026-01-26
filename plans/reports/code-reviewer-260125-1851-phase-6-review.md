## Code Review Summary

### Scope
- **Files reviewed**:
  - `services/api/src/lib/feature-flags.ts`
  - `services/api/src/services/referral.service.ts`
  - `services/api/src/routes/referral.ts`
- **Review focus**: Security (Privacy/Hashing), Architecture (Feature Flags), YAGNI/KISS principle application.

### Overall Assessment
**Score: 8/10**
The implementation cleverly leverages existing infrastructure (`AuditLog`) to implement the referral system without schema changes, adhering strictly to YAGNI/KISS. The feature flag system is simple and effective. Privacy requirements are met through double-blind hashing in user-facing data. One critical security configuration issue needs addressing.

### Critical Issues
1.  **Insecure Default Secret**: `generateReferralCode` uses a hardcoded fallback `'ephemera'` for `process.env.REFERRAL_SECRET`.
    -   *Risk*: If env var is missing, referral codes are predictable/forgeable.
    -   *Fix*: Throw error if secret is missing in production or use a safer default handling.

### High Priority Findings
1.  **Performance Risk on JSON Query**:
    -   Querying `auditLog` with `meta: { path: ['referralCode'] ... }` relies on JSONB operators. Without a GIN index on `meta`, this will become a bottleneck as the audit log grows.
    -   *Mitigation*: Ensure `meta` column is indexed or verify dataset size expectations.

### Medium Priority Improvements
1.  **Separation of Concerns**:
    -   Using `AuditLog` for core business logic (calculating rewards) couples the auditing system with the feature transactional state.
    -   *Suggestion*: Acceptable for MVP/Phase 6, but consider a dedicated `Referrals` table if feature graduates to high volume.
2.  **Hardcoded Rewards**:
    -   `REFERRAL_REWARDS` are hardcoded in the service. Moving these to `feature-flags.ts` or configuration would improve maintainability.

### Positive Observations
-   **Excellent YAGNI/KISS**: Using `AuditLog` avoids new migrations and table maintenance for a potentially experimental feature.
-   **Privacy-First Design**: The "double-blind" logic (storing hashes instead of direct links in the `REFERRAL_USED` events) effectively prevents PII leakage to end-users.
-   **Clean Feature Flags**: The `CloudFeature` implementation is type-safe and simple.

### Recommended Actions
1.  **Security**: Remove `|| 'ephemera'` from line 35 of `referral.service.ts`. Ensure `REFERRAL_SECRET` is enforced in environment validation.
2.  **Optimization**: Verify GIN index on `AuditLog.meta` if expecting high volume.
3.  **Refactor**: Move `REFERRAL_REWARDS` constants to a centralized config or the feature flags file for visibility.

### Metrics
-   **Security**: High (Double-blind hashing implemented)
-   **Complexity**: Low (Leveraged existing tables)
-   **Maintainability**: Medium (Logic coupled with Audit logs)
