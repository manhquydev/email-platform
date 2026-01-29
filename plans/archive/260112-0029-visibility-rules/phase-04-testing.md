# Phase 4: Testing & Code Review

## Context
- [Plan Overview](./plan.md)
- [Phase 3: Frontend UI](./phase-03-frontend-ui.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-12 |
| Priority | HIGH |
| Status | 🔲 Pending |

## Key Insights
1. Unit tests for VisibilityEngine condition evaluation
2. Integration tests for API endpoints
3. E2E tests for public inbox filtering

## Requirements
1. Unit tests for visibility engine
2. API integration tests
3. Authorization tests (owner-only)
4. Performance tests for rule evaluation

## Test Categories

### Unit Tests (visibility-engine.test.ts)
```typescript
describe('VisibilityEngine', () => {
  describe('evaluateCondition', () => {
    it('CONTAINS operator matches substring');
    it('EQUALS operator matches exact');
    it('STARTS_WITH operator matches prefix');
    it('ENDS_WITH operator matches suffix');
    it('REGEX operator matches pattern');
    it('IN operator matches list');
    it('GT operator compares numbers');
    it('LT operator compares numbers');
    it('negate inverts result');
    it('caseSensitive respects case');
    it('invalid regex returns false');
  });

  describe('evaluateRule', () => {
    it('ALL matchType requires all conditions');
    it('ANY matchType requires one condition');
    it('empty conditions returns true');
  });

  describe('evaluateMessage', () => {
    it('HIDE rule hides matching message');
    it('SHOW_ONLY rule hides non-matching');
    it('WARN rule adds warning flag');
    it('REDACT rule redacts content');
    it('priority order is respected');
    it('disabled rules are skipped');
    it('no rules returns SHOWN');
  });
});
```

### API Integration Tests (visibility-rules.test.ts)
```typescript
describe('Visibility Rules API', () => {
  describe('GET /inboxes/:id/visibility-rules', () => {
    it('returns rules for owned inbox');
    it('returns 403 for non-owner');
    it('returns empty array for no rules');
  });

  describe('POST /inboxes/:id/visibility-rules', () => {
    it('creates rule for owned inbox');
    it('returns 403 for non-owner');
    it('validates required fields');
    it('enforces 50 rule limit');
  });

  describe('PATCH /visibility-rules/:id', () => {
    it('updates rule for owner');
    it('returns 403 for non-owner');
  });

  describe('DELETE /visibility-rules/:id', () => {
    it('deletes rule for owner');
    it('returns 403 for non-owner');
  });
});
```

### Public Inbox Integration Tests
```typescript
describe('Public Inbox with Visibility Rules', () => {
  it('hides messages matching HIDE rule');
  it('shows only messages matching SHOW_ONLY');
  it('adds warning to WARN matches');
  it('redacts content for REDACT matches');
  it('returns hiddenCount in metadata');
  it('creates audit log entries');
});
```

## Related Code Files
- `services/api/src/test/*.test.ts` - Test patterns
- `services/api/src/services/visibility-engine.ts` - Unit under test
- `services/api/src/routes/visibility-rules.ts` - API under test

## Implementation Steps

### Step 1: Unit Tests for Engine
- [ ] Create visibility-engine.test.ts
- [ ] Test all operators
- [ ] Test match types (ALL/ANY)
- [ ] Test rule types (HIDE/SHOW_ONLY/WARN/REDACT)
- [ ] Test edge cases (null fields, invalid regex)

### Step 2: API Integration Tests
- [ ] Create visibility-rules.test.ts
- [ ] Test CRUD endpoints
- [ ] Test authorization
- [ ] Test validation
- [ ] Test limits

### Step 3: Public Inbox Tests
- [ ] Update public-inbox.test.ts
- [ ] Test message filtering
- [ ] Test metadata (hiddenCount)
- [ ] Test audit logging

### Step 4: Type Check & Build
- [ ] Run `npm run typecheck`
- [ ] Run `npm run build`
- [ ] Fix any errors

### Step 5: Code Review
- [ ] Run code-reviewer subagent
- [ ] Address critical issues
- [ ] Re-run tests after fixes

## Todo List
- [ ] Write visibility-engine unit tests
- [ ] Write visibility-rules API tests
- [ ] Update public-inbox tests
- [ ] Run type check
- [ ] Run build
- [ ] Code review
- [ ] Fix issues and re-test

## Success Criteria
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Type check passes
- [ ] Build succeeds
- [ ] Code review passes

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Flaky tests | Use proper test isolation |
| Missing edge cases | Review spec for all scenarios |
| Performance regression | Add benchmark tests |
