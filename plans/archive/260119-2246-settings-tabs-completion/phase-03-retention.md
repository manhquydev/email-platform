# Phase 03: Retention Tab Completion

## Overview
- **Priority:** P3
- **Status:** Pending
- **Est. Time:** 1-2 days

## Key Insights

### Đã Có
- ✅ `retention.ts` sweep job với tier-based limits
- ✅ Schema: `User.retentionDays`, `Inbox.retentionDays`
- ✅ UI: RetentionSettings với tier info, default/inbox settings
- ✅ Sweep job respects hierarchy: inbox → user → tier → global

### Cần Debug
- ❓ PATCH `/auth/me` có hỗ trợ `retentionDays` field?
- ❓ PATCH `/inboxes/:id` có hỗ trợ `retentionDays` field?
- ❓ Sweep job interval configured correctly?

## Requirements

### Functional
1. User có thể set default retention days
2. User có thể set per-inbox retention days
3. Retention sweep job xóa messages đúng theo settings
4. Manual purge button cho admin

### Non-Functional
- Sweep job runs on configured interval (RETENTION_SWEEP_MINUTES)

## Related Code Files

### To Verify
- `services/api/src/routes/auth.ts` - Check PATCH /auth/me
- `services/api/src/routes/inboxes.ts` - Check PATCH /inboxes/:id
- `services/api/src/index.ts` - Check sweep job scheduling

### To Modify (if needed)
- `services/api/src/routes/auth.ts` - Add retentionDays to PATCH
- `services/api/src/routes/inboxes.ts` - Add retentionDays to PATCH

## Implementation Steps

### Debug Phase
1. [ ] Test PATCH `/auth/me` with `{ retentionDays: 7 }` - does it work?
2. [ ] Test PATCH `/inboxes/:id` with `{ retentionDays: 7 }` - does it work?
3. [ ] Check `RETENTION_SWEEP_MINUTES` env var is set
4. [ ] Verify sweep job logs in console

### Fix Phase
5. [ ] If auth.ts doesn't support retentionDays, add to schema:
   ```ts
   const updateSchema = z.object({
     retentionDays: z.number().int().min(1).max(365).nullable().optional(),
     // ... other fields
   });
   ```
6. [ ] If inboxes.ts doesn't support, add similarly
7. [ ] Add validation: retention days cannot exceed tier limit

### Enhance Phase
8. [ ] Add "Purge Now" button for admin (manual trigger sweep)
9. [ ] Show next sweep time in UI
10. [ ] Add retention stats (how many messages will be deleted)

### Test Phase
11. [ ] Test setting user default retention
12. [ ] Test setting inbox-specific retention
13. [ ] Verify sweep job respects custom settings (use short TTL for test)

## Success Criteria
- [ ] Can save user default retention days
- [ ] Can save inbox-specific retention days
- [ ] Sweep job runs and deletes old messages
- [ ] Tier limits enforced

## Security Considerations
- Validate retention days against tier limits
- Only owner can change inbox retention

## Next Steps
After completion, proceed to [Phase 04: Teams](./phase-04-teams.md)
