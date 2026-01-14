# Advanced Message Visibility Rules - Implementation Plan

## Overview
User-controlled email visibility management for shared inboxes. Allows inbox owners to create rules that control which emails are visible to public viewers.

## Status
| Phase | Status | Progress |
|-------|--------|----------|
| [Phase 1: Core Backend](./phase-01-core-backend.md) | 🔲 Pending | 0% |
| [Phase 2: API Endpoints](./phase-02-api-endpoints.md) | 🔲 Pending | 0% |
| [Phase 3: Frontend UI](./phase-03-frontend-ui.md) | 🔲 Pending | 0% |
| [Phase 4: Testing](./phase-04-testing.md) | 🔲 Pending | 0% |

## Key Features
- **Rule Types**: HIDE, SHOW_ONLY, WARN, REDACT
- **Flexible Conditions**: FROM, TO, SUBJECT, BODY, HEADER, SIZE, SPAM_SCORE, HAS_ATTACHMENT
- **Operators**: EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH, REGEX, IN, GT, LT
- **Match Logic**: ALL (AND) or ANY (OR) with negate support
- **Templates**: Pre-built Security, Banking, HR templates stored in DB
- **Audit Trail**: Log all visibility decisions

## Architecture
```
┌─────────────────┐     ┌──────────────────────┐
│  Public Inbox   │────▶│ VisibilityEngine     │
│  Routes         │     │ - evaluateMessage()  │
└─────────────────┘     │ - getRulesForInbox() │
                        │ - applyRuleToMessage()│
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   VisibilityRule     │
                        │   - conditions[]     │
                        │   - action type      │
                        │   - priority         │
                        └──────────────────────┘
```

## Database Models (New)
- `VisibilityRule` - Rule definitions per inbox
- `VisibilityRuleTemplate` - Pre-built templates
- `MessageVisibilityAudit` - Audit log for decisions

## Files to Modify
- `services/api/prisma/schema.prisma` - Add new models
- `services/api/src/routes/public-inbox.ts` - Integrate engine
- `services/web/src/pages/InboxManager.tsx` - Add rules UI link

## Files to Create
- `services/api/src/services/visibility-engine.ts`
- `services/api/src/routes/visibility-rules.ts`
- `services/web/src/components/VisibilityRulesPanel.tsx`
- `services/web/src/components/RuleConditionBuilder.tsx`

## Success Criteria
- ✅ Owner can create/edit/delete visibility rules
- ✅ Only authenticated owner can modify rules
- ✅ Public viewer cannot influence rules
- ✅ Support flexible matching (FROM + SUBJECT combinations)
- ✅ Support ALL/ANY logic for multiple conditions
- ✅ HIDE rules execute before SHOW_ONLY
- ✅ Public /inbox-viewer respects rules
- ✅ Audit log tracks all decisions
- ✅ Pre-built templates available
