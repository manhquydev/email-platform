# Phase 01: Filters Tab Completion

## Overview
- **Priority:** P1
- **Status:** Pending
- **Est. Time:** 2-3 days

## Key Insights

### Đã Có
- ✅ `emailFilters.ts` service với đầy đủ logic: `evaluateCondition`, `executeFilterActions`, `processFiltersForMessage`
- ✅ `worker.ts` import và gọi `processFiltersForMessage` (line 16)
- ✅ UI hoàn chỉnh: FilterCard, FilterModal với conditions/actions builder
- ✅ API CRUD: GET/POST/PATCH/DELETE cho filters

### Cần Debug
- ❓ Verify `processFiltersForMessage` được gọi đúng trong worker flow
- ❓ Actions FORWARD, MOVE_TO_FOLDER chưa implement thực tế
- ❓ Thiếu filter test/preview functionality

## Requirements

### Functional
1. Filters phải được evaluate khi email mới đến
2. Actions phải execute đúng: MARK_READ, ADD_LABEL, DELETE, etc.
3. User có thể test filter với sample email data

### Non-Functional
- Filter execution < 100ms per filter
- Logging cho debug filter matches

## Architecture

```
Email Arrives → worker.ts → processFiltersForMessage() → executeFilterActions()
                                    ↓
                           emailFilters.ts service
                                    ↓
                           Database updates (isRead, labels, deletedAt)
```

## Related Code Files

### To Verify
- `services/api/src/worker.ts` - Check if processFiltersForMessage is called
- `services/api/src/services/emailFilters.ts` - Filter engine

### To Modify
- `services/api/src/routes/filters.ts` - Add test endpoint
- `services/web/src/components/settings/filters-tab-modules/` - Add test UI

## Implementation Steps

### Debug Phase
1. [ ] Add logging to `processFiltersForMessage` entry/exit
2. [ ] Send test email and verify logs show filter execution
3. [ ] Check if filters are being fetched correctly from DB
4. [ ] Verify action execution (check DB after filter runs)

### Fix Phase
5. [ ] Fix any issues found in debug phase
6. [ ] Implement proper error handling if filter fails
7. [ ] Add metrics/stats for filter execution

### Enhance Phase
8. [ ] Add `POST /filters/:id/test` endpoint
   ```ts
   // Test filter with sample email data
   app.post('/filters/:id/test', async (req) => {
     const { fromAddress, toAddress, subject, body } = req.body;
     const result = await getMatchingFilters(inboxId, emailData);
     return { matches: result.length > 0, filters: result };
   });
   ```
9. [ ] Add "Test Filter" button in FilterModal UI
10. [ ] Show filter match history/stats

### Test Phase
11. [ ] Create test for filter evaluation logic
12. [ ] E2E test: create filter → send email → verify action applied

## Success Criteria
- [ ] Logs confirm filters are evaluated on email arrival
- [ ] Actions (MARK_READ, ADD_LABEL, DELETE) work correctly
- [ ] Test endpoint returns accurate match results
- [ ] UI shows test preview functionality

## Risk Assessment
- **Low Risk:** Filter logic already implemented
- **Medium Risk:** Worker integration may have edge cases
- **Action:** Add comprehensive logging before changes

## Security Considerations
- Validate filter conditions to prevent ReDoS (regex patterns)
- Rate limit filter test endpoint
- Sanitize filter action values

## Next Steps
After completion, proceed to [Phase 02: Labels](./phase-02-labels.md)
