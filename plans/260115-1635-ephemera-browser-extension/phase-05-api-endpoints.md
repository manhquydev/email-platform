# Phase 5: Backend API Endpoints

**Status**: Pending
**Goal**: Optimize API for extension usage.

## Tasks
- [ ] Create `services/api/src/routes/extension.ts`
- [ ] **Endpoint: Quick Inbox (`POST /extension/quick-inbox`)**
  - [ ] Accepts: `{ domainId? }`
  - [ ] Logic:
    - If authenticated: Create inbox for user.
    - If anonymous: Logic for anonymous creation (maybe return a signed token for this specific inbox?) OR require basic "Device ID" auth.
    - Return: `{ inbox: { id, email, ... } }`
- [ ] **Endpoint: Dashboard Sync (`GET /extension/dashboard`)**
  - [ ] Returns aggregated view:
    - List of active inboxes (limit 5)
    - Total unread count
    - User tier status
  - [ ] Reduces HTTP calls from Popup.
- [ ] **Endpoint: Check Auth (`GET /extension/check-auth`)**
  - [ ] Simple ping to verify token validity.

## Security
- Rate limiting is crucial for `quick-inbox`.
- CORS: Ensure `chrome-extension://` origin is allowed (or allow all for public API?).

## Deliverables
- New endpoints deployed
- Swagger/OpenAPI documentation updated (if applicable)
