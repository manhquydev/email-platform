# Phase 3: Webhooks & Deliverability

## Context
Sending is half the battle. We need to know if emails landed (Delivered), bounced (Hard/Soft), or were marked as spam (Complaint).

## Requirements
1.  **Endpoints**: `POST /webhooks/ses`, `POST /webhooks/mailgun`, etc.
2.  **Normalization**: Map provider-specific events to internal events: `DELIVERED`, `BOUNCE`, `COMPLAINT`.
3.  **Action**: Update `Message` table status.

## Implementation Steps
1.  **Database**:
    - Ensure `Message` table has columns for `deliveryStatus`, `deliveryProviderId`, `bounceReason`.
2.  **Webhook Handlers**:
    - **SES**: Verify SNS signature (critical security). Parse notification type.
    - **Mailgun**: Verify signature (timestamp/token). Parse event-data.
3.  **Service Method**:
    - `MessageService.updateDeliveryStatus(messageId, status, meta)`.
4.  **Route Registration**:
    - Register routes in `src/routes/webhooks.ts`.

## Security
- **SES**: Must validate SNS certificate to prevent spoofing.
- **Mailgun**: Must validate HMAC signature.

## Todo List
- [ ] Add columns to DB Schema (if missing)
- [ ] Implement `MessageService.updateDeliveryStatus`
- [ ] Implement SES Webhook Handler
- [ ] Implement Mailgun Webhook Handler
- [ ] Add Tests for payload parsing
