#!/bin/bash
# =============================================================
# COMPLETE DEPLOYMENT SCRIPT - Email Platform
# Run this script on your DigitalOcean server via SSH or Console
# =============================================================

set -e  # Exit on error

echo "🚀 Starting deployment of Email Platform..."
echo "============================================"

# Navigate to project directory
cd /root/email-platform
echo "📁 Current directory: $(pwd)"

# =============================================================
# CONFIGURATION
# =============================================================
export DOMAIN="manhquy.click"
export ACME_EMAIL="admin@manhquy.click"
export VITE_API_BASE="https://api.manhquy.click"

echo "🌍 Deploying to Domain: $DOMAIN"
echo "📧 SSL Email: $ACME_EMAIL"
echo "🔗 API Base: $VITE_API_BASE"
# =============================================================

# Step 1: Pull latest code
echo ""
echo "📥 Step 1: Pulling latest code from GitHub..."
git pull https://manhquydev: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@github.com/manhquydev/email-platform.git main

# Step 2: Rebuild Docker containers
echo ""
echo "🐳 Step 2: Rebuilding Docker containers..."
DOMAIN=$DOMAIN ACME_EMAIL=$ACME_EMAIL docker compose -f docker-compose.prod.yml up -d --build

# Wait for containers to start
echo ""
echo "⏳ Waiting 30 seconds for services to start..."
sleep 30

# Step 3: Check container status
echo ""
echo "📊 Step 3: Checking container status..."
docker compose -f docker-compose.prod.yml ps

# Step 4: Setup Telegram Webhook
echo ""
echo "📱 Step 4: Setting up Telegram Webhook..."

# Read bot token from .env file
BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN services/api/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | head -1)
WEBHOOK_SECRET=$(grep TELEGRAM_WEBHOOK_SECRET services/api/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | head -1)

if [ -z "$BOT_TOKEN" ]; then
    echo "⚠️  TELEGRAM_BOT_TOKEN not found in services/api/.env"
    echo "   Skipping webhook setup. You can set it up manually later."
else
    echo "   Bot Token found: ${BOT_TOKEN:0:15}..."
    
    WEBHOOK_URL="https://api.manhquy.click/telegram/webhook"
    echo "   Webhook URL: $WEBHOOK_URL"
    
    # Build payload
    if [ -n "$WEBHOOK_SECRET" ]; then
        PAYLOAD="{\"url\": \"$WEBHOOK_URL\", \"allowed_updates\": [\"message\", \"callback_query\"], \"secret_token\": \"$WEBHOOK_SECRET\"}"
    else
        PAYLOAD="{\"url\": \"$WEBHOOK_URL\", \"allowed_updates\": [\"message\", \"callback_query\"]}"
    fi
    
    # Set webhook
    echo ""
    echo "   Setting webhook..."
    RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    echo "   Response: $RESPONSE"
    
    # Get webhook info
    echo ""
    echo "   Verifying webhook..."
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | head -c 500
    echo ""
fi

# Step 5: Verify deployment
echo ""
echo "✅ Step 5: Deployment complete!"
echo ""
echo "📋 Summary:"
echo "   - Code: Pulled from main branch"
echo "   - Docker: Containers rebuilt and running"
echo "   - Telegram: Webhook configured (if token was set)"
echo ""
echo "🔗 URLs:"
echo "   - Web App: https://app.manhquy.click"
echo "   - API: https://api.manhquy.click"
echo ""
echo "🧪 Test Telegram:"
echo "   1. Open @EmailForward3CEbot in Telegram"
echo "   2. Send /start"
echo "   3. Should see welcome message"
echo ""
echo "============================================"
echo "🎉 Deployment finished at $(date)"
