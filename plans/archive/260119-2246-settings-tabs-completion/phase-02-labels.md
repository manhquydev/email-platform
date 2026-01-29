# Phase 02: Labels Tab Completion

## Overview
- **Priority:** P2
- **Status:** Pending
- **Est. Time:** 2 days

## Key Insights

### Đã Có
- ✅ CRUD API đầy đủ: `/labels`, `/inboxes/:id/labels`
- ✅ Message-Label association: `/messages/:id/labels/:labelId`
- ✅ UI: LabelCard, LabelModal với color picker
- ✅ Hierarchical labels support (parentId in schema)

### Cần Debug
- ❓ Labels không hiển thị trong message list view
- ❓ Bulk label assignment chưa có
- ❓ Label hierarchy UI chưa implement

## Requirements

### Functional
1. Message list hiển thị labels đã gắn
2. Có thể gắn/gỡ label từ message detail view
3. Bulk select messages → apply label

### Non-Functional
- Label operations < 50ms response time

## Related Code Files

### To Verify
- `services/api/src/routes/messages.ts` - Check if labels included in response
- `services/web/src/pages/InboxPage.tsx` - Message list rendering

### To Modify
- `services/api/src/routes/messages.ts` - Include labels in message query
- `services/web/src/components/messages/` - Show labels in UI

## Implementation Steps

### Debug Phase
1. [ ] Check GET `/inboxes/:id/messages` response - does it include labels?
2. [ ] Verify MessageLabel table has data after adding labels
3. [ ] Check frontend message type includes labels field

### Fix Phase
4. [ ] Update messages query to include labels:
   ```ts
   include: {
     labels: {
       include: { label: true }
     }
   }
   ```
5. [ ] Update frontend Message type to include labels
6. [ ] Render label badges in MessageListItem component

### Enhance Phase
7. [ ] Add quick label menu in message row (dropdown)
8. [ ] Implement bulk label assignment:
   - [ ] Add checkbox selection to message list
   - [ ] Add "Apply Label" bulk action button
   - [ ] Create `POST /messages/bulk/labels` endpoint
9. [ ] Add label filter to message list (show only messages with label X)

### Test Phase
10. [ ] Test label CRUD operations
11. [ ] Test message-label association
12. [ ] Test bulk operations

## Success Criteria
- [ ] Labels visible in message list
- [ ] Can add/remove labels from message detail
- [ ] Bulk label assignment works
- [ ] Filter messages by label works

## Next Steps
After completion, proceed to [Phase 03: Retention](./phase-03-retention.md)
