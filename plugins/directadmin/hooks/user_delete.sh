#!/bin/bash
# Ephemera DirectAdmin Hook - User Delete
# Called when a user account is deleted

USERNAME="$1"

# Log the event
echo "[$(date)] User delete hook: $USERNAME" >> /var/log/ephemera.log

# Call PHP provisioning script
php /usr/local/directadmin/plugins/ephemera/exec/provision.php delete "$USERNAME"
