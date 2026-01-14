# Phase 1: Core Backend - Database Schema & Visibility Engine

## Context
- [Plan Overview](./plan.md)
- Reuses patterns from `EmailFilter` model and `emailFilters.ts` service

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-12 |
| Priority | HIGH |
| Status | 🔲 Pending |

## Key Insights
1. Existing `EmailFilter` model has similar condition/action patterns - reuse structure
2. `evaluateCondition()` in `emailFilters.ts` can be adapted for visibility engine
3. Audit logging pattern exists in `utils/audit.ts` - extend for visibility decisions
4. Public inbox routes already check `shareMode` - add visibility engine integration

## Requirements
1. Database schema for visibility rules, templates, and audit logs
2. VisibilityEngine service with message evaluation logic
3. Rule caching for performance (invalidate on update)
4. Safe regex execution with timeout protection

## Architecture

### Database Schema
```prisma
model VisibilityRule {
  id          String   @id @default(uuid())
  inboxId     String
  name        String
  description String?
  ruleType    VisibilityRuleType  // HIDE, SHOW_ONLY, WARN, REDACT
  matchType   FilterMatchType     // ALL, ANY
  conditions  Json                // Array of conditions
  priority    Int      @default(50)  // 0-100, higher = first
  isEnabled   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  inbox       Inbox    @relation(fields: [inboxId], references: [id], onDelete: Cascade)

  @@index([inboxId, isEnabled, priority])
}

model VisibilityRuleTemplate {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  category    String   // security, banking, hr, custom
  ruleType    VisibilityRuleType
  matchType   FilterMatchType
  conditions  Json
  isSystem    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model MessageVisibilityAudit {
  id          String   @id @default(uuid())
  inboxId     String
  messageId   String
  action      VisibilityAction  // SHOWN, HIDDEN, WARNED, REDACTED
  ruleId      String?
  ruleName    String?
  reason      String?
  requestedBy String?  // IP or userId
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([inboxId, createdAt])
  @@index([messageId])
}

enum VisibilityRuleType {
  HIDE
  SHOW_ONLY
  WARN
  REDACT
}

enum VisibilityAction {
  SHOWN
  HIDDEN
  WARNED
  REDACTED
}
```

### Condition Structure
```typescript
interface VisibilityCondition {
  field: 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HEADER' | 'SIZE' | 'SPAM_SCORE' | 'HAS_ATTACHMENT';
  operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'IN' | 'GT' | 'LT';
  value: string;
  negate?: boolean;        // NOT logic
  caseSensitive?: boolean; // default false
  headerName?: string;     // for HEADER field
}
```

## Related Code Files
- `services/api/prisma/schema.prisma` - Add new models
- `services/api/src/services/emailFilters.ts` - Reference for condition evaluation
- `services/api/src/utils/audit.ts` - Audit logging pattern

## Implementation Steps

### Step 1: Database Migration
- [ ] Add VisibilityRuleType enum to schema
- [ ] Add VisibilityAction enum to schema
- [ ] Add VisibilityRule model
- [ ] Add VisibilityRuleTemplate model
- [ ] Add MessageVisibilityAudit model
- [ ] Add relation: Inbox -> VisibilityRule[]
- [ ] Run prisma migrate

### Step 2: Visibility Engine Service
- [ ] Create `visibility-engine.ts` in services
- [ ] Implement `evaluateCondition()` with all operators
- [ ] Implement `evaluateRule()` with ALL/ANY logic
- [ ] Implement `evaluateMessage()` main entry point
- [ ] Add safe regex execution with timeout
- [ ] Add rule caching with Map cache

### Step 3: Seed Templates
- [ ] Create seed script for default templates
- [ ] Security template: Hide verify/password/OTP emails
- [ ] Banking template: Show only bank domain emails
- [ ] HR template: Hide payroll/salary emails

## Todo List
- [ ] Update Prisma schema with new models
- [ ] Generate Prisma client
- [ ] Create visibility-engine.ts service
- [ ] Create seed-visibility-templates.ts script
- [ ] Run migration and seed

## Success Criteria
- [ ] Migration runs without errors
- [ ] Prisma client generates successfully
- [ ] VisibilityEngine can evaluate test messages
- [ ] Templates are seeded in database

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Regex ReDoS attacks | Timeout wrapper, regex validation |
| Large body matching performance | Skip BODY if > 10MB, log warning |
| Cache invalidation issues | Clear cache on any rule CRUD operation |

## Security Considerations
- Validate regex patterns before saving
- Limit rule count per inbox (50 max as per spec)
- Audit all rule modifications
- Never expose internal rule details to public viewers
