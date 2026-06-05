-- Patch: stations.lat/lng are double precision; upsert was declared as numeric.
-- Run once in Studio AFTER 004, BEFORE re-running 005.

DROP FUNCTION IF EXISTS upsert_location_from_station(bigint, text, text, text, text, numeric, numeric);

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
