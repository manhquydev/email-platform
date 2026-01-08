# Prompt Template: Security Review

## Usage
Use when reviewing code for security vulnerabilities or implementing security features.

---

## Template

```
# Security Review: [Component/Feature]

## Scope
- Files: [paths to review]
- Functionality: [what the code does]

## Review Focus
- [ ] Input validation (Zod schemas complete?)
- [ ] Authentication (routes protected?)
- [ ] Authorization (ownership checks?)
- [ ] SQL injection (Prisma parameterized?)
- [ ] XSS (output escaped?)
- [ ] CSRF (token validation?)
- [ ] Rate limiting (configured?)
- [ ] Secrets (not logged/exposed?)

## Specific Concerns
[Any known issues or areas of concern]

## Request
1. Identify vulnerabilities with severity (Critical/High/Medium/Low)
2. Provide fix for each issue
3. Add tests for security edge cases

## Response Format
For each finding:
```
### [Severity] - [Vulnerability Type]
**Location:** file:line
**Issue:** Description
**Impact:** What could happen
**Fix:** Code change needed
```
```

---

## Example Usage

```
# Security Review: Public Inbox API

## Scope
- Files: services/api/src/routes/public-inbox.ts
- Functionality: Unauthenticated access to view inbox messages

## Review Focus
- [x] Input validation (email format)
- [ ] Authentication (intentionally public)
- [x] Authorization (inbox must exist)
- [x] SQL injection (Prisma parameterized)
- [ ] XSS (htmlBody returned as-is?)
- [ ] Rate limiting (configured?)
- [ ] Secrets (sourceIp not exposed)

## Specific Concerns
1. htmlBody returned without sanitization - potential stored XSS
2. No rate limiting on public endpoints - DoS risk
3. Deleted messages might still be accessible

## Request
1. Identify vulnerabilities
2. Provide fixes
3. Add security tests

## Response Format
For each finding:
### [Severity] - [Vulnerability Type]
**Location:** file:line
**Issue:** Description
**Impact:** What could happen
**Fix:** Code change needed
```
