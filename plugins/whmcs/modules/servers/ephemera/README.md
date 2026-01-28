# Ephemera WHMCS Provisioning Module

WHMCS provisioning module for Ephemera Email Hosting platform. Automates email hosting provisioning, billing, and management.

## Version

1.0.0

## Requirements

- WHMCS v8.0 or later
- PHP 7.4+ with cURL extension
- Ephemera Provider API key

## Installation

1. Upload the `ephemera` folder to `modules/servers/` in your WHMCS installation
2. Log in to WHMCS Admin
3. Go to **Setup → Products/Services → Servers**
4. Add a new server:
   - Name: Ephemera Email
   - Hostname: api.ephemera.email
   - Username: Your Provider API Key
   - Type: Ephemera Email Hosting

## Configuration

### Server Setup

| Field | Value |
|-------|-------|
| Hostname | api.ephemera.email |
| Username | Your Provider API Key |
| Password | (leave empty) |
| Secure | Yes (SSL) |

### Product Configuration

When creating a product, configure these options:

| Option | Description |
|--------|-------------|
| Email Plan | LITE, PRO, or BUSINESS |
| Max Mailboxes | Maximum mailboxes (0 = unlimited) |
| Storage per Mailbox | Storage quota in GB |
| Enable CalDAV | Calendar sync feature |
| Enable CardDAV | Contacts sync feature |

## Features

### Provisioning Functions

- **Create Account**: Creates tenant, adds domain
- **Suspend Account**: Suspends email service
- **Unsuspend Account**: Reactivates email service
- **Terminate Account**: Deletes tenant and all data
- **Change Package**: Upgrades/downgrades plan

### Client Area

- View mailbox list and usage
- Create new mailboxes
- Change mailbox passwords
- Delete mailboxes
- Access webmail via SSO
- View domain DNS records

### Admin Area

- View tenant details
- Sync usage data
- Test connection

### Automated Tasks

- Daily usage sync via WHMCS cron
- Domain change detection and sync
- Activity logging

## File Structure

```
modules/servers/ephemera/
├── ephemera.php           # Main module file
├── hooks.php              # WHMCS hooks
├── lib/
│   ├── EphemeraAPI.php    # API wrapper class
│   └── EphemeraHelper.php # Helper functions
└── templates/
    └── overview.tpl       # Client area template
```

## API Endpoints Used

| Endpoint | Function |
|----------|----------|
| POST /v1/provider/tenants | Create tenant |
| GET /v1/provider/tenants/:id | Get tenant |
| PATCH /v1/provider/tenants/:id | Update tenant |
| POST /v1/provider/tenants/:id/suspend | Suspend |
| POST /v1/provider/tenants/:id/unsuspend | Unsuspend |
| DELETE /v1/provider/tenants/:id | Terminate |
| GET /v1/provider/tenants/:id/mailboxes | List mailboxes |
| POST /v1/provider/tenants/:id/mailboxes | Create mailbox |
| GET /v1/provider/tenants/:id/usage | Get usage |
| POST /v1/provider/tenants/:id/sso | Get SSO URL |

## Troubleshooting

### Check Module Logs

Go to **Utilities → Logs → Module Log** and filter by "ephemera".

### Test Connection

1. Go to **Setup → Products/Services → Servers**
2. Edit your Ephemera server
3. Click "Test Connection"

### Common Issues

| Issue | Solution |
|-------|----------|
| Connection failed | Verify API key and hostname |
| Tenant ID not found | Re-provision the service |
| SSL certificate error | Ensure server has valid CA certificates |

## Custom Fields

The module stores the Tenant ID in one of these locations:
1. Custom field named "Tenant ID" (if exists)
2. Service notes field (JSON format)

## Hooks

The module registers these WHMCS hooks:

- `DailyCronJob`: Syncs usage data for all active services
- `ServiceEdit`: Detects domain changes and syncs
- `AfterModuleCreate/Suspend/Terminate`: Activity logging
- `AdminHomeWidgets`: Dashboard statistics widget

## Support

- Documentation: https://ephemera.email/docs/whmcs
- Issues: https://github.com/ephemera/whmcs-module/issues

## License

Proprietary - Ephemera Email Platform
