# Ephemera DirectAdmin Plugin

DirectAdmin plugin for Ephemera Email Hosting platform.

## Version

1.0.0

## Requirements

- DirectAdmin 1.65.0 or later
- PHP 7.4+
- Ephemera Provider API key

## Installation

```bash
# Copy plugin to DirectAdmin plugins directory
cp -r ephemera /usr/local/directadmin/plugins/

# Set permissions
chmod 755 /usr/local/directadmin/plugins/ephemera/hooks/*.sh
chmod 644 /usr/local/directadmin/plugins/ephemera/plugin.conf

# Create data directory
mkdir -p /usr/local/directadmin/plugins/ephemera/data/users
chmod 700 /usr/local/directadmin/plugins/ephemera/data
```

## Configuration

1. Log in to DirectAdmin as admin
2. Navigate to **Plugins → Ephemera Email**
3. Enter your Provider API Key
4. Configure default plan and auto-provisioning

## File Structure

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

## Features

### Admin Interface
- Configure API URL and key
- Set default plan (Lite/Pro/Business)
- Enable/disable auto-provisioning
- Test API connection

### User Interface
- View mailbox list
- Create new mailboxes
- Change passwords
- Delete mailboxes
- View usage statistics

### Auto-Provisioning
When enabled, automatically:
- Creates email tenant on user creation
- Adds domain to tenant
- Terminates tenant on user deletion

## Hooks

Register hooks in DirectAdmin:

```bash
# In /usr/local/directadmin/scripts/custom/
ln -s /usr/local/directadmin/plugins/ephemera/hooks/user_create.sh user_create_post.sh
ln -s /usr/local/directadmin/plugins/ephemera/hooks/user_delete.sh user_destroy_pre.sh
```

## Troubleshooting

### Check logs
```bash
tail -f /var/log/ephemera.log
```

### Test API connection
Visit Admin → Plugins → Ephemera Email → Test Connection

## License

Proprietary - Ephemera Email Platform
