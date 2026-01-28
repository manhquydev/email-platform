# WHMCS Module Installation

## Overview

The Ephemera WHMCS module automates email hosting provisioning, billing, and management directly from WHMCS.

## Requirements

- WHMCS 8.0 or later
- PHP 7.4+
- Ephemera Provider API Key
- cURL extension enabled

## Installation

### Download

```bash
# Download module
wget https://downloads.ephemera.email/whmcs/ephemera-whmcs-latest.zip

# Extract to WHMCS modules directory
unzip ephemera-whmcs-latest.zip -d /path/to/whmcs/modules/servers/
```

### Directory Structure

```
modules/servers/ephemera/
├── ephemera.php          # Main module file
├── hooks.php             # WHMCS hooks
├── lib/
│   ├── EphemeraAPI.php   # API client
│   └── EphemeraHelper.php # Utilities
└── templates/
    └── overview.tpl      # Client area template
```

### Set Permissions

```bash
chmod 755 /path/to/whmcs/modules/servers/ephemera/
chmod 644 /path/to/whmcs/modules/servers/ephemera/*.php
```

## Configuration

### 1. Add Server

1. Go to **WHMCS Admin → Setup → Products/Services → Servers**
2. Click **Add New Server**
3. Configure:
   - **Name:** Ephemera Email
   - **Hostname:** api.ephemera.email
   - **Type:** Ephemera
   - **Access Hash:** Your Provider API Key
4. Click **Save Changes**

### 2. Create Product

1. Go to **Setup → Products/Services → Products/Services**
2. Click **Create a New Product**
3. Configure:
   - **Product Type:** Other
   - **Product Group:** Your group
   - **Product Name:** Email Hosting Lite (or Pro/Business)
4. In **Module Settings** tab:
   - **Module Name:** Ephemera
   - **Plan:** Select LITE/PRO/BUSINESS
5. Click **Save Changes**

### 3. Configure Pricing

Set your pricing in the **Pricing** tab. Suggested markup:

| Plan | Our Cost | Suggested Price |
|------|----------|-----------------|
| LITE ($1/domain) | $1 | $3-5/month |
| PRO ($5/domain) | $5 | $10-15/month |
| BUSINESS ($10/domain) | $10 | $20-30/month |

## Module Functions

### Provisioning

| Function | Description |
|----------|-------------|
| CreateAccount | Creates tenant, adds domain |
| SuspendAccount | Suspends email access |
| UnsuspendAccount | Restores access |
| TerminateAccount | Deletes tenant permanently |
| ChangePackage | Upgrades/downgrades plan |

### Client Area

| Function | Description |
|----------|-------------|
| ClientArea | Main management interface |
| clientCreateMailbox | Create new mailbox |
| clientDeleteMailbox | Remove mailbox |
| clientChangePassword | Update mailbox password |
| clientGetDnsRecords | View required DNS records |
| clientWebmailSSO | SSO to webmail |

## Custom Fields

The module uses these custom fields (auto-created):

| Field | Purpose |
|-------|---------|
| `ephemera_tenant_id` | Tenant UUID |
| `ephemera_domain` | Primary domain |

## Hooks

The module registers hooks for automation:

```php
// hooks.php
add_hook('DailyCronJob', 1, function() {
    // Sync usage metrics for billing
});

add_hook('ServiceEdit', 1, function($vars) {
    // Handle domain changes
});
```

## Client Area

The client area provides:

- Mailbox list with quotas
- Create mailbox form
- Password change modal
- DNS records display
- Webmail SSO link
- Usage statistics

### Customizing Template

Edit `templates/overview.tpl` for custom branding:

```smarty
<div class="ephemera-panel">
    <h3>{$LANG.ephemera.title}</h3>
    {* Your customizations *}
</div>
```

### Language Strings

Add to `/lang/english.php`:

```php
$_LANG['ephemera']['title'] = 'Email Hosting';
$_LANG['ephemera']['create_mailbox'] = 'Create Mailbox';
// etc.
```

## API Configuration

The module stores configuration per service:

```php
// Access in custom code
$tenantId = EphemeraHelper::getTenantId($params['serviceid']);
$api = EphemeraHelper::getApi($params);
$mailboxes = $api->listMailboxes($tenantId);
```

## Automation

### Auto-provisioning Flow

1. Customer orders product
2. Payment confirmed
3. Module creates tenant via API
4. Domain added to tenant
5. Welcome email sent with DNS records
6. Customer configures DNS
7. Domain verified (manual or auto)
8. Customer creates mailboxes

### Usage Sync

Daily cron syncs usage for:
- Storage used per mailbox
- Message counts
- Overage billing (if configured)

## Troubleshooting

### Module not showing

```bash
# Clear WHMCS cache
rm -rf /path/to/whmcs/templates_c/*
```

### Check module logs

1. Enable **Logging** in module settings
2. View logs at **Utilities → Logs → Module Log**

### API errors

Common errors and solutions:

| Error | Solution |
|-------|----------|
| 401 Unauthorized | Check API key in server config |
| 404 Tenant not found | Service may have invalid tenant_id |
| 429 Rate limit | Reduce concurrent operations |

### Debug mode

Add to `/configuration.php`:
```php
$ephemera_debug = true;
```

Logs written to `/modules/servers/ephemera/debug.log`

## Upgrade

1. Backup current module
2. Download new version
3. Extract, overwriting files
4. Clear WHMCS cache

```bash
cp -r modules/servers/ephemera modules/servers/ephemera.backup
unzip ephemera-whmcs-latest.zip -d modules/servers/
rm -rf templates_c/*
```

## Support

- Documentation: https://docs.ephemera.email/whmcs
- Email: support@ephemera.email
- WHMCS Marketplace: https://marketplace.whmcs.com/product/ephemera
