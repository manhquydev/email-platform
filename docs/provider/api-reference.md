# Ephemera Provider API Reference

## Base URL

```
https://api.ephemera.email
```

## Authentication

All requests require `X-Provider-Key` header:

```
X-Provider-Key: eph_provider_your_api_key_here
```

## Endpoints

### Provider Info

#### GET /v1/provider/me

Get current provider information.

**Response 200:**
```json
{
  "provider": {
    "id": "uuid",
    "name": "Provider Name",
    "contactEmail": "contact@provider.com",
    "status": "ACTIVE",
    "tier": "STARTER",
    "webhookUrl": "https://your-webhook.com",
    "createdAt": "2026-01-29T00:00:00Z"
  }
}
```

---

### Tenants

#### POST /v1/provider/tenants

Create a new tenant (customer account).

**Request Body:**
```json
{
  "externalId": "string (required) - Your internal ID",
  "customerEmail": "string (required) - Customer email",
  "customerName": "string (optional)",
  "plan": "LITE | PRO | BUSINESS (required)"
}
```

**Response 201:**
```json
{
  "tenant": {
    "id": "uuid",
    "externalId": "your-id",
    "status": "ACTIVE",
    "plan": "LITE",
    "maxMailboxes": 5,
    "maxStorageGb": 5,
    "organizationId": "uuid",
    "createdAt": "2026-01-29T00:00:00Z"
  }
}
```

#### GET /v1/provider/tenants

List all tenants.

**Query Parameters:**
- `status` - Filter by status (ACTIVE, SUSPENDED, TERMINATED)
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

#### GET /v1/provider/tenants/:id

Get tenant by ID.

#### PATCH /v1/provider/tenants/:id

Update tenant (change plan, etc).

**Request Body:**
```json
{
  "plan": "PRO",
  "customerName": "Updated Name"
}
```

#### POST /v1/provider/tenants/:id/suspend

Suspend tenant access.

#### POST /v1/provider/tenants/:id/unsuspend

Restore suspended tenant.

#### DELETE /v1/provider/tenants/:id

Terminate tenant (permanent).

---

### Domains

#### POST /v1/provider/tenants/:tenantId/domains

Add domain to tenant.

**Request Body:**
```json
{
  "domain": "example.com"
}
```

**Response 201:**
```json
{
  "domain": "example.com",
  "status": "PENDING",
  "dnsRecords": [
    {"type": "MX", "name": "@", "value": "mail.ephemera.email", "priority": 10},
    {"type": "TXT", "name": "@", "value": "v=spf1 include:ephemera.email ~all"},
    {"type": "TXT", "name": "_dmarc", "value": "v=DMARC1; p=quarantine;"},
    {"type": "CNAME", "name": "ephemera._domainkey", "value": "dkim.ephemera.email"}
  ]
}
```

#### GET /v1/provider/tenants/:tenantId/domains

List tenant domains.

#### POST /v1/provider/tenants/:tenantId/domains/:domain/verify

Verify domain DNS configuration.

**Response 200:**
```json
{
  "domain": "example.com",
  "verified": true,
  "checks": {
    "mx": true,
    "spf": true,
    "dkim": true,
    "dmarc": true
  }
}
```

#### DELETE /v1/provider/tenants/:tenantId/domains/:domain

Remove domain from tenant.

---

### Mailboxes

#### POST /v1/provider/tenants/:tenantId/mailboxes

Create mailbox.

**Request Body:**
```json
{
  "localPart": "user",
  "domain": "example.com",
  "password": "SecurePassword123!",
  "displayName": "User Name",
  "quotaMb": 1024
}
```

**Response 201:**
```json
{
  "mailbox": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "User Name",
    "quotaMb": 1024,
    "usedMb": 0,
    "createdAt": "2026-01-29T00:00:00Z"
  }
}
```

#### GET /v1/provider/tenants/:tenantId/mailboxes

List tenant mailboxes.

#### PATCH /v1/provider/tenants/:tenantId/mailboxes/:email

Update mailbox (quota, display name).

#### PATCH /v1/provider/tenants/:tenantId/mailboxes/:email/password

Change mailbox password.

**Request Body:**
```json
{
  "password": "NewSecurePassword123!"
}
```

#### DELETE /v1/provider/tenants/:tenantId/mailboxes/:email

Delete mailbox.

---

### Usage & Billing

#### GET /v1/provider/tenants/:tenantId/usage

Get tenant usage metrics.

**Response 200:**
```json
{
  "usage": {
    "tenantId": "uuid",
    "period": "2026-01",
    "summary": {
      "mailboxCount": 3,
      "storageBytes": 1073741824,
      "messageCount": 1500,
      "messagesSent": 200,
      "messagesReceived": 1300
    }
  }
}
```

#### GET /v1/provider/usage

Get aggregate usage across all tenants.

---

### Webhooks

#### POST /v1/provider/webhooks/test

Send test webhook to configured URL.

#### GET /v1/provider/webhooks/events

List recent webhook events.

**Query Parameters:**
- `status` - Filter by status (PENDING, DELIVERED, FAILED)
- `limit` - Results per page

---

## Error Responses

All errors follow format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing API key |
| FORBIDDEN | 403 | Action not allowed |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| LIMIT_EXCEEDED | 429 | Rate limit or plan limit exceeded |
| DOMAIN_NOT_VERIFIED | 400 | Domain must be verified first |

## Rate Limits

- 100 requests/minute per provider
- 1000 requests/hour per provider

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706500000
```
