# Partner Onboarding Guide

Complete guide to get your Ephemera Email integration live in under 1 hour.

## Onboarding Checklist

- [ ] 1. Account creation + API key received
- [ ] 2. Plugin/module installation complete
- [ ] 3. Test tenant created successfully
- [ ] 4. DNS template configured
- [ ] 5. First 10 domains provisioned
- [ ] 6. Billing integration verified
- [ ] 7. Support handoff complete

## Step 1: Account Setup (5 minutes)

### 1.1 Receive Credentials

After approval, you'll receive:
- **Provider ID**: `prov_xxxxxxxxxxxx`
- **API Key**: `eph_provider_xxxxx...` (64 chars)
- **Portal Access**: https://portal.ephemera.email

### 1.2 Test Connection

```bash
curl -X GET https://api.ephemera.email/v1/provider/me \
  -H "X-Provider-Key: YOUR_API_KEY"
```

Expected response:
```json
{
  "provider": {
    "id": "prov_xxxx",
    "name": "Your Company",
    "status": "ACTIVE",
    "tier": "STARTER"
  }
}
```

## Step 2: Plugin Installation (10 minutes)

### cPanel/WHM

```bash
# Download and install
cd /usr/local/cpanel/base/frontend/jupiter
git clone https://github.com/ephemera-email/cpanel-plugin ephemera

# Register plugin
/usr/local/cpanel/bin/manage_plugins --install ephemera

# Configure API key
echo "YOUR_API_KEY" > /etc/ephemera/provider.key

# Restart services
/scripts/restartsrv_httpd
```

### WHMCS

1. Upload `ephemera/` to `/modules/servers/`
2. Go to **Setup → Products/Services → Servers**
3. Add server:
   - Type: Ephemera Email
   - Hostname: api.ephemera.email
   - Access Hash: Your API key

### DirectAdmin

```bash
cd /usr/local/directadmin/plugins
git clone https://github.com/ephemera-email/directadmin-plugin ephemera
chown -R diradmin:diradmin ephemera
```

### Plesk

```bash
plesk bin extension --install https://ephemera.email/releases/plesk-extension.zip
```

## Step 3: Create Test Tenant (5 minutes)

```bash
# Create your first tenant
curl -X POST https://api.ephemera.email/v1/provider/tenants \
  -H "X-Provider-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "test-customer-001",
    "customerEmail": "test@yourcompany.com",
    "customerName": "Test Customer",
    "plan": "PRO"
  }'
```

## Step 4: DNS Template Setup (15 minutes)

### Required DNS Records

For each customer domain, configure:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | @ | mail.ephemera.email | 10 |
| TXT | @ | v=spf1 include:spf.ephemera.email ~all | - |
| CNAME | ephemera._domainkey | dkim.ephemera.email | - |
| TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:dmarc@ephemera.email | - |

### cPanel DNS Template

Add to `/etc/named/custom.db`:
```
$ORIGIN {DOMAIN}.
@       IN      MX      10 mail.ephemera.email.
@       IN      TXT     "v=spf1 include:spf.ephemera.email ~all"
ephemera._domainkey     IN      CNAME   dkim.ephemera.email.
_dmarc  IN      TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@ephemera.email"
```

## Step 5: Provision First Domains (10 minutes)

### Add Domain

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/domains \
  -H "X-Provider-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "customerdomain.com"}'
```

### Verify Domain

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/domains/customerdomain.com/verify \
  -H "X-Provider-Key: YOUR_API_KEY"
```

### Create Mailbox

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/mailboxes \
  -H "X-Provider-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "localPart": "info",
    "domain": "customerdomain.com",
    "password": "SecurePassword123!"
  }'
```

## Step 6: Billing Integration (15 minutes)

### WHMCS Product Setup

1. **Create Product Group**: "Email Hosting"
2. **Create Products**:
   - Ephemera Lite ($5/mo)
   - Ephemera Pro ($12/mo)
   - Ephemera Business ($25/mo)

3. **Module Settings**:
   - Module: Ephemera Email
   - Plan: LITE/PRO/BUSINESS
   - Auto-setup: Yes

### Webhook Configuration

```bash
curl -X PATCH https://api.ephemera.email/v1/provider/me \
  -H "X-Provider-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-whmcs.com/modules/servers/ephemera/webhook.php"}'
```

## Step 7: Go Live Checklist

### Pre-Launch
- [ ] All plugins installed and tested
- [ ] DNS templates configured
- [ ] Billing products created
- [ ] Test orders placed successfully
- [ ] Support team briefed

### Launch Day
- [ ] Announce to customers
- [ ] Monitor first provisioning
- [ ] Check webhook delivery
- [ ] Verify email deliverability

### Post-Launch
- [ ] Review usage dashboard
- [ ] Collect customer feedback
- [ ] Schedule check-in call

## Support Resources

| Resource | Link |
|----------|------|
| API Docs | [docs.ephemera.email](https://docs.ephemera.email) |
| Partner Portal | [portal.ephemera.email](https://portal.ephemera.email) |
| Support Email | partners@ephemera.email |
| Partner Slack | [Join Channel](https://slack.ephemera.email) |
| Status Page | [status.ephemera.email](https://status.ephemera.email) |

## Escalation Path

1. **Tier 1**: Documentation & Knowledge Base
2. **Tier 2**: Partner Slack Channel (< 4hr response)
3. **Tier 3**: Direct Phone Support (Enterprise only)

---

**Need Help?** Contact your Partner Success Manager or email partners@ephemera.email
