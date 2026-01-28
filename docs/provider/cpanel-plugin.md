# cPanel/WHM Plugin Installation

## Overview

The Ephemera cPanel plugin enables hosting providers to offer email hosting directly from cPanel/WHM interface.

## Requirements

- cPanel/WHM v120 or later
- PHP 7.4+
- WHM root access
- Ephemera Provider API Key

## Installation

### From WHM

1. Log in to WHM as root
2. Navigate to **Plugins → Upload Plugin**
3. Upload `ephemera-cpanel.tar.gz`
4. Click **Install**

### Manual Installation

```bash
# Download plugin
wget https://downloads.ephemera.email/cpanel/ephemera-cpanel-latest.tar.gz

# Extract to plugins directory
cd /usr/local/cpanel
tar -xzf ephemera-cpanel-latest.tar.gz

# Register plugin
/usr/local/cpanel/bin/register_cpanelplugin /usr/local/cpanel/base/frontend/jupiter/ephemera/install.json

# Set permissions
chmod 755 /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/
chmod 755 /usr/local/cpanel/base/frontend/jupiter/ephemera/
```

## Configuration

### WHM Setup

1. Log in to WHM
2. Go to **Plugins → Ephemera Email**
3. Enter configuration:
   - **API URL:** `https://api.ephemera.email`
   - **API Key:** Your Provider API Key
   - **Default Plan:** Select default plan for new accounts
   - **Auto-provision:** Enable to auto-create tenants on account creation

### Test Connection

Click **Test Connection** to verify API connectivity.

## File Structure

```
/usr/local/cpanel/
├── whostmgr/docroot/cgi/ephemera/
│   ├── index.live.cgi       # WHM admin interface
│   └── lib/
│       └── EphemeraAPI.pm   # API client
├── base/frontend/jupiter/ephemera/
│   ├── index.live.php       # cPanel user interface
│   └── lib/
│       └── EphemeraAPI.php  # PHP API client
└── Cpanel/Ephemera/
    ├── Config.pm            # Configuration handler
    └── Hooks.pm             # Event hooks
```

## Features

### WHM Admin Interface

- Configure API settings
- View all tenants across accounts
- Bulk operations
- Usage reports

### cPanel User Interface

- View mailboxes
- Create/delete mailboxes
- Change passwords
- View storage usage
- Access webmail

## Event Hooks

The plugin registers these hooks for automation:

| Event | Action |
|-------|--------|
| `Accounts::Create` | Create tenant, add domain |
| `Accounts::Remove` | Terminate tenant |
| `Accounts::Suspend` | Suspend tenant |
| `Accounts::Unsuspend` | Unsuspend tenant |
| `Domain::park` | Add domain to tenant |
| `Domain::unpark` | Remove domain |

## API Integration

The plugin uses cPanel UAPI for internal operations:

```perl
# Example: List mailboxes
my $result = Cpanel::API::execute('Ephemera', 'list_mailboxes', {
    domain => $domain
});
```

## Customization

### Branding

Edit `/usr/local/cpanel/base/frontend/jupiter/ephemera/branding.json`:

```json
{
  "product_name": "Your Email Hosting",
  "logo_url": "/ephemera/images/your-logo.png",
  "support_url": "https://support.yourcompany.com"
}
```

### Custom CSS

Add custom styles to `/usr/local/cpanel/base/frontend/jupiter/ephemera/custom.css`

## Troubleshooting

### Plugin not appearing

```bash
# Rebuild plugin cache
/scripts/rebuildhttpdconf
/scripts/restartsrv_httpd

# Check plugin registration
/usr/local/cpanel/bin/manage_plugins --list
```

### API connection failed

1. Verify API key is correct
2. Check firewall allows outbound HTTPS
3. Test manually:
```bash
curl -H "X-Provider-Key: YOUR_KEY" https://api.ephemera.email/v1/provider/me
```

### Check logs

```bash
tail -f /usr/local/cpanel/logs/error_log | grep ephemera
```

## Upgrade

```bash
# Download new version
wget https://downloads.ephemera.email/cpanel/ephemera-cpanel-latest.tar.gz

# Upgrade
cd /usr/local/cpanel
tar -xzf ephemera-cpanel-latest.tar.gz

# Restart services
/scripts/restartsrv_httpd
```

## Uninstall

```bash
/usr/local/cpanel/bin/unregister_cpanelplugin ephemera
rm -rf /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/
rm -rf /usr/local/cpanel/base/frontend/jupiter/ephemera/
rm -rf /usr/local/cpanel/Cpanel/Ephemera/
```

## Support

- Documentation: https://docs.ephemera.email/cpanel
- Email: support@ephemera.email
- Issues: https://github.com/ephemera-email/cpanel-plugin/issues
