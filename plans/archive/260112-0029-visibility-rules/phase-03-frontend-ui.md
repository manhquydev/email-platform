# Phase 3: Frontend UI - Rule Management Panel

## Context
- [Plan Overview](./plan.md)
- [Phase 2: API Endpoints](./phase-02-api-endpoints.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-12 |
| Priority | MEDIUM |
| Status | 🔲 Pending |

## Key Insights
1. Add "Visibility Rules" section in inbox settings
2. Use visual condition builder (dropdowns, not text)
3. Support drag-drop for priority reordering
4. Show preview/test before applying

## Requirements
1. Rule list view with enable/disable toggle
2. Visual condition builder component
3. Template quick-apply dropdown
4. Test/preview modal showing impact
5. Drag-drop priority reordering

## UI Design

### Entry Point
- Add "Visibility Rules" button/link in InboxCard actions
- Or: New tab in InboxManager for selected inbox

### Rule List Panel
```
┌─────────────────────────────────────────────────┐
│ Visibility Rules for inbox@domain.com           │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔒 Quick Templates: [Security ▼] [Apply]    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ ≡ Hide Security Emails         [ON]  [Edit] │ │
│ │   HIDE when FROM contains "noreply"         │ │
│ │   Priority: 80                              │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ ≡ Warn Promotional               [ON]  [Edit]│ │
│ │   WARN when SUBJECT contains "promo"        │ │
│ │   Priority: 50                              │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [+ Add New Rule]        [Test All Rules]        │
└─────────────────────────────────────────────────┘
```

### Condition Builder
```
┌─────────────────────────────────────────────────┐
│ Rule Name: [Hide Security Emails              ] │
│ Description: [Optional description...         ] │
│                                                 │
│ Action: [HIDE ▼]    Match: [ALL conditions ▼]   │
│                                                 │
│ Conditions:                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ [FROM ▼] [contains ▼] [noreply      ] [x]   │ │
│ │ □ Negate  □ Case sensitive                  │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ [SUBJECT▼] [contains ▼] [verify     ] [x]   │ │
│ │ □ Negate  □ Case sensitive                  │ │
│ └─────────────────────────────────────────────┘ │
│ [+ Add Condition]                               │
│                                                 │
│ Priority: [====●=====] 80                       │
│                                                 │
│ [Cancel]                    [Save Rule]         │
└─────────────────────────────────────────────────┘
```

### Test Preview Modal
```
┌─────────────────────────────────────────────────┐
│ Test Visibility Rules                           │
│ Showing impact on last 20 messages              │
│                                                 │
│ Summary: 12 shown, 5 hidden, 2 warned, 1 redact │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ ✓ Order Confirmation from shop@...  SHOWN   │ │
│ │ ⊗ Verify your email from nore...    HIDDEN  │ │
│ │ ⚠ Special offer from market...      WARNED  │ │
│ │ ▣ Password reset from secure...    REDACTED │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│                              [Close]            │
└─────────────────────────────────────────────────┘
```

## Related Code Files
- `services/web/src/pages/InboxManager.tsx` - Add entry point
- `services/web/src/components/InboxCard.tsx` - Add button
- `services/web/src/utils/api.ts` - API calls

## Implementation Steps

### Step 1: Create API Utilities
- [ ] Add visibility rules API functions in api.ts
- [ ] Add TypeScript types for rules/templates

### Step 2: Create Rule List Component
- [ ] Create VisibilityRulesPanel.tsx
- [ ] Fetch and display rules for inbox
- [ ] Implement enable/disable toggle
- [ ] Implement delete with confirmation

### Step 3: Create Condition Builder
- [ ] Create RuleConditionBuilder.tsx
- [ ] Field dropdown with all options
- [ ] Operator dropdown (context-sensitive)
- [ ] Value input with validation
- [ ] Negate/case-sensitive checkboxes

### Step 4: Create Rule Editor Modal
- [ ] Create RuleEditorModal.tsx
- [ ] Form for name, description, type, matchType
- [ ] Embed condition builder
- [ ] Priority slider
- [ ] Save/cancel actions

### Step 5: Template Quick-Apply
- [ ] Fetch templates on mount
- [ ] Dropdown to select template
- [ ] Apply button creates rule from template

### Step 6: Test Preview
- [ ] Create TestRulesModal.tsx
- [ ] Call test endpoint
- [ ] Display results with icons

### Step 7: Drag-Drop Reordering
- [ ] Add drag handles to rule items
- [ ] Implement reorder on drop
- [ ] Call reorder API

### Step 8: Integration
- [ ] Add entry point in InboxCard
- [ ] Or: Add tab/section in InboxManager

## Todo List
- [ ] Add API utility functions
- [ ] Create VisibilityRulesPanel component
- [ ] Create RuleConditionBuilder component
- [ ] Create RuleEditorModal component
- [ ] Create TestRulesModal component
- [ ] Add drag-drop reordering
- [ ] Integrate into InboxManager

## Success Criteria
- [ ] Owner can view all rules for inbox
- [ ] Owner can create new rules visually
- [ ] Owner can edit existing rules
- [ ] Owner can delete rules
- [ ] Owner can apply templates
- [ ] Owner can test/preview rules
- [ ] Owner can reorder priorities

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Complex UI overwhelming | Start simple, add features incrementally |
| Regex input errors | Validate before save, show clear error |
| Mobile responsiveness | Test on mobile, stack layout |
