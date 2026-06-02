#!/bin/bash
# Ephemera DirectAdmin Hook - User Create
# Called when a new user account is created

USERNAME="$1"
DOMAIN="$2"
EMAIL="$3"

# Validate inputs before logging or passing to the provisioner.
# Reject values that contain shell metacharacters or log-injection sequences.
[[ "$USERNAME" =~ ^[a-zA-Z0-9._-]+$ ]] || { echo "[$(date)] user_create: invalid USERNAME"; exit 1; }
[[ "$DOMAIN"   =~ ^[a-zA-Z0-9._-]+$ ]] || { echo "[$(date)] user_create: invalid DOMAIN";   exit 1; }
[[ "$EMAIL"    =~ ^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+$ ]] || { echo "[$(date)] user_create: invalid EMAIL"; exit 1; }

# Log the event
echo "[$(date)] User create hook: $USERNAME / $DOMAIN" >> /var/log/ephemera.log

# Call PHP provisioning script
php /usr/local/directadmin/plugins/ephemera/exec/provision.php create "$USERNAME" "$DOMAIN" "$EMAIL"
