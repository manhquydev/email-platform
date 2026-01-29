# Scout Report: Ephemeral Inbox & Domain Management

## 1. Backend Services (services/api)
**Ephemeral Inbox Logic**
- `services/api/src/services/ephemeral-inbox.service.ts`: Core service for ephemeral inbox operations.
- `services/api/src/jobs/cleanup-ephemeral.ts`: Job to clean up expired ephemeral inboxes.

**Domain & Alias Management**
- `services/api/src/services/domain-verification.service.ts`: Service for verifying custom domains.
- `services/api/src/services/alias.service.ts`: Handling email aliases.

## 2. API Routes (services/api)
**Ephemeral Routes**
- `services/api/src/routes/ephemeral-inbox.ts`: API endpoints for ephemeral inboxes.

**Domain Routes**
- `services/api/src/routes/domains.ts`: Public/User domain routes.
- `services/api/src/routes/admin/domains.ts`: Admin domain management routes.
- `services/api/src/routes/inboxes.ts`: General inbox routes.

## 3. Frontend Components (services/web)
**Ephemeral UI**
- `services/web/src/pages/ephemeral-inbox-modules/ephemeral-header.tsx`: Header component for ephemeral view.
- `services/web/src/pages/ephemeral-inbox-modules/ephemeral-message-list.tsx`: Message list for ephemeral inbox.
- `services/web/src/components/three-d/ephemeral-particles.tsx`: Visual effects for ephemeral page.

**Inbox Creation & Management**
- `services/web/src/components/create-inbox-modal-modules/create-inbox-modal-components.tsx`: Modal for creating inboxes (likely needs update for custom domains).
- `services/web/src/components/inbox-selector-modules/inbox-selector-components.tsx`: Selector for switching inboxes.

## 4. Frontend Services (services/web)
- `services/web/src/services/ephemeralService.ts`: Frontend API client for ephemeral endpoints.
- `services/web/src/services/inboxService.ts`: General inbox service client.

## 5. Tests (services/api)
- `services/api/src/test/domains.test.ts`: Tests for domain functionality.
- `services/api/src/test/inbox-telegram.test.ts`: Inbox related tests.

## Unresolved Questions
1. How are custom domains currently linked to ephemeral inboxes in the database schema?
2. Does `create-inbox-modal` currently support selecting a domain, or just a username?
