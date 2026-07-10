---
sidebar_position: 2
---

# Inboxes

Manage temporary email inboxes.

## Create Inbox

```http
POST /v1/inboxes
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| domain | string | No | Custom domain (default: ephemera.email) |
| expiresIn | number | No | TTL in seconds (default: 3600) |

### Example

```bash
curl -X POST https://api.manhquy.id.vn/v1/inboxes \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 7200}'
```

### Response

```json
{
  "data": {
    "id": "inb_abc123",
    "address": "random123@ephemera.email",
    "domain": "ephemera.email",
    "createdAt": "2026-01-23T12:00:00Z",
    "expiresAt": "2026-01-23T14:00:00Z"
  }
}
```

## List Inboxes

```http
GET /v1/inboxes
```

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 20 | Results per page (max 100) |
| cursor | string | - | Pagination cursor |

## Get Inbox

```http
GET /v1/inboxes/:id
```

## Delete Inbox

```http
DELETE /v1/inboxes/:id
```

Deletes inbox and all associated messages.

### Response

```json
{
  "data": {
    "deleted": true
  }
}
```
