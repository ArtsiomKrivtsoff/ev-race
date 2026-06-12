#!/bin/bash
# Use public Supabase storage until photos.evrace.by DNS is live.
set -euo pipefail
CDN="https://api.evrace.by/storage/v1/object/public/photos-processed"
ENV_FILE="/opt/supabase/docker/.env"
PHOTOS_ENV="/root/evrace-secrets/photos.env"

upsert() {
  local file="$1"
  if sudo grep -q '^PHOTOS_CDN_BASE=' "$file" 2>/dev/null; then
    sudo sed -i "s|^PHOTOS_CDN_BASE=.*|PHOTOS_CDN_BASE=${CDN}|" "$file"
  else
    echo "PHOTOS_CDN_BASE=${CDN}" | sudo tee -a "$file" >/dev/null
  fi
}

upsert "$ENV_FILE"
if sudo test -f "$PHOTOS_ENV"; then
  upsert "$PHOTOS_ENV"
fi

cd /opt/supabase/docker
sudo docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.photos.override.yml up -d --force-recreate functions
echo "PHOTOS_CDN_BASE=${CDN}"
