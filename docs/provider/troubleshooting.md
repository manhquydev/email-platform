# Troubleshooting Guide

## Common Issues

### Authentication Errors

#### 401 Unauthorized

**Cause:** Invalid or expired API key

**Solution:**
1. Verify API key format: `eph_provider_[64 hex chars]`
2. Check key hasn't been regenerated
3. Ensure `X-Provider-Key` header is set correctly

```bash
# Test authentication
curl -v -H "X-Provider-Key: YOUR_KEY" https://api.ephemera.email/v1/provider/me
```

### Tenant Issues

#### Tenant creation fails

**Cause:** Duplicate externalId or invalid data

**Solution:**
1. Check externalId is unique per provider
2. Verify email format is valid
3. Ensure plan is one of: LITE, PRO, BUSINESS

```bash
# Check existing tenants
curl -H "X-Provider-Key: YOUR_KEY" \
  "https://api.ephemera.email/v1/provider/tenants?externalId=YOUR_ID"
```

#### Tenant not found

**Cause:** Wrong tenant ID or tenant terminated

**Solution:**
1. List all tenants to find correct ID
2. Check tenant wasn't terminated
3. Verify tenant belongs to your provider

### Domain Issues

#### Domain verification fails

**Cause:** DNS records not configured or not propagated

**Solution:**
1. Verify all required DNS records:
   - MX record pointing to mail.ephemera.email
   - SPF TXT record
   - DKIM CNAME record
   - DMARC TXT record

2. Check DNS propagation:
```bash
dig MX example.com
dig TXT example.com
dig CNAME ephemera._domainkey.example.com
```

3. Wait up to 48 hours for propagation

#### Domain already exists

**Cause:** Domain added to another tenant

**Solution:**
1. Remove domain from other tenant first
2. Contact support if domain was previously used

### Mailbox Issues

#### Mailbox limit exceeded

**Cause:** LITE plan limit (5 mailboxes) reached

**Solution:**
1. Upgrade to PRO or BUSINESS plan
2. Delete unused mailboxes

```bash
# Upgrade plan
curl -X PATCH "https://api.ephemera.email/v1/provider/tenants/TENANT_ID" \
  -H "X-Provider-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"plan": "PRO"}'
```

#### Mailbox creation fails on unverified domain

**Cause:** Domain must be verified before creating mailboxes

**Solution:**
1. Complete domain verification
2. Check verification status:
```bash
curl -H "X-Provider-Key: YOUR_KEY" \
  "https://api.ephemera.email/v1/provider/tenants/TENANT_ID/domains"
```

### Rate Limiting

#### 429 Too Many Requests

**Cause:** Exceeded rate limits (100/min, 1000/hr)

**Solution:**
1. Implement exponential backoff
2. Check `X-RateLimit-Reset` header for retry time
3. Batch operations where possible
4. Contact support for limit increase

### Plugin-Specific Issues

#### cPanel: Plugin not loading

```bash
# Check plugin registration
/usr/local/cpanel/bin/manage_plugins --list | grep ephemera

# Rebuild and restart
/scripts/rebuildhttpdconf
/scripts/restartsrv_httpd

# Check logs
tail -f /usr/local/cpanel/logs/error_log
```

#### WHMCS: Module errors

1. Enable debug mode in module settings
2. Check **Utilities → Logs → Module Log**
3. Verify server configuration in WHMCS
4. Clear template cache: `rm -rf templates_c/*`

#### DirectAdmin: Hook not running

```bash
# Verify hook symlinks
ls -la /usr/local/directadmin/scripts/custom/

# Check hook permissions
chmod 755 /usr/local/directadmin/plugins/ephemera/hooks/*.sh

# Test hook manually
/usr/local/directadmin/plugins/ephemera/hooks/user_create.sh
```

#### Plesk: Extension not visible

```bash
# Update extensions
plesk bin extension --update-all

# Enable extension
plesk bin extension --enable ephemera

# Check logs
tail -f /var/log/plesk/panel.log
```

## Diagnostic Commands

### Test API connectivity

```bash
# Basic connectivity
curl -v https://api.ephemera.email/health

# Authenticated request
curl -H "X-Provider-Key: YOUR_KEY" https://api.ephemera.email/v1/provider/me
```

### Check DNS records

```bash
# MX record
dig MX example.com +short

# SPF record
dig TXT example.com +short | grep spf

# DKIM record
dig CNAME ephemera._domainkey.example.com +short

# DMARC record
dig TXT _dmarc.example.com +short
```

### Test email delivery

```bash
# Send test via SMTP
swaks --to test@example.com \
  --from sender@yourdomain.com \
  --server smtp.ephemera.email:587 \
  --auth LOGIN \
  --auth-user user@domain.com \
  --auth-password "password" \
  --tls
```

## Getting Help

1. **Documentation:** https://docs.ephemera.email
2. **Email Support:** support@ephemera.email
3. **API Status:** https://status.ephemera.email
4. **GitHub Issues:** https://github.com/ephemera-email/provider-api/issues

When contacting support, include:
- Provider ID
- Tenant ID (if applicable)
- Request/response logs
- Timestamps of issues
