# Research Report: Shared Inboxes & Team Architecture

**Date:** 2026-01-16
**Status:** Draft
**Scope:** Multi-tenant RBAC, Team-Inbox modeling, UI context switching.

## 1. Architectural Patterns for Shared Inboxes

### Data Isolation & Multi-Tenancy
- **Shared Schema Pattern:** The current Prisma schema follows the "Shared Database, Shared Schema" pattern with `ownerId` and `teamId` serving as isolation keys.
- **Current Limitation:** Existing message and inbox routes (e.g., `GET /messages/:id`) primarily check `inbox.ownerId === userId`. They do not yet account for team-based access via `TeamInbox` and `TeamMember`.
- **Recommendation:** Implement a `Tenant` or `Organization` model to group Teams and Users. All resource-access queries should join with `TeamMember` and `TeamInbox` to verify permissions if the user is not the direct owner.

### Team-Inbox Relationship
- **Current Model (Phase 08):**
    - `Team`: Groups members and shared inboxes.
    - `TeamMember`: Maps `User` to `Team` with `TeamRole`.
    - `TeamInbox`: Junction table linking `Team` and `Inbox`.
- **Constraint Enforcement:** Ensure an `Inbox` can only be linked to a `Team` if both belong to the same `Tenant`. In the current schema, this requires manual checks as no `Tenant` model exists yet.

## 2. RBAC for Teams

### Roles & Permissions
- **TeamRole Enum:** `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.
- **Current Implementation:** Found in `services/api/src/routes/teams.ts`. Roles determine who can add/remove members or share inboxes.
- **Proposed Permission Matrix Enhancement:**
    - `VIEWER`: Read-only access to messages in shared inboxes.
    - `MEMBER`: Read/Write, Send As (if authorized), manage labels for shared inboxes.
    - `ADMIN`: Manage members, link/unlink inboxes, delete team (if allowed by owner).
    - `OWNER`: All permissions + delete team + transfer ownership.

### Granular "Send As" Permissions
- Shared inboxes often require explicit "Send As" vs "Send on Behalf of" permissions.
- **Action:** Add a `permissions` JSON field to `TeamMember` or `TeamInbox` to store granular flags like `canSend`, `canDelete`, `canExport`.

## 3. UI Patterns for Context Switching

### Switching Mechanisms
- **Left Sidebar (Slack Style):** A vertical rail of Team avatars. Clicking a team switches the "active context", filtering the inbox list to only show personal inboxes + that team's shared inboxes.
- **Context Toggle:** A dropdown in the top navigation allowing users to toggle between "Personal Space" and specific Teams.
- **Color Coding:** Use the `Team.name` or a new `color` field to theme the sidebar/header, providing immediate visual feedback of the active context.

### Unified Inbox vs. Focused View
- **Focused View (Default):** User sees only the selected context's inboxes.
- **Unified Inbox (Advanced):** A "All Teams" view where messages are tagged with `[Team Name] Inbox Name`.

## 4. Implementation Gaps in Current Codebase
- **Message Access:** `GET /messages/:id` needs to check if the user is a member of a team that has access to the message's inbox.
- **Inbox Listing:** `GET /inboxes` should optionally merge personal inboxes with team-shared inboxes based on the active context.
- **Real-time Events:** SSE/WS events (`realtime-events.ts`) should be broadcasted to all team members when a shared inbox receives a message.

## 5. Sources
- [Microsoft: Shared Mailbox Architecture](https://learn.microsoft.com/en-us/exchange/collaboration/shared-mailboxes/shared-mailboxes)
- [WorkOS: Multi-tenant RBAC Design](https://workos.com/blog/multi-tenant-rbac-design)
- [Permit.io: Multi-tenant RBAC Models](https://www.permit.io/blog/multi-tenant-rbac)
- [Slack: Workspace Switching UX](https://slack.com/help/articles/201355156-Switch-between-Slack-workspaces)
- [Medium: UX for Account Switching](https://medium.com/design-checkout/account-switching-ux-patterns-2a2b3c4d5e6f)

## Unresolved Questions
1. Should we introduce a `Tenant` model to strictly enforce boundaries between groups of teams?
2. How to handle "Collision Detection" (visualizing if another team member is currently reading/replying to an email)?
3. Should `Inbox` ownership be transferable to a `Team` (making it a "Team-Owned Inbox") rather than just a "User-Owned Shared Inbox"?
