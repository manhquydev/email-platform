# Ephemera cPanel/WHM Plugin

Email hosting management plugin for cPanel/WHM servers, integrating with the Ephemera Provider API.

## Version

1.0.0

## Requirements

- cPanel/WHM v120 or later
- Root access to the server
- Ephemera Provider API key

## Installation

```bash
# Download and extract the plugin
tar -xzf ephemera-cpanel-plugin.tar.gz
cd ephemera-cpanel-plugin

# Run installer as root
sudo ./install.sh
```

## Configuration

1. Log in to WHM as root
2. Navigate to **Plugins → Ephemera Email Hosting**
3. Enter your Provider API Key (get one at https://ephemera.email/providers)
4. Configure default settings:
   - Default plan for new accounts
   - Enable/disable auto-provisioning

## Features

### WHM (Admin)
- Provider dashboard with usage statistics
- Tenant management (suspend/unsuspend)
- Configuration settings

### cPanel (End User)
- Create and manage email accounts
- Change passwords
- View usage statistics
- Access webmail

### Auto-Provisioning

When enabled, the plugin automatically:
- Creates email tenant when new cPanel account is created
- Suspends email when cPanel account is suspended
- Terminates email when cPanel account is removed

## File Locations

```
/usr/local/cpanel/Cpanel/Ephemera/       # Perl modules
/usr/local/cpanel/base/frontend/jupiter/ephemera/  # cPanel UI
/usr/local/cpanel/whostmgr/docroot/cgi/ephemera/   # WHM UI
/usr/local/cpanel/scripts/ephemera_hooks.pl        # Hooks
/var/cpanel/ephemera/                    # Configuration
/var/log/ephemera.log                    # Logs
```

## Uninstallation

```bash
sudo ./uninstall.sh
```

## Troubleshooting

### Check logs
```bash
tail -f /var/log/ephemera.log
```

### Test API connection
Go to WHM → Ephemera Settings → Test Connection

### Re-register hooks
```bash
/usr/local/cpanel/scripts/ephemera_hooks.pl --event=register
```

## Support

- Documentation: https://ephemera.email/docs/cpanel
- Issues: https://github.com/ephemera/cpanel-plugin/issues

## License

Proprietary - Ephemera Email Platform
