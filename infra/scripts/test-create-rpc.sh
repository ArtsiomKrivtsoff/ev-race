#!/usr/bin/env bash
set -euo pipefail
KEY="$(sudo grep -m1 '^SERVICE_ROLE_KEY=' /root/evrace-secrets/supabase.env | cut -d= -f2- | tr -d '\r')"
TG=999999986
curl -sf -X POST "http://127.0.0.1:8000/rest/v1/rpc/community_identity_create_full" \
  -H "apikey: ${KEY}" \
  -H "Authorization: Bearer ${KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_telegram_user_id\": ${TG}, \"p_pseudonym\": null}"
echo
echo "RPC test OK for tg=${TG}"
