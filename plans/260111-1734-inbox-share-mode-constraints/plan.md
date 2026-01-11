# Inbox Share Mode Constraints

## Overview
Add `shareMode` field to Inbox model allowing owners to control public access to their inbox via `/inbox-viewer`.

## Status: Completed

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Database Schema Update | Done |
| 02 | Backend API Updates | Done |
| 03 | Frontend Error Handling | Done |
| 04 | Testing | Done |

## Key Changes

### Database
- Add `ShareMode` enum: `PUBLIC`, `PRIVATE` (default)
- Add `shareMode` field to `Inbox` model
- Existing inboxes default to `PRIVATE` for security

### Backend (public-inbox.ts)
- Check `shareMode` before allowing access
- Return 403 for PRIVATE inbox access attempts
- Audit log denied access attempts

### Frontend
- Display specific error messages for 403/404
- Show lock icon for private inboxes
- Actionable guidance in error states

## Files Modified
- `services/api/prisma/schema.prisma`
- `services/api/src/routes/public-inbox.ts`
- `services/web/src/pages/InboxViewer.tsx`
- `services/web/src/components/inbox-viewer/search-form.tsx`

## Backward Compatibility
- Existing inboxes default to PRIVATE (secure by default)
- No breaking changes to API response structure
