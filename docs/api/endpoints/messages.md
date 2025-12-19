# Messages API

Retrieve, search, and manage email messages received by your inboxes. The Messages API provides comprehensive access to email content, attachments, and metadata.

## Overview

The messages API allows you to:
- Retrieve email messages
- Search across all messages
- Get individual message details
- Delete messages
- Download attachments
- Access message headers

## Base URL

```
GET /messages
GET /messages/search
GET /messages/:id
DELETE /messages/:id
GET /attachments/:id/download
```

## Authentication

All endpoints require authentication:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## List All Messages

### GET /messages

Get messages across all your inboxes with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `inboxId` (optional): Filter by specific inbox
- `search` (optional): Search in message content (subject, body, from)
- `from` (optional): Filter by sender email
- `subject` (optional): Filter by subject
- `hasAttachments` (optional): Filter by attachments (`true`, `false`)
- `createdAfter` (optional): Filter by creation date (ISO 8601)
- `createdBefore` (optional): Filter by creation date (ISO 8601)
- `read` (optional): Filter by read status (`true`, `false`)
- `sort` (optional): Sort field (`createdAt`, `subject`, `from`, `size`)
- `order` (optional): Sort order (`asc`, `desc`)

**Example:**
```bash
curl -X GET "http://localhost:3001/messages?inboxId=1&hasAttachments=true&sort=createdAt&order=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "inboxId": "1",
      "inboxName": "test-inbox",
      "messageId": "20240115153000.1@example.com",
      "from": "sender@example.com",
      "fromName": "Sender Name",
      "subject": "Hello World",
      "text": "This is the plain text content...",
      "html": "<p>This is the HTML content...</p>",
      "preview": "This is the plain text content...",
      "attachments": [
        {
          "id": "1",
          "filename": "document.pdf",
          "contentType": "application/pdf",
          "sizeBytes": 1024000
        }
      ],
      "sizeBytes": 2048000,
      "createdAt": "2024-01-15T15:30:00Z",
      "readAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

## Search Messages

### GET /messages/search

Perform a full-text search across all messages.

**Query Parameters:**
- `q` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `filters` (optional): Additional filters as JSON string

**Example:**
```bash
curl -X GET "http://localhost:3001/messages/search?q=invoice&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "2",
      "inboxId": "1",
      "inboxName": "test-inbox",
      "messageId": "20240115160000.2@example.com",
      "from": "billing@company.com",
      "fromName": "Billing Department",
      "subject": "Invoice #INV-2024-001",
      "text": "Your invoice for January 2024 is attached...",
      "html": "<p>Your invoice for January 2024 is attached...</p>",
      "preview": "Your invoice for January 2024 is attached...",
      "attachments": [
        {
          "id": "2",
          "filename": "invoice-2024-01.pdf",
          "contentType": "application/pdf",
          "sizeBytes": 2048000
        }
      ],
      "sizeBytes": 3072000,
      "createdAt": "2024-01-15T16:00:00Z",
      "readAt": null,
      "searchScore": 0.95
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "searchInfo": {
    "query": "invoice",
    "results": 1,
    "duration": 45
  }
}
```

## Get Message

### GET /messages/:id

Get detailed information for a specific message.

**Example:**
```bash
curl -X GET "http://localhost:3001/messages/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "id": "1",
  "inboxId": "1",
  "inboxName": "test-inbox",
  "messageId": "20240115153000.1@example.com",
  "from": "sender@example.com",
  "fromName": "Sender Name",
  "to": ["test-inbox@example.com"],
  "cc": [],
  "bcc": [],
  "subject": "Hello World",
  "text": "This is the plain text content...",
  "html": "<p>This is the HTML content...</p>",
  "headers": {
    "messageId": "<20240115153000.1@example.com>",
    "date": "Tue, 15 Jan 2024 15:30:00 +0000",
    "from": "sender@example.com",
    "to": "test-inbox@example.com",
    "subject": "Hello World",
    "mimeVersion": "1.0",
    "contentType": "multipart/mixed"
  },
  "attachments": [
    {
      "id": "1",
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "sizeBytes": 1024000,
      "downloadUrl": "/attachments/1/download",
      "checksum": "sha256:abc123..."
    }
  ],
  "sizeBytes": 2048000,
  "createdAt": "2024-01-15T15:30:00Z",
  "readAt": null
}
```

## Delete Message

### DELETE /messages/:id

Delete a specific message.

**Example:**
```bash
curl -X DELETE "http://localhost:3001/messages/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** 204 No Content

## Download Attachment

### GET /attachments/:id/download

Download an attachment file.

**Example:**
```bash
curl -X GET "http://localhost:3001/attachments/1/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o document.pdf
```

**Response:** File attachment with appropriate Content-Type

## Mark Message as Read

### PATCH /messages/:id/read

Mark a message as read (future enhancement).

**Request Body:**
```json
{
  "read": true
}
```

## Batch Operations (Future Enhancement)

### DELETE /messages

Delete multiple messages at once.

**Request Body:**
```json
{
  "messageIds": ["1", "2", "3"]
}
```

## Message Statuses

- `unread`: Message not yet read
- `read`: Message has been read

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid search query"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Message not found"
}
```

### 422 Unprocessable Entity
```json
{
  "error": "Invalid date format"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded"
}
```

## Rate Limits

- List messages: 1000 per hour
- Search messages: 200 per hour
- Get message details: 1000 per hour
- Download attachments: 1000 per hour

## Supported File Types

TempMail Pro supports all file types but provides special handling for:
- **Images**: JPEG, PNG, GIF, WebP (inline preview)
- **Documents**: PDF, DOC, DOCX (download only)
- **Text Files**: TXT, MD, JSON (preview in UI)
- **Archives**: ZIP, RAR, TAR (download only)

## Content Security

- Files are scanned for malware (future enhancement)
- Attachment size limits configurable via `MAX_ATTACHMENT_BYTES`
- File type filtering via `ALLOWED_ATTACHMENT_TYPES`

## Examples

### JavaScript (Fetch API)

```javascript
// Get all messages
async function getMessages(filters = {}) {
  const token = localStorage.getItem('tempmail_token');
  const params = new URLSearchParams(filters);

  const response = await fetch(`/messages?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  return response.json();
}

// Search messages
async function searchMessages(query, filters = {}) {
  const token = localStorage.getItem('tempmail_token');
  const params = new URLSearchParams({
    q: query,
    ...filters
  });

  const response = await fetch(`/messages/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

// Get message details
async function getMessage(messageId) {
  const token = localStorage.getItem('tempmail_token');

  const response = await fetch(`/messages/${messageId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch message');
  }

  return response.json();
}

// Download attachment
async function downloadAttachment(attachmentId) {
  const token = localStorage.getItem('tempmail_token');

  const response = await fetch(`/attachments/${attachmentId}/download`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to download attachment');
  }

  // Create blob and download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachmentId; // Use actual filename from API response
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
```

### Python (Requests)

```python
import requests

class MessageManager:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token

    def get_messages(self, page=1, limit=20, **filters):
        """Get messages with filtering"""
        params = {
            'page': page,
            'limit': limit,
            **filters
        }

        response = requests.get(
            f"{self.base_url}/messages",
            params=params,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def search_messages(self, query, page=1, limit=20, **filters):
        """Search messages"""
        params = {
            'q': query,
            'page': page,
            'limit': limit,
            **filters
        }

        response = requests.get(
            f"{self.base_url}/messages/search",
            params=params,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def get_message(self, message_id):
        """Get message details"""
        response = requests.get(
            f"{self.base_url}/messages/{message_id}",
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def download_attachment(self, attachment_id, filename=None):
        """Download attachment"""
        response = requests.get(
            f"{self.base_url}/attachments/{attachment_id}/download",
            headers={'Authorization': f'Bearer {self.token}'},
            stream=True
        )

        response.raise_for_status()

        if filename is None:
            filename = attachment_id

        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return filename
```

## Webhook Integration (Future Enhancement)

Receive real-time notifications when new messages arrive:

```json
{
  "event": "message.created",
  "data": {
    "id": "1",
    "inboxId": "1",
    "subject": "New Message",
    "from": "sender@example.com",
    "sizeBytes": 2048,
    "hasAttachments": false,
    "createdAt": "2024-01-15T15:30:00Z"
  }
}
```

## Best Practices

1. **Use search efficiently** - Leverage full-text search for quick finding
2. **Implement pagination** - Always use pagination for large datasets
3. **Cache message lists** - Cache frequently accessed message lists
4. **Handle attachments securely** - Sanitize attachment filenames
5. **Monitor message volume** - Set up alerts for high message volumes

## Next Steps

Now that you understand message handling:

- [Explore inbox management](inboxes.md)
- [Learn about domain management](domains.md)
- [Set up email forwarding](../../guides/email-forwarding.md)
- [Try our SDK tutorials](../../tutorials/)