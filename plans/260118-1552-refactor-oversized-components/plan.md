# Plan: Refactor Oversized React Components

**Date:** 2026-01-18
**Status:** Ready for Implementation
**Priority:** High (Technical Debt)

## Overview

Refactor 3 oversized React components to comply with 200-line standard. Total: 2,603 lines → target ~1,200 lines across modular files.

## Target Files

| File | Current Lines | Target | Reduction |
|------|---------------|--------|-----------|
| `InboxManager.tsx` | 1,248 | ~200 | Extract 6 modules |
| `Forwarding.tsx` | 686 | ~200 | Extract 3 modules |
| `Dashboard.tsx` | 669 | ~200 | Extract 3 modules |

---

## Phase 1: InboxManager.tsx Refactoring (Highest Priority)

### Analysis - Logical Boundaries Identified:

1. **State & Data Loading** (lines 33-169) → Extract custom hook
2. **Inbox Filtering/Sorting** (lines 186-220) → Extract utility + hook
3. **Inbox Actions** (lines 222-383) → Extract custom hook
4. **Search Logic** (lines 454-528) → Extract custom hook
5. **Desktop Layout** (lines 565-804) → Extract component
6. **Mobile Layout** (lines 806-1097) → Extract component
7. **Modals & Overlays** (lines 1100-1245) → Extract component

### Proposed Structure:

```
components/inbox-manager/
├── index.ts                           # Re-exports
├── inbox-manager-page.tsx             # Main orchestrator (~150 lines)
├── hooks/
│   ├── use-inbox-data.ts              # Data loading, realtime (~100 lines)
│   ├── use-inbox-actions.ts           # CRUD operations (~120 lines)
│   ├── use-inbox-filters.ts           # Sort/filter logic (~60 lines)
│   └── use-inbox-search.ts            # Search functionality (~80 lines)
├── desktop-inbox-layout.tsx           # Desktop 3-pane view (~180 lines)
├── mobile-inbox-layout.tsx            # Mobile tab-based view (~200 lines)
└── inbox-manager-modals.tsx           # All modals combined (~100 lines)
```

### Implementation Steps:

1. Create `hooks/use-inbox-data.ts` - Extract state + loaders
2. Create `hooks/use-inbox-actions.ts` - Extract CRUD handlers
3. Create `hooks/use-inbox-filters.ts` - Extract filter/sort
4. Create `hooks/use-inbox-search.ts` - Extract search logic
5. Create `desktop-inbox-layout.tsx` - Extract desktop JSX
6. Create `mobile-inbox-layout.tsx` - Extract mobile JSX
7. Create `inbox-manager-modals.tsx` - Extract modal rendering
8. Refactor main file to orchestrate modules

---

## Phase 2: Forwarding.tsx Refactoring

### Proposed Structure:

```
components/forwarding/
├── index.ts
├── forwarding-page.tsx                # Main orchestrator (~150 lines)
├── hooks/
│   └── use-forwarding-rules.ts        # Rules CRUD (~120 lines)
├── forwarding-rule-list.tsx           # Rules list view (~150 lines)
├── forwarding-rule-form.tsx           # Add/edit form (~150 lines)
└── forwarding-rule-card.tsx           # Individual rule card (~80 lines)
```

---

## Phase 3: Dashboard.tsx Refactoring

### Proposed Structure:

```
components/dashboard/
├── index.ts
├── dashboard-page.tsx                 # Main orchestrator (~150 lines)
├── hooks/
│   └── use-dashboard-data.ts          # Data loading (~100 lines)
├── dashboard-stats-panel.tsx          # Stats cards (~120 lines)
├── dashboard-inbox-list.tsx           # Inbox list section (~150 lines)
└── dashboard-message-preview.tsx      # Message preview (~100 lines)
```

---

## Success Criteria

- [ ] All new files under 200 lines
- [ ] No functionality regression
- [ ] Build passes with no errors
- [ ] Existing tests still pass
- [ ] Type safety maintained

## Naming Convention

- Hooks: `use-{feature}-{purpose}.ts`
- Components: `{feature}-{purpose}.tsx`
- All kebab-case for LLM discoverability

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking changes | Maintain exact same props/exports |
| Import cycles | Use barrel exports (index.ts) |
| Performance | Memoize extracted components |

---

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1 (InboxManager) | 4-6 hours | High |
| Phase 2 (Forwarding) | 2-3 hours | Medium |
| Phase 3 (Dashboard) | 2-3 hours | Medium |
| **Total** | **8-12 hours** | |

## Next Steps

1. Start with Phase 1 - InboxManager (highest impact)
2. Run build after each module extraction
3. Run tests to verify no regression
4. Commit after each phase completion
