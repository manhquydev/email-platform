# Ephemera Plesk Extension

Plesk extension for Ephemera Email Hosting platform.

## Version

1.0.0

## Requirements

- Plesk Obsidian 18.0.0 or later
- PHP 7.4+
- Ephemera Provider API key

## Installation

### From ZIP Package

1. Package the extension:
```bash
cd plesk-ephemera
zip -r ephemera.zip *
```

2. Install via Plesk:
   - Go to **Extensions → My Extensions**
   - Click **Upload Extension**
   - Select the ZIP file

### Manual Installation

```bash
# Copy to Plesk extensions directory
cp -r plesk-ephemera /usr/local/psa/admin/plib/modules/ephemera

# Set permissions
chown -R psaadm:psaadm /usr/local/psa/admin/plib/modules/ephemera
```

## Configuration

1. Log in to Plesk as admin
2. Go to **Tools & Settings → Extension Settings**
3. Find Ephemera and click **Settings**
4. Enter:
   - API URL: `https://api.ephemera.email`
   - API Key: Your Provider API Key

## File Structure

```
plesk-ephemera/
├── meta.xml                      # Extension metadata
├── plib/
│   ├── controllers/
│   │   └── IndexController.php   # Main controller
│   ├── library/
│   │   └── EphemeraAPI.php       # API client
│   └── views/
│       └── scripts/
│           └── index/
│               └── index.phtml   # Main view template
└── htdocs/
    └── images/
        └── logo.png              # Extension logo
```

## Features

### Domain Owner Interface
- View mailbox list with quotas
- Create new mailboxes
- Change mailbox passwords
- Delete mailboxes
- View storage and message statistics

### API Integration
- Full Provider API v1 support
- Tenant management per domain
- Automatic domain provisioning

## Controller Actions

| Action | Description |
|--------|-------------|
| `index` | Main view with mailbox list |
| `createMailbox` | Create new mailbox |
| `deleteMailbox` | Delete mailbox |
| `changePassword` | Update mailbox password |

## Settings Storage

The extension uses Plesk's `pm_Settings` for:
- `api_url` - Ephemera API URL
- `api_key` - Provider API Key
- `tenant_{domain}` - Tenant ID per domain

## Event Handlers

To enable auto-provisioning, create event handlers:
- `domain_create` → Create tenant and add domain
- `domain_delete` → Terminate tenant

## Troubleshooting

### Extension not appearing
```bash
plesk bin extension --update-all
plesk bin extension --enable ephemera
```

### Check extension logs
```bash
tail -f /var/log/plesk/panel.log | grep ephemera
```

## Packaging for Plesk Marketplace

1. Validate extension:
```bash
plesk bin extension --validate /path/to/ephemera
```

2. Create signed package for marketplace submission

## License

Proprietary - Ephemera Email Platform
