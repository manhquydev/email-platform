# Webhooks

## Overview

Ephemera sends webhook notifications for real-time event updates.

## Configuration

Set webhook URL in provider settings:

```bash
curl -X PATCH https://api.ephemera.email/v1/provider/me \
  -H "X-Provider-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-server.com/ephemera-webhook"}'
```

## Webhook Format

```json
{
  "id": "evt_uuid",
  "type": "tenant.created",
  "timestamp": "2026-01-29T12:00:00Z",
  "data": {
    "tenantId": "uuid",
    "externalId": "your-id"
  },
  "signature": "sha256=..."
}
```

## Event Types

### Tenant Events

| Event | Description |
|-------|-------------|
| `tenant.created` | New tenant provisioned |
| `tenant.suspended` | Tenant suspended |
| `tenant.unsuspended` | Tenant restored |
| `tenant.terminated` | Tenant deleted |
| `tenant.plan_changed` | Plan upgraded/downgraded |

### Domain Events

| Event | Description |
|-------|-------------|
| `domain.added` | Domain added to tenant |
| `domain.verified` | Domain DNS verified |
| `domain.removed` | Domain removed |

### Mailbox Events

| Event | Description |
|-------|-------------|
| `mailbox.created` | New mailbox created |
| `mailbox.deleted` | Mailbox removed |
| `mailbox.quota_warning` | 80% storage used |
| `mailbox.quota_exceeded` | 100% storage used |

### Usage Events

| Event | Description |
|-------|-------------|
| `usage.daily_report` | Daily usage summary |
| `usage.overage` | Plan limits exceeded |

## Signature Verification

Verify webhook authenticity using HMAC-SHA256:

```php
<?php
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_EPHEMERA_SIGNATURE'];
$secret = 'your_webhook_secret';

$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('Invalid signature');
}

$event = json_decode($payload, true);
// Process event...
```

## Retry Policy

Failed webhooks are retried:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |

After 5 failures, webhook is marked failed and logged.

## Test Webhook

Send test event to verify endpoint:

```bash
curl -X POST https://api.ephemera.email/v1/provider/webhooks/test \
  -H "X-Provider-Key: YOUR_KEY"
```

## View Webhook Events

```bash
curl https://api.ephemera.email/v1/provider/webhooks/events \
  -H "X-Provider-Key: YOUR_KEY"
```

Response:
```json
{
  "events": [
    {
      "id": "evt_uuid",
      "type": "tenant.created",
      "status": "DELIVERED",
      "attempts": 1,
      "createdAt": "2026-01-29T12:00:00Z",
      "deliveredAt": "2026-01-29T12:00:01Z"
    }
  ]
}
```

## Best Practices

1. **Respond quickly** - Return 200 within 5 seconds
2. **Process async** - Queue events for background processing
3. **Idempotency** - Handle duplicate events gracefully
4. **Verify signatures** - Always validate HMAC signature
5. **Log events** - Store raw payloads for debugging
