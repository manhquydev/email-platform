# Phase 1: Async Queue Refactor

## Context
Currently, `POST /messages/outbound` sends emails synchronously. This blocks the API and risks timeouts/failures if the SMTP connection is slow. We need to decouple the API response from the actual sending process.

## Requirements
1.  **Immediate Response**: API should return `202 Accepted` + `jobId` immediately.
2.  **Reliability**: Emails must be persisted to Redis (BullMQ) before response.
3.  **Retries**: Failed sends should retry automatically with exponential backoff.

## Architecture
*   **Queue**: `outbound-email` (BullMQ).
*   **Producer**: `src/routes/outbound.ts` pushes job `{ messageId, to, subject, body, attachments }`.
*   **Consumer**: New worker `src/workers/outbound-email.ts` that calls `MailerService`.

## Implementation Steps
1.  **Setup Queue**:
    - Create `src/lib/queues/outbound.ts` to export the queue instance.
2.  **Refactor Route**:
    - Modify `src/routes/outbound.ts` to validate payload -> create DB record (status: 'queued') -> add to Queue -> return 202.
3.  **Create Worker**:
    - Create `src/workers/outbound-email.ts`.
    - Move logic from `src/routes/outbound.ts` (sending part) to this worker.
    - On success: Update DB record status to 'sent'.
    - On fail: Update DB record status to 'failed' (after retries).
4.  **Register Worker**:
    - Ensure the worker is started in `src/index.ts` or a separate worker process entry point.

## Verification
- Call API: Should return instantly.
- Check Redis: Job should appear.
- Check Logs: "Email sent" log should appear slightly later.
