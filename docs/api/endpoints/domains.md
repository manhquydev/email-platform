# Domains API

Manage your custom domains for email receiving. Domains must be properly configured with DNS records to receive emails.

## Overview

The domains API allows you to:
- Add new domains
- List existing domains
- Verify domain ownership
- View domain statistics
- Delete domains

## Base URL

```
GET /domains
POST /domains
GET /domains/:id
PUT /domains/:id
DELETE /domains/:id
POST /domains/:id/verify
```

## Authentication

All endpoints require authentication:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## List Domains

### GET /domains

Get a paginated list of all domains.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by domain name
- `status` (optional): Filter by status (`active`, `pending`, `verified`)

**Example:**
```bash
curl -X GET "http://localhost:3001/domains?page=1&limit=10&status=verified" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "domain": "example.com",
      "status": "verified",
      "verificationToken": "abc123def456",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T12:00:00Z",
      "inboxCount": 5,
      "messageCount": 142
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

## Create Domain

### POST /domains

Add a new domain to TempMail Pro.

**Request Body:**
```json
{
  "domain": "example.com",
  "description": "My primary domain",
  "autoCreateInboxes": false
}
```

**Parameters:**
- `domain` (required): Domain name (e.g., "example.com")
- `description` (optional): Human-readable description
- `autoCreateInboxes` (optional): Allow automatic inbox creation (default: false)

**Example:**
```bash
curl -X POST "http://localhost:3001/domains" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "description": "My primary domain",
    "autoCreateInboxes": false
  }'
```

**Response:**
```json
{
  "id": "2",
  "domain": "example.com",
  "status": "pending",
  "verificationToken": "xyz789uvw456",
  "description": "My primary domain",
  "autoCreateInboxes": false,
  "createdAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T14:30:00Z"
}
```

## Get Domain

### GET /domains/:id

Get details for a specific domain.

**Example:**
```bash
curl -X GET "http://localhost:3001/domains/2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "id": "2",
  "domain": "example.com",
  "status": "pending",
  "verificationToken": "xyz789uvw456",
  "description": "My primary domain",
  "autoCreateInboxes": false,
  "dnsRecords": {
    "spf": "v=spf1 mx include:_spf.google.com ~all",
    "dkim": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
    "dmarc": "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com"
  },
  "createdAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T14:30:00Z",
  "stats": {
    "inboxCount": 0,
    "messageCount": 0,
    "lastMessageAt": null
  }
}
```

## Update Domain

### PUT /domains/:id

Update domain settings.

**Request Body:**
```json
{
  "description": "Updated description",
  "autoCreateInboxes": true
}
```

**Example:**
```bash
curl -X PUT "http://localhost:3001/domains/2" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "autoCreateInboxes": true
  }'
```

## Delete Domain

### DELETE /domains/:id

Delete a domain and all associated data.

**Example:**
```bash
curl -X DELETE "http://localhost:3001/domains/2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** 204 No Content

## Verify Domain

### POST /domains/:id/verify

Verify domain ownership using DNS records.

**Request Body:**
```json
{
  "spfRecord": "v=spf1 mx include:_spf.google.com ~all",
  "dkimRecord": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
  "dmarcRecord": "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3001/domains/2/verify" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spfRecord": "v=spf1 mx include:_spf.google.com ~all",
    "dkimRecord": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
    "dmarcRecord": "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com"
  }'
```

**Response:**
```json
{
  "id": "2",
  "domain": "example.com",
  "status": "verified",
  "verificationToken": "xyz789uvw456",
  "dnsRecords": {
    "spf": {
      "record": "v=spf1 mx include:_spf.google.com ~all",
      "status": "valid",
      "checkedAt": "2024-01-15T15:30:00Z"
    },
    "dkim": {
      "record": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
      "status": "valid",
      "checkedAt": "2024-01-15T15:30:00Z"
    },
    "dmarc": {
      "record": "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com",
      "status": "valid",
      "checkedAt": "2024-01-15T15:30:00Z"
    }
  },
  "verifiedAt": "2024-01-15T15:30:00Z"
}
```

## Domain Statuses

- `pending`: Domain added but not verified
- `verified`: DNS records configured correctly
- `failed`: DNS verification failed
- `suspended`: Domain suspended due to abuse

## DNS Configuration

### Required Records

To receive emails, you need to configure these DNS records:

#### SPF Record
```txt
v=spf1 mx include:_spf.google.com ~all
```

#### DKIM Record
Generate DKIM keys through the TempMail Pro admin panel and add:
```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
```

#### DMARC Record
```txt
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com
```

### Optional Records

#### MTA-STS Record
```
version: STSv1
mode: enforce
max_age: 86400
```

#### TLS-RPT Record
```
v=TLSRPTv1; rua=mailto:tls-reports@example.com
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Domain already exists"
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
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Domain not found"
}
```

### 422 Unprocessable Entity
```json
{
  "error": "Invalid domain format"
}
```

## Rate Limits

- Create domains: 10 per hour
- Verify domains: 60 per hour
- List domains: 1000 per hour

## Examples

### JavaScript (Fetch API)

```javascript
// List domains
async function getDomains(page = 1, limit = 20) {
  const token = localStorage.getItem('tempmail_token');

  const response = await fetch(`/domains?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch domains');
  }

  return response.json();
}

// Create domain
async function createDomain(domain, description = '') {
  const token = localStorage.getItem('tempmail_token');

  const response = await fetch('/domains', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      domain,
      description,
      autoCreateInboxes: false
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create domain');
  }

  return response.json();
}

// Verify domain
async function verifyDomain(domainId, dnsRecords) {
  const token = localStorage.getItem('tempmail_token');

  const response = await fetch(`/domains/${domainId}/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dnsRecords)
  });

  if (!response.ok) {
    throw new Error('Failed to verify domain');
  }

  return response.json();
}
```

### Python (Requests)

```python
import requests

class DomainManager:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token

    def list_domains(self, page=1, limit=20, search=None, status=None):
        """List domains with filtering"""
        params = {
            'page': page,
            'limit': limit
        }

        if search:
            params['search'] = search
        if status:
            params['status'] = status

        response = requests.get(
            f"{self.base_url}/domains",
            params=params,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def create_domain(self, domain, description='', auto_create_inboxes=False):
        """Create a new domain"""
        data = {
            'domain': domain,
            'description': description,
            'autoCreateInboxes': auto_create_inboxes
        }

        response = requests.post(
            f"{self.base_url}/domains",
            json=data,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()

    def verify_domain(self, domain_id, spf_record, dkim_record, dmarc_record):
        """Verify domain with DNS records"""
        data = {
            'spfRecord': spf_record,
            'dkimRecord': dkim_record,
            'dmarcRecord': dmarc_record
        }

        response = requests.post(
            f"{self.base_url}/domains/{domain_id}/verify",
            json=data,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        response.raise_for_status()
        return response.json()
```

## Next Steps

Now that you understand domain management:

- [Create your first inbox](inboxes.md)
- [Learn about message handling](messages.md)
- [Set up email forwarding](../../guides/email-forwarding.md)
- [Explore advanced features](../../guides/custom-domains.md)