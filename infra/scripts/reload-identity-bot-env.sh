#!/usr/bin/env bash
# Reload TELEGRAM_AUTH_BOT_TOKEN from identity.env into Supabase edge runtime.
# Run on BY VPS as deploy (or via Upload-Identity-Env.ps1).
set -euo pipefail

IDENTITY_ENV="/root/evrace-secrets/identity.env"
SUPABASE_DIR="/opt/supabase/docker"
EXPECTED_BOT="evrace_auth_bot"

if ! sudo test -f "$IDENTITY_ENV"; then
  echo "ERROR: missing $IDENTITY_ENV" >&2
  echo "Create it with TELEGRAM_AUTH_BOT_TOKEN=... for @$EXPECTED_BOT" >&2
  exit 1
fi

TOKEN="$(sudo grep -m1 '^TELEGRAM_AUTH_BOT_TOKEN=' "$IDENTITY_ENV" | cut -d= -f2- | tr -d '\r')"
if [[ -z "$TOKEN" ]]; then
  echo "ERROR: TELEGRAM_AUTH_BOT_TOKEN empty in $IDENTITY_ENV" >&2
  exit 1
fi

BOT_USERNAME="$(curl -sf "https://api.telegram.org/bot${TOKEN}/getMe" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p' || true)"
if [[ "$BOT_USERNAME" != "$EXPECTED_BOT" ]]; then
  echo "ERROR: token is for @${BOT_USERNAME:-unknown}, expected @$EXPECTED_BOT" >&2
  echo "Do NOT use telegram.env (letters bot). Use evrace_auth_bot token only." >&2
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

echo "==> Token OK: @$BOT_USERNAME"
upsert_env "TELEGRAM_AUTH_BOT_TOKEN" "$TOKEN"

cd "$SUPABASE_DIR"
sudo docker compose \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f docker-compose.photos.override.yml \
  up -d functions

sleep 3
echo "==> Edge functions restarted with @$EXPECTED_BOT token"
