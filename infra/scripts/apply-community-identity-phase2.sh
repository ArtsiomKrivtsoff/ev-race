#!/usr/bin/env bash
# Apply Community Identity migrations 008+009 + deploy Edge Functions (V1 random user_hash)
# Run on VPS as deploy after syncing repo
# Spec: docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md
set -euo pipefail

REPO_ROOT="${1:-/tmp/evrace-community-identity}"
MIGRATION_008="${REPO_ROOT}/infra/by-migrations/008_user_sessions.sql"
MIGRATION_009="${REPO_ROOT}/infra/by-migrations/009_user_hash_random.sql"
SUPABASE_DIR="/opt/supabase/docker"
FUNCTIONS_VOL="$SUPABASE_DIR/volumes/functions"
SUPABASE_ENV="/root/evrace-secrets/supabase.env"
IDENTITY_ENV="/root/evrace-secrets/identity.env"

IDENTITY_FUNCS=(
  telegram-auth
  community-identity-create
  community-identity-me
  community-identity-profile
)

for f in "$MIGRATION_008" "$MIGRATION_009"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: migration not found: $f" >&2
    exit 1
  fi
done

if ! sudo test -f "$SUPABASE_ENV"; then
  echo "ERROR: missing $SUPABASE_ENV" >&2
  exit 1
fi

run_psql_file() {
  sudo docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$1"
}

echo "==> Applying 008_user_sessions.sql (idempotent)"
run_psql_file "$MIGRATION_008"

echo "==> Applying 009_user_hash_random.sql (V1 user_hash model)"
run_psql_file "$MIGRATION_009"

echo "==> SQL smoke verification"
"${REPO_ROOT}/infra/scripts/run-verify-community-identity-phase2.sh"

TELEGRAM_AUTH_BOT_TOKEN=""
if sudo test -f "$IDENTITY_ENV" 2>/dev/null; then
  TELEGRAM_AUTH_BOT_TOKEN="$(sudo grep -m1 '^TELEGRAM_AUTH_BOT_TOKEN=' "$IDENTITY_ENV" | cut -d= -f2- | tr -d '\r' || true)"
fi

if [[ -z "$TELEGRAM_AUTH_BOT_TOKEN" ]]; then
  echo "ERROR: TELEGRAM_AUTH_BOT_TOKEN missing in $IDENTITY_ENV" >&2
  echo "Create identity.env with token for @evrace_auth_bot (NOT telegram.env letters bot)." >&2
  exit 1
fi

BOT_USERNAME="$(curl -sf "https://api.telegram.org/bot${TELEGRAM_AUTH_BOT_TOKEN}/getMe" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p' || true)"
if [[ "$BOT_USERNAME" != "evrace_auth_bot" ]]; then
  echo "ERROR: identity.env token is @${BOT_USERNAME:-unknown}, expected @evrace_auth_bot" >&2
  exit 1
fi

upsert_env() {
  local key="$1"
  local val="$2"
  local file="$SUPABASE_DIR/.env"
  if sudo grep -q "^${key}=" "$file" 2>/dev/null; then
    sudo sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" | sudo tee -a "$file" > /dev/null
  fi
}

remove_env_key() {
  local key="$1"
  local file="$SUPABASE_DIR/.env"
  if sudo grep -q "^${key}=" "$file" 2>/dev/null; then
    sudo sed -i "/^${key}=/d" "$file"
  fi
}

echo "==> Patching Supabase edge env"
upsert_env "TELEGRAM_AUTH_BOT_TOKEN" "$TELEGRAM_AUTH_BOT_TOKEN"
remove_env_key "USER_HASH_SALT"

echo "==> Installing Identity Edge Functions (V1 model)"
sudo mkdir -p "$FUNCTIONS_VOL/_shared"
for fn in "${IDENTITY_FUNCS[@]}"; do
  sudo mkdir -p "$FUNCTIONS_VOL/$fn"
done

sudo cp -r "$REPO_ROOT/infra/by-functions/_shared/"* "$FUNCTIONS_VOL/_shared/"
for fn in "${IDENTITY_FUNCS[@]}"; do
  sudo cp "$REPO_ROOT/infra/by-functions/$fn/index.ts" "$FUNCTIONS_VOL/$fn/"
  sudo cp "$REPO_ROOT/infra/by-functions/$fn/deno.json" "$FUNCTIONS_VOL/$fn/"
done
sudo chown -R deploy:deploy "$FUNCTIONS_VOL"

sudo cp "$REPO_ROOT/infra/docker-compose.photos.override.yml" "$SUPABASE_DIR/docker-compose.photos.override.yml"

cd "$SUPABASE_DIR"
sudo docker compose \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f docker-compose.photos.override.yml \
  up -d functions

sleep 4

echo "==> HTTP smoke"
ANON_KEY="$(sudo grep '^ANON_KEY=' "$SUPABASE_ENV" | cut -d= -f2-)"
me_code="$(curl -sf -o /dev/null -w '%{http_code}' \
  -X GET "http://127.0.0.1:8000/functions/v1/community-identity-me" \
  -H "Authorization: Bearer ${ANON_KEY}" 2>/dev/null || echo 000)"
auth_code="$(curl -sf -o /dev/null -w '%{http_code}' \
  -X POST "http://127.0.0.1:8000/functions/v1/telegram-auth" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo 000)"
echo "  community-identity-me: HTTP ${me_code} (expect 401)"
echo "  telegram-auth: HTTP ${auth_code} (expect 400/401, not 500)"

echo "==> Community Identity V1 model deploy OK"
