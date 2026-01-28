# DirectAdmin Plugin Installation

## Overview

The Ephemera DirectAdmin plugin integrates email hosting into DirectAdmin control panel.

## Requirements

- DirectAdmin 1.65.0 or later
- PHP 7.4+
- Ephemera Provider API Key

## Installation

```bash
# Download plugin
wget https://downloads.ephemera.email/directadmin/ephemera-da-latest.tar.gz

# Extract to plugins directory
cd /usr/local/directadmin/plugins
tar -xzf ephemera-da-latest.tar.gz

# Set permissions
chmod 755 /usr/local/directadmin/plugins/ephemera/hooks/*.sh
chmod 644 /usr/local/directadmin/plugins/ephemera/plugin.conf

# Create data directory
mkdir -p /usr/local/directadmin/plugins/ephemera/data/users
chmod 700 /usr/local/directadmin/plugins/ephemera/data
```

## Directory Structure

```
/usr/local/directadmin/plugins/ephemera/
├── plugin.conf           # Plugin metadata
├── admin/
│   └── index.php         # Admin settings interface
├── user/
│   └── index.php         # User mailbox management
├── hooks/
│   ├── user_create.sh    # User creation hook
│   └── user_delete.sh    # User deletion hook
├── exec/
│   ├── EphemeraAPI.php   # API client
│   └── provision.php     # Provisioning script
└── data/
    ├── config.json       # Configuration
    └── users/            # Per-user tenant IDs
```

## Configuration

1. Log in to DirectAdmin as admin
2. Navigate to **Plugins → Ephemera Email**
3. Configure:
   - **API URL:** `https://api.ephemera.email`
   - **API Key:** Your Provider API Key
   - **Default Plan:** LITE/PRO/BUSINESS
   - **Auto-provision:** Enable for automatic tenant creation

4. Click **Save Settings**
5. Click **Test Connection** to verify

## Hook Registration

Register hooks for auto-provisioning:

```bash
cd /usr/local/directadmin/scripts/custom/

# User creation hook
ln -s /usr/local/directadmin/plugins/ephemera/hooks/user_create.sh user_create_post.sh

# User deletion hook
ln -s /usr/local/directadmin/plugins/ephemera/hooks/user_delete.sh user_destroy_pre.sh
```

## Features

### Admin Interface

- Configure API connection
- Set default plan
- Enable/disable auto-provisioning
- Test API connectivity
- View all user tenants

### User Interface

- View mailbox list with quotas
- Create new mailboxes
- Change mailbox passwords
- Delete mailboxes
- View usage statistics (storage, messages)

## API Client Usage

```php
<?php
require_once '/usr/local/directadmin/plugins/ephemera/exec/EphemeraAPI.php';

$api = new EphemeraAPI();
$tenantId = $api->getUserTenantId($username);

// List mailboxes
$mailboxes = $api->listMailboxes($tenantId);

// Create mailbox
$result = $api->createMailbox($tenantId, [
    'localPart' => 'info',
    'domain' => 'example.com',
    'password' => 'SecurePass123!'
]);
```

## Troubleshooting

### Plugin not appearing

```bash
# Restart DirectAdmin
systemctl restart directadmin

# Check plugin registration
ls -la /usr/local/directadmin/plugins/
```

### Check logs

```bash
tail -f /var/log/ephemera.log
```

### Test API manually

```bash
curl -H "X-Provider-Key: YOUR_KEY" https://api.ephemera.email/v1/provider/me
```

## Uninstall

```bash
rm -rf /usr/local/directadmin/plugins/ephemera/
rm -f /usr/local/directadmin/scripts/custom/user_create_post.sh
rm -f /usr/local/directadmin/scripts/custom/user_destroy_pre.sh
```

## Support

- Documentation: https://docs.ephemera.email/directadmin
- Email: support@ephemera.email
