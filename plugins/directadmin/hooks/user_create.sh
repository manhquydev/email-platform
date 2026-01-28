#!/bin/bash
# Ephemera DirectAdmin Hook - User Create
# Called when a new user account is created

USERNAME="$1"
DOMAIN="$2"
EMAIL="$3"

# Log the event
echo "[$(date)] User create hook: $USERNAME / $DOMAIN" >> /var/log/ephemera.log

# Call PHP provisioning script
php /usr/local/directadmin/plugins/ephemera/exec/provision.php create "$USERNAME" "$DOMAIN" "$EMAIL"
