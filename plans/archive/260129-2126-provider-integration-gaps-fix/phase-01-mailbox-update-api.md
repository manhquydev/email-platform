# Phase 1: Mailbox Update API

## Overview
- **Priority**: P1
- **Effort**: 1h
- **Status**: Pending

## Requirements
Add PATCH endpoint for mailbox updates:
- Reset password
- Update quota
- Update display name

## Implementation

### Endpoint
`PATCH /v1/provider/tenants/:tenantId/mailboxes/:email`

### Request Body
```json
{
  "password": "newPassword123",  // optional
  "quota": 1073741824,           // optional, bytes
  "displayName": "John Doe"      // optional
}
```

### Files to Modify
- `services/api/src/routes/provider.ts` - Add PATCH route
- `services/api/src/services/hosting-provider.service.ts` - Add updateMailbox method

## Todo
- [ ] Add updateMailbox method to service
- [ ] Add PATCH route to provider.ts
- [ ] Add input validation schema
- [ ] Test endpoint
