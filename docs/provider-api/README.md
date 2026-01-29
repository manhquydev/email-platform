# Provider API Documentation

The Ephemera Provider API allows hosting providers, registrars, and agencies to programmatically manage email services for their customers. This API is designed to be integrated into billing systems like WHMCS, Blesta, or custom control panels.

## Base URL
All API requests should be made to:
```
https://api.ephemera.email/v1/provider
```

## Authentication
Authentication is performed using a Provider API Key passed in the `X-Provider-Key` header.
See [Authentication](./authentication.md) for details.

## Rate Limits
- **100 requests per minute** per API key
- **1,000 requests per hour** per API key
- Rate limit headers are included in all responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Resources
- [Authentication](./authentication.md)
- [Tenants](./endpoints/tenants.md) - Manage customer accounts
- [Domains](./endpoints/domains.md) - Manage custom domains
- [Mailboxes](./endpoints/mailboxes.md) - Manage email accounts
- [SSO](./endpoints/sso.md) - Single Sign-On for user access
- [Webhooks](./webhooks.md) - Real-time event notifications

## Integration Guides
- [WHMCS Module](./whmcs-module.md)
- [Troubleshooting](./troubleshooting.md)

## Quick Start

### 1. Create a Tenant
Create a container for your customer:
```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants \
  -H "X-Provider-Key: ep_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "cust_123",
    "customerEmail": "customer@example.com",
    "plan": "PRO"
  }'
```

### 2. Add a Domain
Add the customer's domain:
```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/domains \
  -H "X-Provider-Key: ep_live_..." \
  -d '{ "domain": "customer-domain.com" }'
```

### 3. Verify Domain
Get DNS records for verification:
```bash
curl https://api.ephemera.email/v1/provider/tenants/{tenant_id}/domains/customer-domain.com/dns \
  -H "X-Provider-Key: ep_live_..."
```

### 4. Create Mailbox
Once verified, create an email account:
```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/mailboxes \
  -H "X-Provider-Key: ep_live_..." \
  -d '{
    "localPart": "info",
    "domain": "customer-domain.com",
    "password": "secure_password_here"
  }'
```
