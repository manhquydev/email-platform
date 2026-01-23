---
sidebar_position: 4
---

# Domains

Manage custom domains for your inboxes.

## List Domains

```http
GET /v1/domains
```

### Response

```json
{
  "data": [
    {
      "id": "dom_abc123",
      "domain": "mail.example.com",
      "verified": true,
      "createdAt": "2026-01-20T10:00:00Z"
    }
  ]
}
```

## Add Domain

```http
POST /v1/domains
```

### Request Body

```json
{
  "domain": "mail.example.com"
}
```

### Response

```json
{
  "data": {
    "id": "dom_abc123",
    "domain": "mail.example.com",
    "verified": false,
    "verificationRecord": {
      "type": "TXT",
      "name": "_ephemera.mail.example.com",
      "value": "ephemera-verify=abc123xyz"
    },
    "mxRecord": {
      "type": "MX",
      "name": "mail.example.com",
      "value": "mx.ephemera.email",
      "priority": 10
    }
  }
}
```

## Verify Domain

```http
POST /v1/domains/:id/verify
```

Checks DNS records and updates verification status.

## Delete Domain

```http
DELETE /v1/domains/:id
```

:::warning
Deleting a domain will invalidate all inboxes using that domain.
:::
