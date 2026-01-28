#!/bin/bash
# Ephemera cPanel Plugin Uninstaller
# Removes the Ephemera Email Hosting plugin from cPanel/WHM

set -e

PLUGIN_NAME="ephemera"

echo "========================================"
echo "Ephemera cPanel Plugin Uninstaller"
echo "========================================"
echo ""

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

read -p "Are you sure you want to uninstall Ephemera? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo ""

# Unregister hooks
echo "[1/5] Unregistering hooks..."
if [ -f "/usr/local/cpanel/scripts/ephemera_hooks.pl" ]; then
    /usr/local/cpanel/scripts/ephemera_hooks.pl --event=unregister 2>/dev/null || true
fi

# Remove Perl modules
echo "[2/5] Removing Perl modules..."
rm -rf /usr/local/cpanel/Cpanel/Ephemera

# Remove cPanel interface
echo "[3/5] Removing cPanel interface..."
rm -rf /usr/local/cpanel/base/frontend/jupiter/ephemera

# Remove WHM interface
echo "[4/5] Removing WHM interface..."
rm -rf /usr/local/cpanel/whostmgr/docroot/cgi/ephemera
rm -f /usr/local/cpanel/whostmgr/docroot/addon_plugins/${PLUGIN_NAME}.conf

# Remove app registration and feature
echo "[5/5] Removing registrations..."
rm -f /var/cpanel/apps/${PLUGIN_NAME}.conf
rm -f /var/cpanel/features/${PLUGIN_NAME}
rm -f /usr/local/cpanel/scripts/ephemera_hooks.pl
rm -f /var/cpanel/hooks/ephemera.yaml

echo ""
echo "========================================"
echo "Uninstall Complete!"
echo "========================================"
echo ""
echo "Note: Configuration data in /var/cpanel/ephemera has been preserved."
echo "To remove all data, run: rm -rf /var/cpanel/ephemera"
echo ""
