# Phase 2: Power User Features

**Priority:** P1 | **Effort:** 10h | **Status:** Pending

## Overview

Close feature gaps identified in competitive benchmarking. Custom prefix and domain picker address top user requests. Search enables efficient inbox management for heavy users.

## Requirements

### Custom Prefix Creation (3h)
- [ ] Add "Custom Address" toggle in inbox creation flow
- [ ] Input field for local-part with validation (alphanumeric, dots, hyphens)
- [ ] Show availability check before creation
- [ ] Fallback to random if custom unavailable

### Domain Picker (3h)
- [ ] Fetch available domains from `/extension/domains` endpoint
- [ ] Dropdown selector in inbox creation UI
- [ ] Cache domain list in storage (refresh daily)
- [ ] Default to first domain if user doesn't select

### Search & Filter (3h)
- [ ] Add search input to MessageList header
- [ ] Local filtering by subject, sender, body preview
- [ ] Debounced search (300ms) for performance
- [ ] Highlight matching terms in results

### UX Improvements (1h)
- [ ] Add action CTA to "No inboxes yet" empty state
- [ ] Add "Refresh" hint to "Inbox empty" state
- [ ] Improve loading skeleton animations

## Implementation Steps

1. Create `components/CustomPrefixInput.tsx` with validation
2. Modify `InboxList.tsx` creation flow to include custom prefix option
3. Add `api.getDomains()` method to fetch domain list
4. Create `components/DomainPicker.tsx` dropdown component
5. Add `searchQuery` state to MessageList, filter messages locally
6. Create `components/SearchInput.tsx` with debounce
7. Update empty states with actionable CTAs

## Success Criteria

- [ ] Users can create inboxes with custom local-part
- [ ] Domain selection works when API returns multiple domains
- [ ] Search filters messages in <100ms for 50+ messages
- [ ] Empty states have clear next-action buttons

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API doesn't support custom prefix | Medium | High | Confirm API capability first |
| Domain endpoint not implemented | Medium | High | Use single hardcoded domain as fallback |
| Search performance on large inboxes | Low | Medium | Limit to 100 messages, add pagination |

## Dependencies

- **Backend:** `GET /extension/domains` endpoint
- **Backend:** Custom prefix support in `POST /extension/inbox`
- **Phase 1:** Must complete stability fixes first

## Deliverables

- `components/CustomPrefixInput.tsx`
- `components/DomainPicker.tsx`
- `components/SearchInput.tsx`
- Updated `InboxList.tsx` with creation enhancements
- Updated `MessageList.tsx` with search
