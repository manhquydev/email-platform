#!/bin/bash

# Deployment Script for Email Platform (Production)
# Usage: ./scripts/deploy.sh

set -e # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting deployment process..."

# 1. Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin main

# 2. Rebuild and restart containers
echo "mb Rebuilding and restarting containers..."
# Use docker-compose.prod.yml explicitly
docker compose -f docker-compose.prod.yml up -d --build

# 3. Wait for database to be ready
echo "⏳ Waiting for services to stabilize (10s)..."
sleep 10

# 4. Run Database Migrations
echo "📦 Running database migrations..."
if docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully."
else
    echo "❌ Migration failed. Attempting to resolve potential conflicts..."
    # Optional: logic to handle specific migration errors if needed
    exit 1
fi

# 5. Restart API to ensure it picks up new schema/config
echo "🔄 Restarting API service..."
docker compose -f docker-compose.prod.yml restart api

echo "✅ Deployment completed successfully!"
echo "   - Web: https://app.manhquy.click"
echo "   - API: https://api.manhquy.click"
