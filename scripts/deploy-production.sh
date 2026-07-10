#!/usr/bin/env bash
# =============================================================
# Production deploy script - Email Platform
# Safe defaults for extension usage without manual extension ID.
# =============================================================

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/email-platform}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
DOMAIN="${DOMAIN:-manhquy.id.vn}"
ACME_EMAIL="${ACME_EMAIL:-admin@${DOMAIN}}"
API_HOST="${API_HOST:-api.${DOMAIN}}"
WEB_HOST="${WEB_HOST:-app.${DOMAIN}}"
ENV_FILE="${ENV_FILE:-services/api/.env}"
BUILD_EXTENSION_ZIP="${BUILD_EXTENSION_ZIP:-false}"

upsert_env() {
  local key="$1"
  local value="$2"
  local escaped
  escaped="$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')"

  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$ENV_FILE"
  else
    printf "%s=%s\n" "$key" "$value" >> "$ENV_FILE"
  fi
}

wait_for_url() {
  local url="$1"
  local max_attempts="${2:-30}"
  local sleep_seconds="${3:-3}"
  local attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    echo "⏳ Waiting for ${url} (${attempt}/${max_attempts})..."
    sleep "$sleep_seconds"
    attempt=$((attempt + 1))
  done

  return 1
}

echo "🚀 Starting production deployment"
echo "📁 Project: ${PROJECT_DIR}"
echo "🌍 Domain: ${DOMAIN}"
echo "📧 ACME Email: ${ACME_EMAIL}"

cd "$PROJECT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Missing ${ENV_FILE}. Create it from services/api/.env.example or .env.production.template first."
  exit 1
fi

echo "🔐 Enforcing extension-ready CORS defaults in ${ENV_FILE}"
upsert_env "CORS_ALLOW_EXTENSION_ORIGINS" "true"
upsert_env "CORS_REQUIRE_EXTENSION_WHITELIST" "false"
if [ -n "${CORS_ALLOWED_EXTENSIONS:-}" ]; then
  upsert_env "CORS_ALLOWED_EXTENSIONS" "${CORS_ALLOWED_EXTENSIONS}"
else
  upsert_env "CORS_ALLOWED_EXTENSIONS" ""
fi

echo "📬 Enforcing extension-friendly ephemeral inbox rate limit defaults"
upsert_env "EPHEMERAL_CREATE_RATE_LIMIT_MAX" "${EPHEMERAL_CREATE_RATE_LIMIT_MAX:-30}"
upsert_env "EPHEMERAL_CREATE_RATE_LIMIT_WINDOW" "\"${EPHEMERAL_CREATE_RATE_LIMIT_WINDOW:-1 hour}\""

echo "📥 Pulling latest code"
git pull --ff-only "$GIT_REMOTE" "$DEPLOY_BRANCH"

echo "🐳 Building and starting production stack"
DOMAIN="$DOMAIN" ACME_EMAIL="$ACME_EMAIL" docker compose -f docker-compose.prod.yml up -d --build

echo "🗄️ Running database migrations"
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

echo "📊 Service status"
docker compose -f docker-compose.prod.yml ps

echo "🔍 Health checks"
wait_for_url "https://${API_HOST}/health" 30 3 || {
  echo "❌ API health check failed: https://${API_HOST}/health"
  docker compose -f docker-compose.prod.yml logs --tail 150 api
  exit 1
}
wait_for_url "https://${WEB_HOST}" 30 3 || {
  echo "❌ Web health check failed: https://${WEB_HOST}"
  docker compose -f docker-compose.prod.yml logs --tail 150 web
  exit 1
}

if [ "$BUILD_EXTENSION_ZIP" = "true" ]; then
  echo "📦 Building extension ZIP artifact"
  (
    cd services/extension
    npm ci
    npm run zip
  )
fi

echo "✅ Deploy complete"
echo "🔗 Web: https://${WEB_HOST}"
echo "🔗 API: https://${API_HOST}"
echo "🧩 Extension CORS: allow by default (no manual ID required)"
