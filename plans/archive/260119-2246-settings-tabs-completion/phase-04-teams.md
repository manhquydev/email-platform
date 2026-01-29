# Phase 04: Teams Tab Completion

## Overview
- **Priority:** P4
- **Status:** Pending
- **Est. Time:** 2-3 days

## Key Insights

### Đã Có
- ✅ Full CRUD API: teams, members, shared inboxes
- ✅ Role-based access: OWNER, ADMIN, MEMBER, VIEWER
- ✅ UI: TeamCard, TeamDetailsPanel, modals
- ✅ Share/unshare inbox functionality

### Cần Debug
- ❓ Team members không thể xem messages của shared inbox
- ❓ Permission checks thiếu trong messages/inboxes queries
- ❓ VIEWER role permissions không rõ

## Requirements

### Functional
1. Team members có thể xem shared inbox messages
2. Role-based permissions:
   - OWNER/ADMIN: full access + manage members
   - MEMBER: view + interact with messages
   - VIEWER: read-only access
3. Shared inbox hiển thị trong member's inbox list

### Non-Functional
- Query performance với team access check

## Related Code Files

### To Verify
- `services/api/src/routes/messages.ts` - Check team access
- `services/api/src/routes/inboxes.ts` - Check team access

### To Modify
- `services/api/src/routes/messages.ts` - Add team member access check
- `services/api/src/routes/inboxes.ts` - Include shared inboxes in list
- `services/web/src/pages/InboxPage.tsx` - Show shared inboxes

## Implementation Steps

### Debug Phase
1. [ ] Create team, add member, share inbox
2. [ ] Login as member → try to access shared inbox
3. [ ] Check API response - 403 or data?
4. [ ] Identify where permission check fails

### Fix Phase
5. [ ] Update GET `/inboxes` to include shared inboxes:
   ```ts
   // Current: only own inboxes
   where: { domain: { ownerId: userId } }

   // New: include team shared
   where: {
     OR: [
       { domain: { ownerId: userId } },
       { teamInboxes: { some: { team: { members: { some: { userId } } } } } }
     ]
   }
   ```

6. [ ] Update GET `/inboxes/:id/messages` permission check:
   ```ts
   // Check ownership OR team membership
   const hasAccess = await checkInboxAccess(inboxId, userId);
   ```

7. [ ] Create reusable `checkInboxAccess` helper:
   ```ts
   async function checkInboxAccess(inboxId: string, userId: string): Promise<boolean> {
     const inbox = await prisma.inbox.findFirst({
       where: {
         id: inboxId,
         OR: [
           { domain: { ownerId: userId } },
           { teamInboxes: { some: { team: { members: { some: { userId } } } } } }
         ]
       }
     });
     return !!inbox;
   }
   ```

8. [ ] Apply permission check to all inbox/message endpoints

### Enhance Phase
9. [ ] Add role-based action restrictions:
   - VIEWER: cannot delete, cannot mark read
   - MEMBER: can delete, can mark read
   - ADMIN/OWNER: full access
10. [ ] Show "Shared" badge on shared inboxes in UI
11. [ ] Add team activity log (who did what)

### Test Phase
12. [ ] Test as OWNER: can see shared inbox
13. [ ] Test as MEMBER: can see shared inbox, can interact
14. [ ] Test as VIEWER: can see, cannot modify
15. [ ] Test non-member: cannot access

## Success Criteria
- [ ] Team members can view shared inbox messages
- [ ] Role permissions enforced correctly
- [ ] Shared inboxes appear in member's inbox list
- [ ] UI shows shared status

## Risk Assessment
- **Medium Risk:** Permission logic across multiple endpoints
- **Action:** Create centralized access check helper

## Security Considerations
- Validate team membership for every request
- Prevent privilege escalation (member → admin)
- Audit log for team actions

## Completion
After all 4 phases complete, run full integration test and update docs.
