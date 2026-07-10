#!/bin/bash
# Telegram Webhook Setup Script
# Run this on the production server or with production credentials

# REQUIRED: Set your bot token here or as environment variable
# Get this from @BotFather on Telegram
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
API_URL="${API_URL:-https://api.manhquy.id.vn}"
WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET:-}"

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN is not set"
    echo ""
    echo "Usage:"
    echo "  export TELEGRAM_BOT_TOKEN='your_bot_token'"
    echo "  ./setup-webhook.sh"
    echo ""
    echo "Or run directly:"
    echo "  TELEGRAM_BOT_TOKEN='your_token' ./setup-webhook.sh"
    exit 1
fi

WEBHOOK_URL="${API_URL}/telegram/webhook"

echo "🚀 Setting Telegram Webhook..."
echo "   Bot Token: ${BOT_TOKEN:0:20}..."
echo "   Webhook URL: $WEBHOOK_URL"

# Build JSON payload
if [ -n "$WEBHOOK_SECRET" ]; then
    echo "🔒 Using Webhook Secret"
    PAYLOAD=$(cat <<EOF
{
  "url": "$WEBHOOK_URL",
  "allowed_updates": ["message", "callback_query"],
  "secret_token": "$WEBHOOK_SECRET"
}
EOF
)
else
    PAYLOAD=$(cat <<EOF
{
  "url": "$WEBHOOK_URL",
  "allowed_updates": ["message", "callback_query"]
}
EOF
)
fi

# Set webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

echo ""
echo "📡 Response from Telegram:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Check current webhook info
echo ""
echo "📋 Current Webhook Info:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq . 2>/dev/null || \
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
