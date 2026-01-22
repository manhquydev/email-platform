# Webhook Integration Guide

> **Vibe Coding Ready** - Copy vào AI assistant để tích hợp webhook nhanh chóng.

## Overview

Webhooks cho phép nhận thông báo realtime khi có email mới thay vì polling API.

## Quick Setup

### 1. Tạo Webhook
```bash
curl -X POST https://api.manhquy.click/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Webhook",
    "url": "https://your-server.com/webhook",
    "events": ["email.received"]
  }'
```

Response chứa `secret` - **lưu lại để verify signature!**

### 2. Nhận Webhook

Khi có email mới, server của bạn nhận POST request:

```json
{
  "event": "email.received",
  "timestamp": "2024-01-15T10:30:00Z",
  "idempotencyKey": "uuid",
  "data": {
    "messageId": "msg_xxx",
    "inboxEmail": "random@manhquy.click",
    "from": "sender@example.com",
    "subject": "Your OTP Code",
    "extractedOtp": {
      "code": "123456",
      "confidence": "high"
    },
    "preview": "Your verification code is..."
  }
}
```

### 3. Verify Signature

**QUAN TRỌNG**: Luôn verify signature để đảm bảo request từ Ephemera.

---

## Complete Examples

### Express.js (Node.js)
```javascript
import express from 'express';
import crypto from 'crypto';

const app = express();
const WEBHOOK_SECRET = 'your_webhook_secret';

// IMPORTANT: Use raw body for signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // 1. Get signature from header
  const signature = req.headers['x-ephemera-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  // 2. Verify signature
  const [algo, hash] = signature.split('=');
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expected)
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 3. Parse and process payload
  const payload = JSON.parse(req.body);

  switch (payload.event) {
    case 'email.received':
      console.log('New email from:', payload.data.from);
      console.log('Subject:', payload.data.subject);

      // Extract OTP if available
      if (payload.data.extractedOtp) {
        console.log('OTP Code:', payload.data.extractedOtp.code);
        // TODO: Use OTP code in your application
      }
      break;

    case 'email.read':
      console.log('Email read:', payload.data.messageId);
      break;

    default:
      console.log('Unknown event:', payload.event);
  }

  // 4. Return 200 to acknowledge receipt
  res.status(200).json({ received: true });
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
```

### FastAPI (Python)
```python
from fastapi import FastAPI, Request, HTTPException
import hmac
import hashlib
import json

app = FastAPI()
WEBHOOK_SECRET = "your_webhook_secret"

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    if not signature or '=' not in signature:
        return False

    algo, hash_value = signature.split('=', 1)
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(hash_value, expected)

@app.post("/webhook")
async def webhook(request: Request):
    # 1. Get raw body and signature
    body = await request.body()
    signature = request.headers.get("x-ephemera-signature")

    # 2. Verify signature
    if not verify_signature(body, signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # 3. Parse payload
    payload = json.loads(body)
    event = payload["event"]
    data = payload["data"]

    # 4. Handle events
    if event == "email.received":
        print(f"New email from: {data['from']}")
        print(f"Subject: {data['subject']}")

        if otp := data.get("extractedOtp"):
            print(f"OTP Code: {otp['code']}")
            # TODO: Use OTP in your automation

    elif event == "email.read":
        print(f"Email read: {data['messageId']}")

    return {"received": True}
```

### Flask (Python)
```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = "your_webhook_secret"

def verify_signature(payload, signature, secret):
    if not signature:
        return False
    algo, hash_value = signature.split('=')
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(hash_value, expected)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Ephemera-Signature')

    if not verify_signature(request.data, signature, WEBHOOK_SECRET):
        return jsonify({'error': 'Invalid signature'}), 401

    payload = request.json

    if payload['event'] == 'email.received':
        data = payload['data']
        print(f"Email from: {data['from']}")

        if data.get('extractedOtp'):
            otp = data['extractedOtp']['code']
            print(f"OTP: {otp}")

    return jsonify({'received': True})

if __name__ == '__main__':
    app.run(port=3000)
```

### Go
```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "io"
    "log"
    "net/http"
    "strings"
)

const webhookSecret = "your_webhook_secret"

type WebhookPayload struct {
    Event     string `json:"event"`
    Timestamp string `json:"timestamp"`
    Data      struct {
        MessageId    string `json:"messageId"`
        InboxEmail   string `json:"inboxEmail"`
        From         string `json:"from"`
        Subject      string `json:"subject"`
        ExtractedOtp *struct {
            Code       string `json:"code"`
            Confidence string `json:"confidence"`
        } `json:"extractedOtp"`
    } `json:"data"`
}

func verifySignature(payload []byte, signature, secret string) bool {
    parts := strings.SplitN(signature, "=", 2)
    if len(parts) != 2 {
        return false
    }

    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := hex.EncodeToString(mac.Sum(nil))

    return hmac.Equal([]byte(parts[1]), []byte(expected))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)
    signature := r.Header.Get("X-Ephemera-Signature")

    if !verifySignature(body, signature, webhookSecret) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    var payload WebhookPayload
    json.Unmarshal(body, &payload)

    switch payload.Event {
    case "email.received":
        log.Printf("Email from: %s", payload.Data.From)
        if payload.Data.ExtractedOtp != nil {
            log.Printf("OTP: %s", payload.Data.ExtractedOtp.Code)
        }
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte(`{"received":true}`))
}

func main() {
    http.HandleFunc("/webhook", webhookHandler)
    log.Println("Webhook server running on :3000")
    http.ListenAndServe(":3000", nil)
}
```

---

## Events Reference

| Event | Trigger | Data Fields |
|-------|---------|-------------|
| `email.received` | Email đến inbox | messageId, inboxEmail, from, subject, extractedOtp, preview |
| `email.read` | Email được đánh dấu đã đọc | messageId, inboxId |
| `email.deleted` | Email bị xóa | messageId, inboxId |
| `email.forwarded` | Email được forward | messageId, forwardedTo |
| `inbox.created` | Inbox mới được tạo | inboxId, email |
| `inbox.deleted` | Inbox bị xóa | inboxId |
| `test.event` | Test từ dashboard | message, testId |

---

## Headers

Mỗi webhook request có các headers:

```
X-Ephemera-Event: email.received
X-Ephemera-Delivery: uuid (idempotency key)
X-Ephemera-Signature: sha256=abc123...
X-Ephemera-Timestamp: 2024-01-15T10:30:00Z
Content-Type: application/json
User-Agent: Ephemera-Webhook/1.0
```

---

## Retry Policy

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 second |
| 3 | 2 seconds |
| 4 | 4 seconds |
| 5 | 8 seconds |
| 6 | 16 seconds |

Sau 5 lần thất bại, webhook được đánh dấu failed. Có thể retry thủ công từ dashboard.

---

## Testing

### Sử dụng Internal Test Receiver

```bash
# Tạo test receiver
curl -X POST https://api.manhquy.click/webhook-test/create \
  -H "Authorization: Bearer YOUR_API_KEY"

# Response
{
  "receiverId": "abc123",
  "webhookUrl": "https://api.manhquy.click/webhook-test/receive/abc123",
  "viewUrl": "https://api.manhquy.click/webhook-test/payloads/abc123"
}

# Tạo webhook với URL test
curl -X POST https://api.manhquy.click/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"name":"Test","url":"https://api.manhquy.click/webhook-test/receive/abc123","events":["email.received","test.event"]}'

# Trigger test event
curl -X POST https://api.manhquy.click/webhooks/{id}/test \
  -H "Authorization: Bearer YOUR_API_KEY"

# Xem payloads đã nhận
curl https://api.manhquy.click/webhook-test/payloads/abc123
```

### Sử dụng ngrok (local development)

```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Terminal 2: Tạo webhook với ngrok URL
curl -X POST https://api.manhquy.click/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"name":"Local Dev","url":"https://abc123.ngrok.io/webhook","events":["email.received"]}'
```

---

## Best Practices

1. **Luôn verify signature** - Không bao giờ skip bước này
2. **Return 200 quickly** - Process async nếu cần
3. **Handle idempotency** - Dùng `idempotencyKey` để tránh duplicate
4. **Log everything** - Lưu payload để debug
5. **Set timeout** - Webhook timeout sau 30 giây

---

## Troubleshooting

### Webhook không nhận được
- Kiểm tra URL có public accessible không
- Kiểm tra firewall/security group
- Xem logs tại `/webhooks/:id/logs`

### Signature không valid
- Đảm bảo dùng raw body (không parse JSON trước)
- Kiểm tra secret key đúng
- So sánh với expected signature trong logs

### Timeout
- Webhook phải response trong 30 giây
- Move heavy processing sang background job

---

*Copy toàn bộ file này vào AI assistant để generate code tích hợp webhook cho project của bạn.*
