# Phase: Team Infrastructure & RBAC

## Context
Establishes the foundational multi-tenant layer required for collaborative features. This phase transforms Ephemera from a single-user tool into a platform where users can group and share resources.

## Architecture
- **Schema**: Utilize existing `Team` and `TeamMember` models in `schema.prisma`.
- **RBAC**: Implement middleware to verify `TeamRole` (OWNER, ADMIN, MEMBER, VIEWER).
- **Isolation**: Ensure teams are isolated at the API level; users only see teams they belong to.

## Implementation Steps
1. **API: Team Management**
   - Create `POST /teams` (Create team).
   - Create `GET /teams` (List user's teams).
   - Create `DELETE /teams/:id` (Owner only).
2. **API: Membership Logic**
   - Create `POST /teams/:id/members` (Invite/Add member).
   - Create `PATCH /teams/:id/members/:userId` (Update role).
   - Create `DELETE /teams/:id/members/:userId` (Remove member).
3. **Frontend: Team Settings**
   - Build `TeamSettings.tsx` to handle invitations and role management.
   - Integrate with `SettingsTabs.tsx`.

## Success Criteria
- User can create a team and invite another user via email/ID.
- Roles correctly restrict actions (e.g., VIEWER cannot remove members).
- Deleting a team cleans up all associated `TeamMember` records.
