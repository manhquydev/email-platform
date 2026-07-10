---
sidebar_position: 2
---

# Webhook Integration

Receive real-time notifications when emails arrive.

## Setup

### 1. Create Webhook Endpoint

```javascript
// Express.js example
app.post('/webhooks/ephemera', express.raw({ type: 'application/json' }), (req, res) => {
  const payload = req.body.toString();
  const signature = req.headers['x-ephemera-signature'];
  const timestamp = parseInt(req.headers['x-ephemera-timestamp']);

  // Verify signature (see below)

  const event = JSON.parse(payload);
  console.log('Event:', event.event, event.data);

  res.sendStatus(200);
});
```

### 2. Register Webhook

```bash
curl -X POST https://api.manhquy.id.vn/v1/webhooks \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "url": "https://your-server.com/webhooks/ephemera",
    "events": ["message.received"],
    "secret": "whsec_your_secret"
  }'
```

## Signature Verification

Always verify webhook signatures to ensure authenticity:

```javascript
import { SignatureVerifier } from '@ephemera/sdk';

const isValid = SignatureVerifier.verify(
  payload,           // Raw request body
  signature,         // X-Ephemera-Signature header
  webhookSecret,     // Your webhook secret
  timestamp          // X-Ephemera-Timestamp header
);

if (!isValid) {
  return res.status(400).send('Invalid signature');
}
```

## Event Types

| Event | Trigger |
|-------|---------|
| `message.received` | New email arrives |
| `inbox.expired` | Inbox TTL reached |

## Payload Format

```json
{
  "event": "message.received",
  "timestamp": 1706011200,
  "data": {
    "messageId": "msg_xyz",
    "inboxId": "inb_abc",
    "from": "sender@example.com",
    "subject": "Welcome!"
  }
}
```

## Retry Policy

Failed webhooks are retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 1 minute
- Attempt 3: 5 minutes
- Attempt 4: 30 minutes
- Attempt 5: 2 hours

After 5 failures, webhook is disabled.
