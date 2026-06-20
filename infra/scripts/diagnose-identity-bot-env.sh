#!/usr/bin/env bash
# Print which Telegram bot is wired into edge runtime (no token output).
set -euo pipefail

DOCKER_ENV="/opt/supabase/docker/.env"
IDENTITY_ENV="/root/evrace-secrets/identity.env"

echo "==> identity.env: $(sudo test -f "$IDENTITY_ENV" && echo present || echo MISSING)"

TOKEN="$(sudo grep -m1 '^TELEGRAM_AUTH_BOT_TOKEN=' "$DOCKER_ENV" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
if [[ -z "$TOKEN" ]]; then
  echo "==> docker .env: TELEGRAM_AUTH_BOT_TOKEN missing"
  exit 1
fi

echo "==> docker .env: TELEGRAM_AUTH_BOT_TOKEN present (len=${#TOKEN})"
ME="$(curl -sf "https://api.telegram.org/bot${TOKEN}/getMe" || true)"
BOT="$(echo "$ME" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p')"
if [[ "$BOT" == "evrace_auth_bot" ]]; then
  echo "==> wired bot: @$BOT (OK)"
else
  echo "==> wired bot: @${BOT:-unknown} (WRONG — need @evrace_auth_bot)"
  exit 2
fi
