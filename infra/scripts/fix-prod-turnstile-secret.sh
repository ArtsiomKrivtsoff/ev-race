#!/bin/bash
set -euo pipefail
ENV_FILE="/opt/supabase/docker/.env"
CORRECT="0x4AAAAAACtvG1NiGomWUrk5So9rrTxsLAw"
sudo sed -i "s|^TURNSTILE_SECRET_KEY=.*|TURNSTILE_SECRET_KEY=${CORRECT}|" "$ENV_FILE"
VAL="$(sudo grep -m1 '^TURNSTILE_SECRET_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')"
echo "TURNSTILE_SECRET_KEY length: ${#VAL}"
if [ "${#VAL}" -ne 35 ]; then
  echo "ERROR: expected 35-char Turnstile secret" >&2
  exit 1
fi
cd /opt/supabase/docker
sudo docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.photos.override.yml up -d --force-recreate functions
echo "OK: functions restarted"
