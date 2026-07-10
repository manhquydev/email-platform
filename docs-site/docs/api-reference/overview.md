---
sidebar_position: 1
---

# API Overview

The Ephemera API is a RESTful API for managing temporary email inboxes.

## Base URL

```
https://api.manhquy.id.vn/v1
```

## Authentication

All requests require a Bearer token:

```bash
Authorization: Bearer YOUR_API_KEY
```

## Response Format

All responses are JSON:

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

## Error Responses

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid inbox ID format",
    "status": 400
  }
}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Malformed request |
| 401 | UNAUTHORIZED | Invalid or missing API key |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

## Pagination

List endpoints support cursor-based pagination:

```bash
GET /v1/inboxes?limit=20&cursor=abc123
```

Response includes `nextCursor` for fetching more results:

```json
{
  "data": [...],
  "nextCursor": "xyz789",
  "meta": { "total": 150 }
}
```

## Rate Limits

Rate limit info is included in response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706123456
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /inboxes | Create inbox |
| GET | /inboxes | List inboxes |
| GET | /inboxes/:id | Get inbox |
| DELETE | /inboxes/:id | Delete inbox |
| GET | /inboxes/:id/messages | List messages |
| GET | /messages/:id | Get message |
| GET | /domains | List domains |
| POST | /webhooks | Create webhook |
