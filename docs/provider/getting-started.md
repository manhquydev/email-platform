# Getting Started with Ephemera Provider API

## Overview

Ephemera Provider API enables hosting providers to offer email hosting services to their customers through cPanel, WHMCS, DirectAdmin, and Plesk integrations.

## 1. Register as Provider

1. Go to https://ephemera.email/providers
2. Fill registration form with:
   - Company name
   - Contact email
   - Billing information
3. Receive API key via email

## 2. Test Connection

```bash
curl -X GET https://api.ephemera.email/v1/provider/me \
  -H "X-Provider-Key: eph_provider_your_key_here"
```

**Response:**
```json
{
  "provider": {
    "id": "uuid",
    "name": "Your Company",
    "status": "ACTIVE",
    "tier": "STARTER"
  }
}
```

## 3. Create Your First Tenant

Each customer/service in your system maps to a tenant:

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants \
  -H "X-Provider-Key: eph_provider_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "customer-123",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "plan": "LITE"
  }'
```

**Plans:**
| Plan | Mailboxes | Storage/mailbox | Features |
|------|-----------|-----------------|----------|
| LITE | 5 | 1GB | IMAP/POP3, Webmail |
| PRO | Unlimited | 10GB | + CalDAV, Forwarding |
| BUSINESS | Unlimited | 50GB | + LDAP, Compliance, API |

## 4. Add Domain

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/domains \
  -H "X-Provider-Key: eph_provider_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"domain": "customerdomain.com"}'
```

**Response includes DNS records to configure:**
```json
{
  "domain": "customerdomain.com",
  "status": "PENDING",
  "dnsRecords": [
    {"type": "MX", "name": "@", "value": "mail.ephemera.email", "priority": 10},
    {"type": "TXT", "name": "@", "value": "v=spf1 include:ephemera.email ~all"},
    {"type": "TXT", "name": "_dmarc", "value": "v=DMARC1; p=quarantine;"},
    {"type": "CNAME", "name": "ephemera._domainkey", "value": "dkim.ephemera.email"}
  ]
}
```

## 5. Verify Domain

After DNS records are configured:

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/domains/customerdomain.com/verify \
  -H "X-Provider-Key: eph_provider_your_key_here"
```

## 6. Create Mailbox

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/mailboxes \
  -H "X-Provider-Key: eph_provider_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "localPart": "info",
    "domain": "customerdomain.com",
    "password": "SecurePassword123!",
    "displayName": "Info Mailbox"
  }'
```

## 7. Access Email

Mailbox credentials for end users:
- **IMAP:** imap.ephemera.email:993 (SSL)
- **SMTP:** smtp.ephemera.email:587 (STARTTLS)
- **Webmail:** https://mail.ephemera.email

## Next Steps

- [API Reference](api-reference.md) - Complete API documentation
- [cPanel Plugin](cpanel-plugin.md) - Install cPanel/WHM integration
- [WHMCS Module](whmcs-module.md) - Automated provisioning with WHMCS
- [Webhooks](webhooks.md) - Real-time event notifications
