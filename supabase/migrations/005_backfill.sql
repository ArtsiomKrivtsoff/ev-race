-- Migration 005: backfill locations from existing stations
-- Uses upsert_location_from_station() — same slug collision logic as live trigger.
-- Wrapped in explicit transaction: all-or-nothing if migration is interrupted.

BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (generate_location_key(operator, city, address))
      id,
      operator,
      city,
      address,
      location_name,
      lat,
      lng
    FROM stations
    ORDER BY generate_location_key(operator, city, address), id
  LOOP
    PERFORM upsert_location_from_station(
      r.id,
      r.operator,
      r.city,
      r.address,
      r.location_name,
      r.lat,
      r.lng
    );
  END LOOP;
END;
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-backfill validation (run manually; expected results in comments)
-- ---------------------------------------------------------------------------

-- A. Coverage: all stations with operator + city + address
-- SELECT count(*) AS locations_count FROM locations;
-- SELECT count(DISTINCT generate_location_key(operator, city, address)) AS expected_count
-- FROM stations
-- WHERE operator IS NOT NULL AND trim(operator) <> ''
--   AND city IS NOT NULL AND trim(city) <> ''
--   AND address IS NOT NULL AND trim(address) <> '';
-- → counts must match

-- B. Skipped rows for manual review
-- SELECT reason, count(*) FROM location_sync_skipped GROUP BY reason ORDER BY count DESC;

-- C. No duplicate location_key
-- SELECT location_key, count(*) FROM locations GROUP BY location_key HAVING count(*) > 1;

-- D. No duplicate (operator, slug)
-- SELECT operator, slug, count(*) FROM locations GROUP BY operator, slug HAVING count(*) > 1;
