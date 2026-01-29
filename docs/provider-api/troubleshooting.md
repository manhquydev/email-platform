# Troubleshooting

Common errors and solutions when working with the Provider API.

## HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| `200` | OK | Success |
| `201` | Created | Resource successfully created |
| `400` | Bad Request | Invalid JSON, missing fields, or validation error |
| `401` | Unauthorized | Missing or invalid `X-Provider-Key` |
| `403` | Forbidden | Account suspended or plan limit reached |
| `404` | Not Found | Tenant, domain, or mailbox does not exist |
| `429` | Too Many Requests | Rate limit exceeded (100/min) |
| `500` | Internal Server Error | Something went wrong on our end |

## Common Error Messages

### `Invalid API key`
**Cause:** The key in `X-Provider-Key` is incorrect or has been regenerated.
**Fix:** Check your key in the Provider Portal and update your application.

### `Tenant limit reached`
**Cause:** Your provider account has reached the maximum number of tenants for your tier.
**Fix:** Upgrade your provider tier in the portal.

### `Domain not verified`
**Cause:** Trying to create a mailbox on a domain that hasn't completed DNS verification.
**Fix:** Ensure the user has added the TXT records and call the verify endpoint.

### `Mailbox limit reached`
**Cause:** The tenant has reached the max mailboxes allowed by their assigned plan (LITE/PRO/BUSINESS).
**Fix:** Upgrade the tenant's plan using `PATCH /tenants/:id`.

## DNS Verification Issues
If domain verification fails:
1. **Wait:** DNS propagation can take up to 24 hours (usually < 15 mins).
2. **Check:** Use `dig` or an online DNS checker to verify the TXT record exists.
   ```bash
   dig TXT _ephemera.example.com
   ```
3. **Format:** Ensure the record value is exactly `ephemera-verify=<token>`.

## Support
If you need further assistance:
- **Email:** partners@ephemera.email
- **Portal:** [Open a Ticket](https://provider.ephemera.email/support)
