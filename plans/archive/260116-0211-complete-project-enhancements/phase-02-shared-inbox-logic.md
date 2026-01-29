# Phase: Shared Inbox Logic & UI

## Context
Enables multiple users to view and interact with the same ephemeral inbox. This is the core "collaborative" value proposition.

## Architecture
- **Access Control**: Update `Inbox` and `Message` queries to join with `TeamInbox` and `TeamMember`.
- **Context Switching**: Introduce an `activeContext` (Personal vs. Team ID) in the frontend state.
- **Real-time**: Update SSE/WebSocket logic to broadcast incoming messages to all team members subscribed to a shared inbox.

## Implementation Steps
1. **API: Inbox Sharing**
   - Create `POST /teams/:id/inboxes` (Link existing inbox to team).
   - Update `GET /inboxes` to include shared inboxes based on `teamId` filter.
2. **API: Permission Middleware**
   - Refactor `checkInboxOwnership` to `checkInboxAccess` (supporting both owner and team membership).
3. **Frontend: Context Switcher**
   - Add a "Space Switcher" to the sidebar (Slack-style rail).
   - Update `Dashboard.tsx` to filter message list by the active context.
4. **Backend: Real-time Broadcast**
   - Modify `inbox-service.ts` to fetch all team member IDs when a message arrives for a shared inbox.

## Success Criteria
- User A shares an inbox with Team 1.
- User B (member of Team 1) can see and read messages in that inbox.
- Real-time notifications for shared inboxes trigger for all members simultaneously.
