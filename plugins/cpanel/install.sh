#!/bin/bash
# Ephemera cPanel Plugin Installer
# Installs the Ephemera Email Hosting plugin for cPanel/WHM

set -e

PLUGIN_VERSION="1.0.0"
PLUGIN_NAME="ephemera"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "Ephemera cPanel Plugin Installer v${PLUGIN_VERSION}"
echo "========================================"
echo ""

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

# Check if cPanel is installed
if [ ! -d "/usr/local/cpanel" ]; then
    echo "Error: cPanel not found. This plugin requires cPanel/WHM."
    exit 1
fi

# Get cPanel version
CPANEL_VERSION=$(cat /usr/local/cpanel/version 2>/dev/null || echo "unknown")
echo "Detected cPanel version: ${CPANEL_VERSION}"
echo ""

# Create directories
echo "[1/7] Creating directories..."
mkdir -p /usr/local/cpanel/Cpanel/Ephemera
mkdir -p /usr/local/cpanel/base/frontend/jupiter/ephemera
mkdir -p /usr/local/cpanel/whostmgr/docroot/cgi/ephemera
mkdir -p /var/cpanel/ephemera/users
mkdir -p /var/log

# Copy Perl modules
echo "[2/7] Installing Perl modules..."
cp -r "${SCRIPT_DIR}/lib/Cpanel/Ephemera/"* /usr/local/cpanel/Cpanel/Ephemera/

# Copy cPanel user interface
echo "[3/7] Installing cPanel user interface..."
cp -r "${SCRIPT_DIR}/cpanel/"* /usr/local/cpanel/base/frontend/jupiter/ephemera/
chmod +x /usr/local/cpanel/base/frontend/jupiter/ephemera/*.cgi 2>/dev/null || true

# Copy WHM admin interface
echo "[4/7] Installing WHM admin interface..."
cp -r "${SCRIPT_DIR}/whm/"* /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/
chmod +x /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/*.cgi

# Copy hooks script
echo "[5/7] Installing hooks..."
cp "${SCRIPT_DIR}/scripts/ephemera_hooks.pl" /usr/local/cpanel/scripts/
chmod +x /usr/local/cpanel/scripts/ephemera_hooks.pl

# Register hooks
/usr/local/cpanel/scripts/ephemera_hooks.pl --event=register

# Register cPanel app
echo "[6/7] Registering cPanel application..."
cat > /var/cpanel/apps/${PLUGIN_NAME}.conf << 'EOF'
name=Ephemera Email
url=ephemera/index.tt
group=mail
acls=all
feature=ephemera
itemdesc=Ephemera Email Hosting
EOF

# Register WHM plugin
mkdir -p /usr/local/cpanel/whostmgr/docroot/addon_plugins
cat > /usr/local/cpanel/whostmgr/docroot/addon_plugins/${PLUGIN_NAME}.conf << 'EOF'
name=Ephemera Email Hosting
url=cgi/ephemera/index.cgi
group=plugins
acls=all
EOF

# Enable feature for all packages
echo "[7/7] Enabling feature..."
cat > /var/cpanel/features/${PLUGIN_NAME} << 'EOF'
ephemera=1
EOF

# Set permissions
chmod 700 /var/cpanel/ephemera
chmod 700 /var/cpanel/ephemera/users

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Log in to WHM"
echo "2. Go to Plugins > Ephemera Email Hosting"
echo "3. Enter your Provider API Key"
echo "4. Configure auto-provisioning settings"
echo ""
echo "For support, visit: https://ephemera.email/docs/cpanel"
echo ""
