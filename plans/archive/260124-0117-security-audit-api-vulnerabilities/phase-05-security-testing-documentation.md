# Phase 5: Security Testing & Documentation

## Context Links
- **Parent Plan:** [plan.md](./plan.md)
- **Depends on:** [Phase 4](./phase-04-input-validation-injection.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-24 |
| Priority | 🟡 P2 - Medium |
| Effort | 2 days |
| Status | ⬜ Pending |
| Review | ⬜ Not reviewed |

**Description:** Comprehensive security testing, automated scanning, and documentation updates.

## Key Insights
- Need automated security tests in CI/CD
- Postman collection for manual security testing
- Documentation must reflect security changes
- Metrics and monitoring for security events

## Requirements

### Functional
- Security test suite covering all OWASP Top 10
- Automated scanning in CI pipeline
- Updated security documentation
- Monitoring dashboards for security events

### Non-Functional
- Tests complete in <5 minutes
- Zero false positives in scans

## Related Code Files

| Action | File |
|--------|------|
| ➕ Create | `services/api/src/test/security/*.test.ts` |
| 🔧 Modify | `.github/workflows/ci.yml` |
| ➕ Create | `docs/security-guide.md` |
| 🔧 Modify | `docs/code-standards.md` |

## Implementation Steps

### 1. Security Test Suite
```typescript
// test/security/bola.test.ts
describe('BOLA Protection', () => {
  it('fuzzy search only returns accessible messages', async () => {
    // Create message owned by user A
    // Login as user B
    // Search should not return user A's message
  });

  it('attachment download blocked for unauthorized user', async () => {
    // Create attachment for user A
    // Login as user B
    // Download should return 403
  });
});

// test/security/auth.test.ts
describe('Authentication Security', () => {
  it('revoked tokens are rejected', async () => {});
  it('refresh token rotation invalidates old token', async () => {});
  it('2FA brute force triggers lockout', async () => {});
});

// test/security/injection.test.ts
describe('Injection Prevention', () => {
  it('SQL injection in search is blocked', async () => {});
  it('path traversal in storage is blocked', async () => {});
  it('SSRF via webhook URL is blocked', async () => {});
});
```

### 2. CI/CD Security Scanning
```yaml
# .github/workflows/security.yml
name: Security Scan
on:
  push:
    branches: [main]
  pull_request:

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

      - name: Run security tests
        run: npm run test:security
```

### 3. Postman Security Collection
```json
{
  "info": { "name": "Ephemera Security Tests" },
  "item": [
    {
      "name": "BOLA Tests",
      "item": [
        { "name": "Access other user's message", "request": {...} },
        { "name": "Download unauthorized attachment", "request": {...} }
      ]
    },
    {
      "name": "Auth Tests",
      "item": [
        { "name": "Use revoked token", "request": {...} },
        { "name": "2FA brute force", "request": {...} }
      ]
    },
    {
      "name": "Injection Tests",
      "item": [
        { "name": "SQL injection in search", "request": {...} },
        { "name": "SSRF via webhook", "request": {...} }
      ]
    }
  ]
}
```

### 4. Security Documentation
```markdown
# Security Guide (docs/security-guide.md)

## Authentication
- JWT with 15min expiry + refresh tokens
- Token revocation via Redis denylist
- 2FA with TOTP + WebAuthn support

## Authorization
- Role-based: USER, ADMIN
- Resource ownership verification on all endpoints
- Team-based sharing with granular permissions

## Rate Limiting
- Per-user limits (tier-based)
- Exponential backoff for auth endpoints
- Redis-backed distributed limiting

## Input Validation
- Zod schemas on all endpoints
- Parameterized queries only
- SSRF protection for webhooks

## Security Headers
- Helmet with strict CSP
- HSTS preload enabled
- X-Frame-Options DENY
```

### 5. Prometheus Metrics
```typescript
// Add security metrics
const securityMetrics = {
  authFailures: new Counter({
    name: 'auth_failures_total',
    help: 'Total authentication failures',
    labelNames: ['reason']
  }),
  tokenRevocations: new Counter({
    name: 'token_revocations_total',
    help: 'Total token revocations'
  }),
  rateLimitHits: new Counter({
    name: 'rate_limit_hits_total',
    help: 'Total rate limit violations',
    labelNames: ['endpoint']
  }),
  injectionAttempts: new Counter({
    name: 'injection_attempts_total',
    help: 'Blocked injection attempts',
    labelNames: ['type']
  })
};
```

## Todo List

- [ ] Create security test suite structure
- [ ] Write BOLA test cases
- [ ] Write auth security test cases
- [ ] Write injection test cases
- [ ] Add security scanning to CI/CD
- [ ] Create Postman security collection
- [ ] Write security-guide.md documentation
- [ ] Update code-standards.md with security patterns
- [ ] Add security metrics to Prometheus
- [ ] Create Grafana security dashboard

## Success Criteria

- [ ] 100% coverage on security-critical paths
- [ ] CI/CD security scan passing
- [ ] Zero critical/high findings
- [ ] Documentation complete and reviewed
- [ ] Monitoring dashboards operational

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tests miss edge cases | Medium | Medium | Review by security expert |
| False positives in scans | Low | Low | Tune scanner rules |
| Docs become stale | Medium | Low | Include in PR checklist |

## Security Considerations

- Run security tests on every PR
- Regular penetration testing schedule
- Security incident response plan

## Next Steps

1. Complete all test cases
2. Run full security scan
3. Fix any remaining issues
4. Final documentation review
5. Deploy to production
