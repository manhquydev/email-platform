#!/bin/bash

# Define paths
API_ENV_PATH="./services/api/.env"

# Function to generate a random 32-character hex string
generate_secret() {
  openssl rand -hex 32
}

echo "Generating production .env for API service..."

if [ -f "$API_ENV_PATH" ]; then
  read -p "$API_ENV_PATH already exists. Overwrite? (y/N) " confirm
  if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "Skipped."
    exit 0
  fi
fi

# Generate secrets
JWT_SECRET=$(generate_secret)
CAPTCHA_SECRET=$(generate_secret)
POSTGRES_PASSWORD=$(openssl rand -base64 12)

# Create file
cat <<EOF > "$API_ENV_PATH"
# Production Environment Variables

# Database
DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/email_service"

# Secrets
JWT_SECRET="${JWT_SECRET}"
CAPTCHA_SECRET="${CAPTCHA_SECRET}"

# App Config
NODE_ENV="production"
HTTP_PORT=3001
SMTP_PORT=25
LOG_LEVEL="info"
WEB_URL="http://localhost:8080" # Change this to your domain, e.g. https://example.com
TRUST_PROXY="true"
OUTBOUND_ENABLED="false"

# Redis
REDIS_HOST="redis"
REDIS_PORT=6379

# Quotas & Limits
RATE_LIMIT_MAX=100
SMTP_RATE_WINDOW_MINUTES=5
SMTP_RATE_LIMIT_PER_IP=50

# Features
ALLOW_AUTO_DOMAIN_CREATION="false" # Safer for production
PUBLIC_INBOX_ENABLED="false"
EOF

echo "Done! Created $API_ENV_PATH"
echo "IMPORTANT: Please check the file and update WEB_URL to your actual domain."
