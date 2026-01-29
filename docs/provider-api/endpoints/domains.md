# Domain Management

Manage custom domains for your tenants. Domains must be verified via DNS before they can be used for mailboxes.

## Add Domain
Add a domain to a tenant account.

**Endpoint:** `POST /tenants/:id/domains`

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | string | Yes | The domain name (e.g., `example.com`) |

**Example Response:**
```json
{
  "domain": {
    "id": "dom_123",
    "domainName": "example.com",
    "verified": false
  },
  "dnsRecords": [
    {
      "type": "TXT",
      "name": "_ephemera.example.com",
      "value": "ephemera-verify=...",
      "purpose": "Domain verification"
    },
    {
      "type": "MX",
      "name": "example.com",
      "value": "mail.ephemera.email",
      "priority": 10,
      "purpose": "Mail routing"
    }
  ]
}
```

## List Domains
Get all domains associated with a tenant.

**Endpoint:** `GET /tenants/:id/domains`

## Get Domain DNS
Retrieve the required DNS records for a specific domain. Useful if the user needs to check the records again.

**Endpoint:** `GET /tenants/:id/domains/:domain/dns`

## Verify Domain
Trigger a DNS check to verify domain ownership.

**Endpoint:** `POST /tenants/:id/domains/:domain/verify`

**Response:**
```json
{
  "verified": true,
  "domainName": "example.com"
}
```
*Note: DNS propagation can take time. If verification fails, retry after a few minutes.*

## Remove Domain
Remove a domain from a tenant. This will also delete all mailboxes associated with this domain.

**Endpoint:** `DELETE /tenants/:id/domains/:domain`
