-- Post-validation — run in Supabase Studio AFTER applying 001–005
--
-- EXPECTED OUTPUT SUMMARY
-- -----------------------
-- DoD A  → 1 row; locations_count MUST EQUAL expected_count
-- DoD B  → informational only (review skipped rows; NOT required to be 0)
-- DoD C  → 0 rows  (PASS)
-- DoD D  → 0 rows  (PASS)
-- DoD E  → 0 rows  (PASS)
-- DoD F  → shortlist for manual QA (rows allowed — NOT a pass/fail gate)
-- DoD G  → random sample for manual QA (rows allowed — NOT a pass/fail gate)
-- GATE   → dod_c_failures, dod_d_failures, dod_e_failures MUST ALL BE 0

-- =============================================================================
-- DoD A: coverage
-- EXPECTED: 1 row returned; locations_count = expected_count (same number)
-- =============================================================================
SELECT
  (SELECT count(*) FROM locations) AS locations_count,
  (SELECT count(DISTINCT generate_location_key(operator, city, address))
   FROM stations
   WHERE operator IS NOT NULL AND trim(operator) <> ''
     AND city IS NOT NULL AND trim(city) <> ''
     AND address IS NOT NULL AND trim(address) <> '') AS expected_count;

-- PASS if: locations_count = expected_count

-- =============================================================================
-- DoD B: skipped queue (informational — manual review)
-- EXPECTED: any row count; inspect reasons; fix data in Studio later if needed
-- =============================================================================
SELECT reason, count(*) AS cnt
FROM location_sync_skipped
GROUP BY reason
ORDER BY cnt DESC;

SELECT *
FROM location_sync_skipped
ORDER BY created_at DESC
LIMIT 50;

-- NOT a 0-row gate. missing_operator / missing_city_or_address rows need Studio fix.

-- =============================================================================
-- DoD C: impossible NULL states
-- EXPECTED: 0 rows
-- =============================================================================
SELECT *
FROM locations
WHERE slug IS NULL
   OR operator IS NULL
   OR operator_slug IS NULL
   OR location_key IS NULL;

-- PASS if: 0 rows

-- =============================================================================
-- DoD D: duplicate location_key
-- EXPECTED: 0 rows
-- =============================================================================
SELECT location_key, count(*)
FROM locations
GROUP BY location_key
HAVING count(*) > 1;

-- PASS if: 0 rows

-- =============================================================================
-- DoD E: duplicate (operator, slug)
-- EXPECTED: 0 rows
-- =============================================================================
SELECT operator, slug, count(*)
FROM locations
GROUP BY operator, slug
HAVING count(*) > 1;

-- PASS if: 0 rows

-- =============================================================================
-- DoD F: slug shortlist — manual QA only
-- EXPECTED: rows allowed (fallback slugs, short slugs — review by author)
-- =============================================================================
SELECT
  id,
  operator,
  operator_slug,
  city,
  address,
  slug,
  location_key,
  created_at
FROM locations
WHERE slug ~ '-location(-[0-9]+)?$'
   OR length(slug) <= 3
   OR slug ~ '^[0-9-]+$'
ORDER BY operator, city, address;

-- NOT a 0-row gate. Review slugs manually; empty result is also fine.

-- =============================================================================
-- DoD G: random sample — manual QA only
-- EXPECTED: 25 rows (or fewer if locations < 25); spot-check operator/city/slug
-- =============================================================================
SELECT operator, operator_slug, city, address, slug
FROM locations
ORDER BY random()
LIMIT 25;

-- NOT a 0-row gate.

-- =============================================================================
-- PASS GATE — automated integrity (run last)
-- EXPECTED: dod_c_failures = 0 AND dod_d_failures = 0 AND dod_e_failures = 0
-- =============================================================================
SELECT
  (SELECT count(*)
   FROM locations
   WHERE slug IS NULL OR operator IS NULL OR operator_slug IS NULL OR location_key IS NULL) AS dod_c_failures,
  (SELECT count(*)
   FROM (
     SELECT location_key FROM locations GROUP BY location_key HAVING count(*) > 1
   ) t) AS dod_d_failures,
  (SELECT count(*)
   FROM (
     SELECT operator, slug FROM locations GROUP BY operator, slug HAVING count(*) > 1
   ) t) AS dod_e_failures;

-- PASS if all three columns = 0

-- =============================================================================
-- DoD H: trigger smoke (manual, one transaction, then ROLLBACK)
-- EXPECTED after INSERT: 1 location row for QA address
-- EXPECTED after soft UPDATE: location_name updated
-- EXPECTED after identity UPDATE on stations: locations.city UNCHANGED
-- =============================================================================
-- BEGIN;
-- INSERT INTO stations (operator, city, address, station_date, station_type, dc_power)
-- VALUES ('malanka', 'Минск', 'QA-TEST-ADDR-001', '2026-06-03', 'DC', 50);
-- SELECT * FROM locations WHERE address = 'QA-TEST-ADDR-001';
-- UPDATE stations SET location_name = 'QA Test Name' WHERE address = 'QA-TEST-ADDR-001';
-- SELECT location_name FROM locations WHERE address = 'QA-TEST-ADDR-001';
-- UPDATE stations SET city = 'QA-CHANGED' WHERE address = 'QA-TEST-ADDR-001';
-- SELECT city FROM locations WHERE address = 'QA-TEST-ADDR-001';  -- must stay 'Минск'
-- ROLLBACK;
