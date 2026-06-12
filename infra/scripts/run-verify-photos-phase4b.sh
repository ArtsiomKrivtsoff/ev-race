#!/bin/bash
# Run Phase 4B verification on BY VPS
set -euo pipefail

load_kv() {
  local file="$1" key="$2"
  sudo grep -m1 "^${key}=" "$file" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true
}

export SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:8000}"
export ANON_KEY="$(load_kv /root/evrace-secrets/supabase.env ANON_KEY)"
export SERVICE_ROLE_KEY="$(load_kv /root/evrace-secrets/supabase.env SERVICE_ROLE_KEY)"
export PHOTOS_FINGERPRINT_SALT="$(load_kv /root/evrace-secrets/photos.env PHOTOS_FINGERPRINT_SALT)"

PROC="/opt/evrace/photo-processor"
sudo cp /opt/evrace/scripts/verify-photos-phase4b.mjs "$PROC/verify-photos-phase4b.mjs"
cd "$PROC"
node verify-photos-phase4b.mjs
sudo rm -f "$PROC/verify-photos-phase4b.mjs"
