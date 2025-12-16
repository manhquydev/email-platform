#!/bin/sh

# Default values if not set
API_BASE=${VITE_API_BASE:-"http://localhost:3001"}
OUTBOUND_ENABLED=${OUTBOUND_ENABLED:-"false"}

# Generate config.js
cat <<EOF > /usr/share/nginx/html/config.js
window.env = {
  API_BASE: "${API_BASE}",
  OUTBOUND_ENABLED: "${OUTBOUND_ENABLED}"
};
EOF

# Execute the CMD passed to the docker container (usually "nginx -g 'daemon off;'")
exec "$@"
