# Phase 2: API Endpoints - Visibility Rules CRUD

## Context
- [Plan Overview](./plan.md)
- [Phase 1: Core Backend](./phase-01-core-backend.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-12 |
| Priority | HIGH |
| Status | ✅ Completed |

## Key Insights
1. Follow pattern from `filters.ts` for route structure
2. Owner verification: `inbox.ownerId === user.userId`
3. Rate limit: 50 rules max per inbox
4. Integrate visibility engine into public-inbox routes

## Requirements
1. CRUD endpoints for visibility rules (owner-only)
2. Template endpoints (list, apply)
3. Test/preview endpoint to simulate rule impact
4. Update public-inbox routes to use visibility engine

## API Design

### Visibility Rules Endpoints
```
GET    /inboxes/:inboxId/visibility-rules     # List rules
POST   /inboxes/:inboxId/visibility-rules     # Create rule
PATCH  /visibility-rules/:id                   # Update rule
DELETE /visibility-rules/:id                   # Delete rule
PATCH  /visibility-rules/reorder              # Reorder priorities
```

### Templates Endpoints
```
GET    /visibility-templates                   # List all templates
POST   /inboxes/:inboxId/visibility-rules/apply-template  # Apply template
```

### Test/Preview Endpoint
```
POST   /inboxes/:inboxId/visibility-rules/test  # Test rules against messages
```

### Request/Response Schemas

#### Create Rule
```typescript
// POST /inboxes/:inboxId/visibility-rules
{
  name: string;
  description?: string;
  ruleType: 'HIDE' | 'SHOW_ONLY' | 'WARN' | 'REDACT';
  matchType: 'ALL' | 'ANY';
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
    negate?: boolean;
    caseSensitive?: boolean;
    headerName?: string;
  }>;
  priority?: number;  // 0-100
  isEnabled?: boolean;
}
```

#### Test Rules
```typescript
// POST /inboxes/:inboxId/visibility-rules/test
{
  messageIds?: string[];  // Test specific messages
  limit?: number;         // Or test last N messages
}

// Response
{
  results: Array<{
    messageId: string;
    subject: string;
    action: 'SHOWN' | 'HIDDEN' | 'WARNED' | 'REDACTED';
    matchedRule?: { id: string; name: string; };
  }>;
  summary: {
    total: number;
    shown: number;
    hidden: number;
    warned: number;
    redacted: number;
  };
}
```

## Related Code Files
- `services/api/src/routes/filters.ts` - Pattern reference
- `services/api/src/routes/public-inbox.ts` - Integrate engine
- `services/api/src/routes/inboxes.ts` - Owner verification pattern

## Implementation Steps

### Step 1: Create visibility-rules.ts Routes
- [x] Create route file with Zod schemas
- [x] Implement GET /inboxes/:inboxId/visibility-rules
- [x] Implement POST /inboxes/:inboxId/visibility-rules
- [x] Implement PATCH /visibility-rules/:id
- [x] Implement DELETE /visibility-rules/:id
- [x] Implement PATCH /visibility-rules/reorder
- [x] Add owner verification preHandler

### Step 2: Template Endpoints
- [x] Implement GET /visibility-templates
- [x] Implement POST apply-template endpoint
- [x] Copy template conditions to new rule

### Step 3: Test/Preview Endpoint
- [x] Implement POST test endpoint
- [x] Fetch messages, evaluate each with engine
- [x] Return summary and per-message results

### Step 4: Integrate into Public Inbox
- [x] Import VisibilityEngine in public-inbox.ts
- [x] Call engine.evaluateMessage() for each message
- [x] Filter/modify response based on action
- [x] Add hiddenCount, warnedCount to metadata
- [x] Create audit log entries

### Step 5: Register Routes
- [x] Add visibility-rules routes to server.ts
- [x] Add visibility-templates routes

## Todo List
- [x] Create visibility-rules.ts route file
- [x] Implement all CRUD endpoints
- [x] Implement template endpoints
- [x] Implement test/preview endpoint
- [x] Update public-inbox.ts with engine integration
- [x] Register routes in server.ts

## Success Criteria
- [x] All endpoints respond correctly
- [x] Owner-only access enforced
- [x] 50 rule limit enforced
- [x] Public inbox respects visibility rules
- [x] Audit logs created for public views

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Unauthorized rule access | Strict owner verification |
| Rule limit bypass | Check count before create |
| Performance on message list | Batch evaluate, cache rules |

## Security Considerations
- Verify inbox ownership on all mutations
- Validate all input with Zod
- Don't expose rule details in public error messages
- Rate limit rule creation
