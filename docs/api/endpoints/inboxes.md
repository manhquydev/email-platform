# Inboxes API

Create and manage temporary email inboxes. Inboxes are the core functionality of TempMail Pro, allowing you to receive emails at generated addresses.

## Overview

The inboxes API allows you to:
- Create new inboxes
- List existing inboxes
- Get inbox details
- Delete inboxes
- Search and filter inboxes

## Base URL

```
GET /inboxes
POST /inboxes
GET /inboxes/:id
DELETE /inboxes/:id
GET /inboxes/:id/messages
GET /public/inboxes
POST /public/inboxes
```

## Authentication

Most endpoints require authentication:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

Public endpoints are noted separately.

## List Inboxes

### GET /inboxes

Get a paginated list of your inboxes.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `domain` (optional): Filter by domain
- `search` (optional): Search by inbox name or address
- `status` (optional): Filter by status (`active`, `deleted`)
- `createdAfter` (optional): Filter by creation date (ISO 8601)
- `createdBefore` (optional): Filter by creation date (ISO 8601)

**Example:**
```bash
curl -X GET "http://localhost:3001/inboxes?domain=example.com&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "name": "test-inbox",
      "domain": "example.com",
      "email": "test-inbox@example.com",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "messageCount": 5,
      "lastMessageAt": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## Create Inbox

### POST /inboxes

Create a new inbox.

**Request Body:**
```json
{
  "domain": "example.com",
  "name": "test-inbox",
  "description": "Testing inbox"
}
```

**Parameters:**
- `domain` (required): Domain name
- `name` (optional): Inbox name (defaults to random string)
- `description` (optional): Human-readable description

**Example:**
```bash
curl -X POST "http://localhost:3001/inboxes" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "name": "test-inbox",
    "description": "Testing inbox"
  }'
```

**Response:**
```json
{
  "id": "2",
  "name": "test-inbox",
  "domain": "example.com",
  "email": "test-inbox@example.com",
  "status": "active",
  "description": "Testing inbox",
  "createdAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T14:30:00Z"
}
```

## Get Inbox

### GET /inboxes/:id

Get details for a specific inbox.

**Example:**
```bash
curl -X GET "http://localhost:3001/inboxes/2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "id": "2",
  "name": "test-inbox",
  "domain": "example.com",
  "email": "test-inbox@example.com",
  "status": "active",
  "description": "Testing inbox",
  "createdAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T14:30:00Z",
  "stats": {
    "messageCount": 5,
    "attachmentCount": 2,
    "sizeBytes": 2048000,
    "lastMessageAt": "2024-01-15T15:30:00Z"
  }
}
```

## Delete Inbox

### DELETE /inboxes/:id

Delete an inbox and all associated messages.

**Example:**
```bash
curl -X DELETE "http://localhost:3001/inboxes/2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** 204 No Content

## Get Inbox Messages

### GET /inboxes/:id/messages

Get messages for a specific inbox.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search in message content
- `from` (optional): Filter by sender email
- `subject` (optional): Filter by subject
- `hasAttachments` (optional): Filter by attachments (`true`, `false`)
- `createdAfter` (optional): Filter by creation date
- `createdBefore` (optional): Filter by creation date
- `sort` (optional): Sort field (`createdAt`, `subject`, `from`)
- `order` (optional): Sort order (`asc`, `desc`)

**Example:**
```bash
curl -X GET "http://localhost:3001/inboxes/2/messages?hasAttachments=true&sort=createdAt&order=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "inboxId": "2",
      "messageId": "20240115153000.1@example.com",
      "from": "sender@example.com",
      "fromName": "Sender Name",
      "subject": "Hello World",
      "text": "This is the plain text content...",
      "html": "<p>This is the HTML content...</p>",
      "attachments": [
        {
          "id": "1",
          "filename": "document.pdf",
          "contentType": "application/pdf",
          "sizeBytes": 1024000,
          "downloadUrl": "/attachments/1/download"
        }
      ],
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

## Create Public Inbox (No Auth)

### POST /public/inboxes

Create an inbox without authentication (requires CAPTCHA).

**Request Body:**
```json
{
  "domain": "example.com",
  "name": "public-inbox",
  "captcha": "user-captcha-response"
}
```

**Parameters:**
- `domain` (required): Available domain
- `name` (optional): Inbox name
- `captcha` (required): CAPTCHA response token

**Example:**
```bash
curl -X POST "http://localhost:3001/public/inboxes" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "name": "public-inbox",
    "captcha": "CAPTCHA_RESPONSE_TOKEN"
  }'
```

**Response:**
```json
{
  "id": "3",
  "name": "public-inbox",
  "domain": "example.com",
  "email": "public-inbox@example.com",
  "status": "active",
  "createdAt": "2024-01-15T16:30:00Z",
  "expiresAt": "2024-01-16T16:30:00Z"
}
```

## Inbox Statuses

- `active`: Inbox receiving emails
- `deleted`: Inbox deleted (soft delete)

## Error Responses

### 400 Bad Request
```json
{
  "error": "Domain not found"
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
  "error": "Domain not verified"
}
```

### 404 Not Found
```json
{
  "error": "Inbox not found"
}
```

### 422 Unprocessable Entity
```json
{
  "error": "Invalid inbox name"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded"
}
```

## Rate Limits

- Create inboxes: 100 per hour per user
- List inboxes: 1000 per hour
- Create public inboxes: 10 per hour per IP

## Examples

### JavaScript (Fetch API)

```javascript
// Create inbox
async function createInbox(domain, name = null, description = '') {
  const token = localStorage.getItem('tempmail_token');

  const response = await fetch('/inboxes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      domain,
      name,
      description
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create inbox');
  }

  return response.json();
}

// List inboxes
async function getInboxes(filters = {}) {
  const token = localStorage.getItem('tempmail_token');
  const params = new URLSearchParams(filters);

  const response = await fetch(`/inboxes?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch inboxes');
  }

  return response.json();
}

// Get inbox messages
async function getInboxMessages(inboxId, filters = {}) {
  const token = localStorage.getItem('tempmail_token');
  const params = new URLSearchParams(filters);

  const response = await fetch(`/inboxes/${inboxId}/messages?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  return response.json();
}

// Delete inbox
async function deleteInbox(inboxId) {
  const token = localStorage.getItem('tempmail_token');

  const response = await fetch(`/inboxes/${inboxId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete inbox');
  }
}
```

### Python (Requests)

```python
import requests

class InboxManager:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token

    def create_inbox(self, domain, name=None, description=''):
        """Create a new inbox"""
        data = {
            'domain': domain,
            'description': description
        }

        if name:
            data['name'] = name

        response = requests.post(
            f"{self.base_url}/inboxes",
            json=data,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def list_inboxes(self, page=1, limit=20, **filters):
        """List inboxes with filtering"""
        params = {
            'page': page,
            'limit': limit,
            **filters
        }

        response = requests.get(
            f"{self.base_url}/inboxes",
            params=params,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def get_inbox(self, inbox_id):
        """Get inbox details"""
        response = requests.get(
            f"{self.base_url}/inboxes/{inbox_id}",
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def get_messages(self, inbox_id, page=1, limit=20, **filters):
        """Get messages from an inbox"""
        params = {
            'page': page,
            'limit': limit,
            **filters
        }

        response = requests.get(
            f"{self.base_url}/inboxes/{inbox_id}/messages",
            params=params,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def delete_inbox(self, inbox_id):
        """Delete an inbox"""
        response = requests.delete(
            f"{self.base_url}/inboxes/{inbox_id}",
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
```

## Webhook Integration (Future Enhancement)

TempMail Pro will support webhooks for real-time notifications:

```json
{
  "url": "https://your-webhook.com/listen",
  "events": ["message.created", "inbox.deleted"],
  "secret": "your-webhook-secret"
}
```

## Best Practices

1. **Use descriptive names** for better organization
2. **Delete unused inboxes** to conserve resources
3. **Implement pagination** for large message lists
4. **Cache inbox lists** if frequently accessed
5. **Handle rate limits** gracefully with exponential backoff

## Next Steps

Now that you understand inbox management:

- [Learn about message handling](messages.md)
- [Explore domain management](domains.md)
- [Set up email forwarding](../../guides/email-forwarding.md)
- [Try our SDK tutorials](../../tutorials/)