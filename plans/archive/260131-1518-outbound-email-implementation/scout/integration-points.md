# Outbound Email Integration Points

## 1. Backend (`services/api`)

The backend infrastructure for sending emails is largely in place, utilizing `nodemailer` and `googleapis` (for Gmail fallback).

### Core Service
- **File**: `services/api/src/services/outbound.ts`
- **Class**: `OutboundService`
- **Status**: Implemented. Handles SMTP transport, Google OAuth2 fallback, and DKIM signing.

### API Routes
- **File**: `services/api/src/routes/outbound.ts`
- **Endpoint**: `POST /messages/outbound`
- **Status**: Implemented. Handles validation, permissions, and database recording.
- **Note**: Currently performs synchronous sending. Recommended to move to async queue.

### Queue/Worker
- **File**: `services/api/src/services/outbound-delivery.ts`
- **Status**: Implemented for SMTP Ingest (raw files).
- **Queue Name**: `email-ingest`
- **Integration Needed**: Needs adaptation or a parallel worker to handle API-triggered outbound jobs (JSON payloads) to decouple the HTTP response from SMTP transmission.

## 2. Frontend (`services/web`)

### UI Components
- **File**: `services/web/src/components/ComposeModal.tsx`
- **Status**: Implemented. Includes fields for To, Cc, Bcc, Subject, and Attachments.
- **Dependencies**: Uses internal `Editor` component and `api` utility.

## 3. Recommended Next Steps

1.  **Async Decoupling**: Refactor `POST /messages/outbound` to push jobs to BullMQ instead of direct sending.
2.  **Worker Enhancement**: Extend `outbound-delivery.ts` or create `outbound-api-worker.ts` to process these queued jobs.
3.  **Status Sync**: Ensure the worker updates the `OutboundMessage` status in Postgres (queued -> sending -> sent/failed).
