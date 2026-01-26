# Ephemera Project: Current State Analysis

## 1. Current Capabilities
**Architecture**: Zero-friction public API, token-based access (no auth required).
**Core Features**:
- **Random Address Generation**: `adjective-noun-number` format (e.g., `swift-tiger-123`).
- **Auto-Expiry**: Default 2 hours, extendable.
- **Inbox Management**: Create, Read, Extend, List Messages.
- **Cleanup**: Automated job for expired inboxes/messages.

## 2. Technical Implementation
- **Backend**: `ephemeral-inbox.service.ts`
  - Hardcoded `EPHEMERAL_DOMAIN` (default: `ephemera.email`).
  - No input parameter for `localPart` (alias) in `create()`.
  - Single domain support only.
- **Database**: Uses standard `Inbox` table with `flags: { isEphemeral: true }`.
- **Frontend**: Simple API wrapper, no UI controls for alias/domain customization.

## 3. Gaps & Limitations
| Feature | Current State | Gap |
| :--- | :--- | :--- |
| **Custom Aliases** | Random only | Users cannot choose names (e.g., `john.doe`). |
| **Domain Selection** | Single default domain | No choice of generic vs premium domains. |
| **Premium Features** | None in Ephemeral | No "Plus" tier for custom aliases/domains. |
| **Persistence** | Token-based only | No way to "claim" or convert to permanent inbox. |

## 4. Unresolved Questions
- Is there a list of premium domains available in the DB?
- Are there reserved words lists for custom aliases to prevent abuse?
