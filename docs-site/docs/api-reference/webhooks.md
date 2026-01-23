---
sidebar_position: 5
---

# Webhooks

Receive real-time notifications when emails arrive.

## Create Webhook

```http
POST /v1/webhooks
```

### Request Body

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["message.received"],
  "secret": "your-webhook-secret"
}
```

### Response

```json
{
  "data": {
    "id": "whk_abc123",
    "url": "https://your-server.com/webhook",
    "events": ["message.received"],
    "active": true,
    "createdAt": "2026-01-23T12:00:00Z"
  }
}
```

## Webhook Events

| Event | Description |
|-------|-------------|
| `message.received` | New email received in any inbox |
| `inbox.expired` | Inbox has expired |

## Webhook Payload

```json
{
  "event": "message.received",
  "timestamp": 1706011200,
  "data": {
    "messageId": "msg_xyz789",
    "inboxId": "inb_abc123",
    "from": "noreply@example.com",
    "subject": "Verify your email"
  }
}
```

## Signature Verification

Webhooks include HMAC-SHA256 signature for verification:

```
X-Ephemera-Signature: sha256=abc123...
X-Ephemera-Timestamp: 1706011200
```

### Verification Example

```javascript
import { SignatureVerifier } from '@ephemera/sdk';

app.post('/webhook', (req, res) => {
  const isValid = SignatureVerifier.verify(
    req.body,
    req.headers['x-ephemera-signature'],
    process.env.WEBHOOK_SECRET,
    parseInt(req.headers['x-ephemera-timestamp'])
  );

  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }

  // Process webhook...
  res.sendStatus(200);
});
```

## List Webhooks

```http
GET /v1/webhooks
```

## Delete Webhook

```http
DELETE /v1/webhooks/:id
```
