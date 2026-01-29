# Webhooks

Webhooks allow you to receive real-time notifications about events in your account. You can configure your webhook URL in the Provider Portal.

## Webhook Verification
All webhook requests include a `X-Ephemera-Signature` header. This is a HMAC-SHA256 signature of the request body using your webhook secret.

### Verification Example (Node.js)
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}
```

## Event Types

### `tenant.created`
Triggered when a new tenant is created.
```json
{
  "event": "tenant.created",
  "timestamp": "2024-03-20T10:00:00Z",
  "data": {
    "tenantId": "tenant_123",
    "externalId": "cust_123",
    "plan": "PRO"
  }
}
```

### `tenant.suspended` / `tenant.unsuspended` / `tenant.terminated`
Triggered when a tenant's status changes.

### `domain.verified`
Triggered when a domain verification completes successfully.
```json
{
  "event": "domain.verified",
  "timestamp": "2024-03-20T10:05:00Z",
  "data": {
    "tenantId": "tenant_123",
    "domain": "example.com"
  }
}
```

### `mailbox.created` / `mailbox.deleted`
Triggered when a mailbox is created or deleted.

## Retry Policy
If your server returns a non-2xx response or times out (10s), we will retry the delivery:
1. Immediate retry
2. Retry after 1 minute
3. Retry after 5 minutes
4. Retry after 15 minutes
5. Retry after 1 hour

After 5 failed attempts, the webhook delivery for that event is discarded.
