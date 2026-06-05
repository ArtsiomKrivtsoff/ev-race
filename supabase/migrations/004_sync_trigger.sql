-- Migration 004: sync_location_from_station trigger + skip log
-- Identity fields (operator, city, address, slug, operator_slug) NOT auto-updated on station UPDATE (§1.5).
-- Nationwide: ALL real owners sync to locations. No operator whitelist.
-- Skip + log ONLY when identity fields missing (null/empty operator, city, or address).

-- ---------------------------------------------------------------------------
-- Audit: stations that cannot produce a location (manual review queue)
-- ---------------------------------------------------------------------------
CREATE TABLE location_sync_skipped (
  id bigserial PRIMARY KEY,
  station_id bigint,
  operator text,
  city text,
  address text,
  reason text NOT NULL CHECK (reason IN (
    'missing_operator',
    'missing_city_or_address'
  )),
  created_at timestamptz DEFAULT now(),

  CONSTRAINT location_sync_skipped_station_reason_unique UNIQUE (station_id, reason)
);

CREATE INDEX idx_location_sync_skipped_created ON location_sync_skipped (created_at DESC);
CREATE INDEX idx_location_sync_skipped_reason ON location_sync_skipped (reason);

COMMENT ON TABLE location_sync_skipped IS
  'Stations missing required identity fields. Fix in Studio; re-sync manually if needed.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION allocate_location_slug(p_operator_slug text, p_slug_base text)
RETURNS text AS $$
DECLARE
  v_slug text;
  v_base text;
  v_counter int := 0;
BEGIN
  v_base := coalesce(nullif(trim(p_slug_base), ''), coalesce(nullif(trim(p_operator_slug), ''), 'location'));
  v_slug := v_base;

  WHILE EXISTS (
    SELECT 1 FROM locations
    WHERE operator_slug = p_operator_slug AND slug = v_slug
  ) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base || '-' || v_counter;
  END LOOP;

  RETURN v_slug;
END;
$$ LANGUAGE plpgsql;

-- Shared upsert logic: used by trigger and backfill (005)
-- lat/lng must match stations column type (double precision), not numeric
CREATE OR REPLACE FUNCTION upsert_location_from_station(
  p_station_id bigint,
  p_operator text,
  p_city text,
  p_address text,
  p_location_name text,
  p_lat double precision,
  p_lng double precision
) RETURNS void AS $$
DECLARE
  v_loc_key text;
  v_loc_id bigint;
  v_operator_slug text;
  v_slug_base text;
  v_slug text;
BEGIN
  IF p_operator IS NULL OR trim(p_operator) = '' THEN
    INSERT INTO location_sync_skipped (station_id, operator, city, address, reason)
    VALUES (p_station_id, p_operator, p_city, p_address, 'missing_operator')
    ON CONFLICT (station_id, reason) DO NOTHING;
    RETURN;
  END IF;

  IF p_city IS NULL OR trim(p_city) = '' OR p_address IS NULL OR trim(p_address) = '' THEN
    INSERT INTO location_sync_skipped (station_id, operator, city, address, reason)
    VALUES (p_station_id, p_operator, p_city, p_address, 'missing_city_or_address')
    ON CONFLICT (station_id, reason) DO NOTHING;
    RETURN;
  END IF;

  v_loc_key := generate_location_key(p_operator, p_city, p_address);
  v_operator_slug := generate_operator_slug(p_operator);

  IF coalesce(v_operator_slug, '') = '' THEN
    v_operator_slug := 'owner-' || p_station_id::text;
  END IF;

  SELECT id INTO v_loc_id FROM locations WHERE location_key = v_loc_key;

  IF v_loc_id IS NULL THEN
    v_slug_base := generate_slug(p_city, p_address);
    v_slug := allocate_location_slug(v_operator_slug, v_slug_base);

    INSERT INTO locations (
      location_key, operator, operator_slug, city, address,
      location_name, lat, lng, slug
    ) VALUES (
      v_loc_key, p_operator, v_operator_slug, p_city, p_address,
      p_location_name, p_lat, p_lng, v_slug
    );
  ELSE
    UPDATE locations SET
      location_name = coalesce(p_location_name, locations.location_name),
      lat = coalesce(p_lat, locations.lat),
      lng = coalesce(p_lng, locations.lng),
      updated_at = now()
    WHERE id = v_loc_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_location_from_station()
RETURNS trigger AS $$
BEGIN
  PERFORM upsert_location_from_station(
    NEW.id,
    NEW.operator,
    NEW.city,
    NEW.address,
    NEW.location_name,
    NEW.lat,
    NEW.lng
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stations_sync_location
AFTER INSERT OR UPDATE OF location_name, lat, lng
ON stations
FOR EACH ROW
EXECUTE FUNCTION sync_location_from_station();
