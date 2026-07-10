# Ephemera API Reference

> **Vibe Coding Ready** - Copy this file into your AI assistant (Claude, Cursor, Copilot) for instant API integration.

## Base URL
```
https://api.manhquy.id.vn
```

## Authentication
All API requests require authentication via API Key in the header:
```bash
Authorization: Bearer YOUR_API_KEY
# or
X-API-Key: YOUR_API_KEY
```

Get your API key at: https://app.manhquy.id.vn/settings?tab=developer

---

## Quick Start Examples

### Create Inbox & Wait for Email (Node.js)
```javascript
const API_KEY = 'epk_live_xxx';
const API_BASE = 'https://api.manhquy.id.vn';

// 1. Create inbox
const inbox = await fetch(`${API_BASE}/inboxes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ domainId: 'your-domain-id' })
}).then(r => r.json());

console.log(`Email: ${inbox.localPart}@${inbox.domain.name}`);

// 2. Poll for messages
const messages = await fetch(`${API_BASE}/inboxes/${inbox.id}/messages`, {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
}).then(r => r.json());

// 3. Get message with OTP
if (messages.length > 0) {
  const msg = await fetch(`${API_BASE}/messages/${messages[0].id}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  }).then(r => r.json());

  console.log(`OTP Code: ${msg.extractedOtp}`);
}
```

### Create Inbox & Wait for Email (Python)
```python
import requests
import time

API_KEY = 'epk_live_xxx'
API_BASE = 'https://api.manhquy.id.vn'
headers = {'Authorization': f'Bearer {API_KEY}'}

# 1. Create inbox
inbox = requests.post(f'{API_BASE}/inboxes',
    headers=headers,
    json={'domainId': 'your-domain-id'}
).json()

email = f"{inbox['localPart']}@{inbox['domain']['name']}"
print(f"Email: {email}")

# 2. Wait for email (polling)
for _ in range(30):  # 30 attempts, 2s each = 60s timeout
    messages = requests.get(
        f"{API_BASE}/inboxes/{inbox['id']}/messages",
        headers=headers
    ).json()

    if messages:
        msg = requests.get(
            f"{API_BASE}/messages/{messages[0]['id']}",
            headers=headers
        ).json()
        print(f"OTP: {msg.get('extractedOtp')}")
        break
    time.sleep(2)
```

### cURL Examples
```bash
# Create inbox
curl -X POST https://api.manhquy.id.vn/inboxes \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domainId": "your-domain-id"}'

# List messages
curl https://api.manhquy.id.vn/inboxes/{inbox_id}/messages \
  -H "Authorization: Bearer YOUR_API_KEY"

# Get message with OTP
curl https://api.manhquy.id.vn/messages/{message_id} \
  -H "Authorization: Bearer YOUR_API_KEY"

# Delete inbox
curl -X DELETE https://api.manhquy.id.vn/inboxes/{inbox_id} \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Endpoints Reference

### Inboxes

#### POST /inboxes - Create Inbox
```json
// Request
{
  "domainId": "uuid",           // Required: Domain ID
  "localPart": "custom-name",   // Optional: Custom email prefix
  "expiresAt": "2024-12-31T23:59:59Z"  // Optional: Expiration time
}

// Response 201
{
  "id": "uuid",
  "localPart": "random123",
  "domain": {
    "id": "uuid",
    "name": "manhquy.id.vn"
  },
  "ownerId": "uuid",
  "expiresAt": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### GET /inboxes - List Inboxes
```json
// Response 200
[
  {
    "id": "uuid",
    "localPart": "random123",
    "domain": { "id": "uuid", "name": "manhquy.id.vn" },
    "messageCount": 5,
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

#### GET /inboxes/:id - Get Inbox
```json
// Response 200
{
  "id": "uuid",
  "localPart": "random123",
  "domain": { "id": "uuid", "name": "manhquy.id.vn" },
  "ownerId": "uuid",
  "expiresAt": null,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### DELETE /inboxes/:id - Delete Inbox
```json
// Response 200
{ "success": true }
```

#### GET /inboxes/:id/messages - List Messages
```json
// Response 200
[
  {
    "id": "uuid",
    "fromAddress": "sender@example.com",
    "toAddress": "random123@manhquy.id.vn",
    "subject": "Verification Code",
    "receivedAt": "2024-01-15T10:30:00Z",
    "isRead": false,
    "extractedOtp": "123456"
  }
]
```

---

### Messages

#### GET /messages/:id - Get Message
```json
// Response 200
{
  "id": "uuid",
  "fromAddress": "sender@example.com",
  "toAddress": "random123@manhquy.id.vn",
  "subject": "Your verification code",
  "textBody": "Your code is 123456",
  "htmlBody": "<html>...</html>",
  "headers": { "from": "...", "to": "..." },
  "receivedAt": "2024-01-15T10:30:00Z",
  "isRead": true,
  "extractedOtp": "123456",
  "otpConfidence": "high",
  "attachments": [
    { "id": "uuid", "filename": "doc.pdf", "size": 1024 }
  ]
}
```

#### PATCH /messages/:id/read - Mark as Read
```json
// Response 200
{ "success": true }
```

#### DELETE /messages/:id - Delete Message
```json
// Response 200
{ "success": true }
```

#### GET /messages/:id/attachments/:attachmentId - Download Attachment
Returns binary file with appropriate Content-Type header.

---

### Domains

#### GET /domains - List Domains
```json
// Response 200
[
  {
    "id": "uuid",
    "name": "manhquy.id.vn",
    "verified": true,
    "isPublic": true,
    "mxVerified": true,
    "spfVerified": true,
    "dkimVerified": true
  }
]
```

#### POST /domains - Add Custom Domain
```json
// Request
{ "name": "yourdomain.com" }

// Response 201
{
  "id": "uuid",
  "name": "yourdomain.com",
  "verified": false,
  "verificationToken": "ephemera-verify-xxx",
  "mxRecord": "mx.manhquy.id.vn"
}
```

#### GET /domains/:id/dns-check - Check DNS Records
```json
// Response 200
{
  "mx": { "valid": true, "expected": "mx.manhquy.id.vn", "found": "mx.manhquy.id.vn" },
  "spf": { "valid": true },
  "dkim": { "valid": false, "expected": "...", "found": null }
}
```

---

### Webhooks

#### GET /webhooks - List Webhooks
```json
// Response 200
[
  {
    "id": "uuid",
    "name": "My Webhook",
    "url": "https://example.com/webhook",
    "events": ["email.received", "email.read"],
    "isActive": true,
    "secret": "whsec_xxx"
  }
]
```

#### POST /webhooks - Create Webhook
```json
// Request
{
  "name": "Production Webhook",
  "url": "https://your-server.com/webhook",
  "events": ["email.received"]
}

// Response 201
{
  "id": "uuid",
  "name": "Production Webhook",
  "url": "https://your-server.com/webhook",
  "events": ["email.received"],
  "secret": "whsec_32chars...",  // Save this! Used for signature verification
  "isActive": true
}
```

#### PUT /webhooks/:id - Update Webhook
```json
// Request
{
  "name": "Updated Name",
  "url": "https://new-url.com/webhook",
  "events": ["email.received", "email.deleted"],
  "isActive": true
}
```

#### DELETE /webhooks/:id - Delete Webhook
```json
// Response 200
{ "success": true }
```

#### POST /webhooks/:id/test - Test Webhook
```json
// Response 200
{ "success": true, "message": "Test webhook queued" }
```

#### GET /webhooks/:id/logs - Get Delivery Logs
```json
// Response 200
[
  {
    "id": "uuid",
    "eventType": "email.received",
    "statusCode": 200,
    "duration": 150,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### Webhook Events

| Event | Description |
|-------|-------------|
| `email.received` | New email arrived in inbox |
| `email.read` | Email marked as read |
| `email.deleted` | Email deleted |
| `email.forwarded` | Email forwarded |
| `inbox.created` | New inbox created |
| `inbox.deleted` | Inbox deleted |
| `domain.verified` | Domain verification completed |
| `test.event` | Test event from dashboard |

### Webhook Payload Format
```json
{
  "event": "email.received",
  "timestamp": "2024-01-15T10:30:00Z",
  "idempotencyKey": "uuid",
  "data": {
    "messageId": "uuid",
    "inboxId": "uuid",
    "inboxEmail": "random123@manhquy.id.vn",
    "domainName": "manhquy.id.vn",
    "from": "sender@example.com",
    "to": "random123@manhquy.id.vn",
    "subject": "Verification Code",
    "receivedAt": "2024-01-15T10:30:00Z",
    "hasAttachments": false,
    "attachmentCount": 0,
    "extractedOtp": {
      "code": "123456",
      "confidence": "high"
    },
    "preview": "Your verification code is 123456...",
    "spamScore": 0.1
  }
}
```

### Webhook Headers
```
X-Ephemera-Event: email.received
X-Ephemera-Delivery: uuid
X-Ephemera-Signature: sha256=abc123...
X-Ephemera-Timestamp: 2024-01-15T10:30:00Z
Content-Type: application/json
User-Agent: Ephemera-Webhook/1.0
```

### Verify Webhook Signature (Node.js)
```javascript
import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const [algo, hash] = signature.split('=');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expected)
  );
}

// Express middleware
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-ephemera-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(req.body);
  console.log('Event:', payload.event);
  console.log('OTP:', payload.data.extractedOtp?.code);

  res.status(200).json({ received: true });
});
```

### Verify Webhook Signature (Python)
```python
import hmac
import hashlib

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    algo, hash_value = signature.split('=')
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(hash_value, expected)

# Flask example
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Ephemera-Signature')
    if not verify_webhook_signature(request.data, signature, WEBHOOK_SECRET):
        return {'error': 'Invalid signature'}, 401

    payload = request.json
    print(f"Event: {payload['event']}")
    print(f"OTP: {payload['data'].get('extractedOtp', {}).get('code')}")

    return {'received': True}, 200
```

---

### API Keys

#### GET /api-keys - List API Keys
```json
// Response 200
[
  {
    "id": "uuid",
    "name": "Production Key",
    "prefix": "epk_live_xxx",
    "lastUsedAt": "2024-01-15T10:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api-keys - Create API Key
```json
// Request
{ "name": "My New Key" }

// Response 201
{
  "id": "uuid",
  "name": "My New Key",
  "key": "epk_live_full_key_here"  // Only shown once!
}
```

#### DELETE /api-keys/:id - Revoke API Key
```json
// Response 200
{ "success": true }
```

---

## Rate Limits

| Tier | Requests/minute | Webhooks | API Access |
|------|-----------------|----------|------------|
| FREE | 100 | 1 | Limited |
| STARTER | 500 | 5 | Full |
| ENTERPRISE | 1000 | Unlimited | Full |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

## Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid request body |
| 401 | UNAUTHORIZED | Missing or invalid API key |
| 403 | FORBIDDEN | Access denied (tier limit) |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## Testing Webhooks

Use our internal test receiver:
```bash
# 1. Create test receiver
curl -X POST https://api.manhquy.id.vn/webhook-test/create \
  -H "Authorization: Bearer YOUR_API_KEY"

# Response: { "receiverId": "xxx", "webhookUrl": "https://api.manhquy.id.vn/webhook-test/receive/xxx" }

# 2. Create webhook with test URL
curl -X POST https://api.manhquy.id.vn/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","url":"https://api.manhquy.id.vn/webhook-test/receive/xxx","events":["email.received"]}'

# 3. Trigger test
curl -X POST https://api.manhquy.id.vn/webhooks/{webhook_id}/test \
  -H "Authorization: Bearer YOUR_API_KEY"

# 4. View received payloads
curl https://api.manhquy.id.vn/webhook-test/payloads/xxx
```

---

## SDK Installation

### JavaScript/TypeScript
```bash
npm install @ephemera/sdk
```

```typescript
import { EphemeraClient } from '@ephemera/sdk';

const client = new EphemeraClient('your-api-key');

// Create inbox
const inbox = await client.createInbox();

// Wait for email with OTP
const message = await client.waitForEmail(inbox.id, {
  subject: 'Verification',
  timeout: 60000
});

// Extract code
const code = client.extractCode(message);
console.log(`Code: ${code}`);
```

### Python
```bash
pip install ephemera
```

```python
from ephemera import EphemeraClient

client = EphemeraClient('your-api-key')

# Create inbox
inbox = client.create_inbox()

# Wait for email
message = client.wait_for_email(inbox.id, subject='Verification', timeout=60)

# Get OTP
print(f"Code: {message.extracted_otp}")
```

---

*Last updated: January 2026*
*API Version: 1.0*
