---
sidebar_position: 3
---

# Messages

Retrieve and manage emails received in inboxes.

## List Messages

```http
GET /v1/inboxes/:inboxId/messages
```

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 20 | Results per page |
| cursor | string | - | Pagination cursor |

### Response

```json
{
  "data": [
    {
      "id": "msg_xyz789",
      "inboxId": "inb_abc123",
      "from": "noreply@example.com",
      "to": "random123@ephemera.email",
      "subject": "Verify your email",
      "textBody": "Your code is 123456",
      "htmlBody": "<p>Your code is <strong>123456</strong></p>",
      "receivedAt": "2026-01-23T12:05:00Z"
    }
  ],
  "nextCursor": null
}
```

## Get Message

```http
GET /v1/messages/:id
```

Returns full message details including attachments.

### Response

```json
{
  "data": {
    "id": "msg_xyz789",
    "inboxId": "inb_abc123",
    "from": "noreply@example.com",
    "to": "random123@ephemera.email",
    "subject": "Verify your email",
    "textBody": "Your verification code is 123456",
    "htmlBody": "<p>Your verification code is <strong>123456</strong></p>",
    "headers": {
      "Message-ID": "<abc@example.com>",
      "Date": "Thu, 23 Jan 2026 12:05:00 +0000"
    },
    "attachments": [
      {
        "id": "att_001",
        "filename": "document.pdf",
        "contentType": "application/pdf",
        "size": 12345
      }
    ],
    "receivedAt": "2026-01-23T12:05:00Z"
  }
}
```

## Get Attachment

```http
GET /v1/messages/:messageId/attachments/:attachmentId
```

Returns raw attachment content with appropriate Content-Type header.

## Delete Message

```http
DELETE /v1/messages/:id
```
