# Phase 03: Smart Search & Filters

**Date:** 2026-01-14
**Status:** Pending
**Priority:** Medium
**Estimated Complexity:** Medium

## Context
- [Main Plan](./plan.md)
- [Email UX Patterns Research](../reports/researcher-260114-0631-email-ux-patterns.md)

## Overview
Enhance search with smart filter chips, natural language support, and better results UX.

## Current State
- Basic search with `from:`, `has:attachment`, `is:unread` operators
- Search switches to messages tab
- No recent searches
- No filter chips

## Target State
- Smart filter chips below search bar
- Recent searches dropdown
- Natural language query parsing
- Inline search results without tab switch
- Fuzzy search support (already in API)

## Requirements

### Functional
- [ ] Filter chips: Has attachment, Unread, This week, From domain
- [ ] Recent searches (5 most recent, localStorage)
- [ ] Click-to-apply search suggestions
- [ ] Clear search button
- [ ] Search within current inbox option

### Non-Functional
- [ ] Debounced search (300ms)
- [ ] Search history persisted
- [ ] Accessible (screen reader support)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 [Search messages...                            ] [X] │
├─────────────────────────────────────────────────────────┤
│ Filters: [Has attachment] [Unread] [This week] [+]      │
├─────────────────────────────────────────────────────────┤
│ Recent: "verification code" | "from:amazon" | "otp"     │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

1. **Create SearchBar component (enhanced)**
   - Input with search icon
   - Clear button when has value
   - Dropdown for recent searches
   - Debounced onChange

2. **Create FilterChips component**
   - Predefined chips: Has attachment, Unread, This week
   - Active state toggle
   - Custom filter modal (+)

3. **Create SearchSuggestions component**
   - Recent searches list
   - Quick filters as chips
   - Keyboard navigation

4. **Update search logic in InboxManager**
   - Combine chip filters with text query
   - Build API query params
   - Show results inline

5. **Add useSearchHistory hook**
   - Store in localStorage
   - Max 10 items
   - Dedup entries

## Files to Modify
- `services/web/src/pages/InboxManager.tsx`
- `services/web/src/layouts/FocusStreamLayout.tsx`

## Files to Create
- `services/web/src/components/search/EnhancedSearchBar.tsx`
- `services/web/src/components/search/FilterChips.tsx`
- `services/web/src/components/search/SearchSuggestions.tsx`
- `services/web/src/hooks/useSearchHistory.ts`
- `services/web/src/hooks/useDebounce.ts` (if not exists)

## API Endpoints Used
- `GET /messages/search` - Search across all messages
- `GET /messages/search/fuzzy` - Fuzzy search with pg_trgm

## Success Criteria
- [ ] Filter chips toggle search filters
- [ ] Recent searches appear on focus
- [ ] Debounced search works
- [ ] Results show inline
- [ ] Fuzzy search accessible via toggle

## Risk Assessment
- **Low:** Mostly UI changes
- **Low:** API endpoints already exist

## Security Considerations
- Sanitize search input before API call
- No XSS in search suggestions display
