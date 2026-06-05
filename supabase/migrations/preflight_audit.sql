-- Preflight audit — run in Supabase Studio BEFORE applying 001–005
-- Nationwide platform: ALL owners with valid identity fields get locations.

-- =============================================================================
-- 1. Operator distribution (informational)
-- =============================================================================
SELECT
  operator,
  count(*) AS station_rows,
  sum(coalesce(count, 1)) AS station_units
FROM stations
GROUP BY operator
ORDER BY station_rows DESC;

-- Small / non-branded owners (informational — they WILL get locations in Stage 1)
SELECT
  operator,
  count(*) AS station_rows
FROM stations
WHERE operator IS NOT NULL
  AND operator NOT IN (
    'batteryfly', 'forevo', 'zaryadka', 'united', 'csms',
    'malanka', 'evika', 'orange', 'prizma', 'gto'
  )
GROUP BY operator
ORDER BY station_rows DESC;

-- =============================================================================
-- 2. Missing identity fields (ONLY these skip location sync)
-- =============================================================================
SELECT
  CASE
    WHEN operator IS NULL OR trim(operator) = '' THEN 'missing_operator'
    WHEN city IS NULL OR trim(city) = '' THEN 'missing_city'
    WHEN address IS NULL OR trim(address) = '' THEN 'missing_address'
    ELSE 'ok'
  END AS issue,
  count(*) AS station_rows
FROM stations
GROUP BY 1
ORDER BY station_rows DESC;

-- Expected after backfill: locations_count = station_rows where issue = 'ok'

-- =============================================================================
-- 3. Expected location count (run after 002)
-- =============================================================================
-- SELECT count(DISTINCT generate_location_key(operator, city, address))
-- FROM stations
-- WHERE operator IS NOT NULL AND trim(operator) <> ''
--   AND city IS NOT NULL AND trim(city) <> ''
--   AND address IS NOT NULL AND trim(address) <> '';

-- =============================================================================
-- 4. Slug QA — run after 003 is applied
-- =============================================================================

-- 4a. Address slugs + operator_slug preview (sample)
SELECT
  operator,
  generate_operator_slug(operator) AS operator_slug_preview,
  city,
  address,
  generate_slug(city, address) AS location_slug_preview
FROM (
  SELECT DISTINCT ON (operator, city, address)
    operator, city, address
  FROM stations
  WHERE operator IS NOT NULL AND trim(operator) <> ''
    AND city IS NOT NULL AND trim(city) <> ''
    AND address IS NOT NULL AND trim(address) <> ''
  ORDER BY operator, city, address
) s
ORDER BY random()
LIMIT 30;

-- 4b. Suspicious location slugs
SELECT
  operator,
  generate_operator_slug(operator) AS operator_slug_preview,
  city,
  address,
  generate_slug(city, address) AS slug_preview,
  CASE
    WHEN generate_slug(city, address) IS NULL OR generate_slug(city, address) = '' THEN 'empty_slug'
    WHEN length(generate_slug(city, address)) <= 3 THEN 'very_short'
    WHEN generate_slug(city, address) ~ '^[0-9-]+$' THEN 'numeric_only'
    ELSE 'ok'
  END AS flag
FROM (
  SELECT DISTINCT ON (operator, city, address)
    operator, city, address
  FROM stations
  WHERE operator IS NOT NULL AND trim(operator) <> ''
    AND city IS NOT NULL AND trim(city) <> ''
    AND address IS NOT NULL AND trim(address) <> ''
  ORDER BY operator, city, address
) s
WHERE CASE
    WHEN generate_slug(city, address) IS NULL OR generate_slug(city, address) = '' THEN true
    WHEN length(generate_slug(city, address)) <= 3 THEN true
    WHEN generate_slug(city, address) ~ '^[0-9-]+$' THEN true
    ELSE false
  END
ORDER BY flag, operator, city;

-- 4c. Empty operator_slug preview (needs fallback owner-{id} at sync time)
SELECT operator, count(*) AS station_rows
FROM stations
WHERE operator IS NOT NULL AND trim(operator) <> ''
  AND coalesce(generate_operator_slug(operator), '') = ''
GROUP BY operator;

-- 4d. Potential location slug collisions WITHIN same operator_slug
SELECT
  generate_operator_slug(operator) AS operator_slug_preview,
  generate_slug(city, address) AS slug_base,
  count(*) AS distinct_addresses,
  array_agg(DISTINCT operator || ' | ' || address ORDER BY operator || ' | ' || address) AS owners_addresses
FROM (
  SELECT DISTINCT ON (operator, city, address)
    operator, city, address
  FROM stations
  WHERE operator IS NOT NULL AND trim(operator) <> ''
    AND city IS NOT NULL AND trim(city) <> ''
    AND address IS NOT NULL AND trim(address) <> ''
  ORDER BY operator, city, address
) s
GROUP BY generate_operator_slug(operator), generate_slug(city, address)
HAVING count(*) > 1
ORDER BY distinct_addresses DESC;

-- 4e. Same coords, different owners (intentional — separate locations)
SELECT
  round(lat::numeric, 5) AS lat_r,
  round(lng::numeric, 5) AS lng_r,
  count(DISTINCT operator) AS operators_at_point,
  array_agg(DISTINCT operator ORDER BY operator) AS operators
FROM stations
WHERE lat IS NOT NULL AND lng IS NOT NULL
  AND operator IS NOT NULL AND trim(operator) <> ''
GROUP BY round(lat::numeric, 5), round(lng::numeric, 5)
HAVING count(DISTINCT operator) > 1
ORDER BY operators_at_point DESC
LIMIT 50;

-- =============================================================================
-- 5. Double-space duplicates (run after 002)
-- =============================================================================
WITH normalized AS (
  SELECT
    id,
    operator,
    city,
    address,
    normalize_identity_part(operator) AS n_op,
    normalize_identity_part(city) AS n_city,
    normalize_identity_part(address) AS n_addr,
    generate_location_key(operator, city, address) AS key_current
  FROM stations
  WHERE operator IS NOT NULL AND trim(operator) <> ''
    AND city IS NOT NULL AND trim(city) <> ''
    AND address IS NOT NULL AND trim(address) <> ''
)
SELECT
  n_op,
  n_city,
  n_addr,
  count(*) AS station_rows,
  count(DISTINCT key_current) AS distinct_keys_current,
  array_agg(DISTINCT address ORDER BY address) AS raw_addresses
FROM normalized
GROUP BY n_op, n_city, n_addr
HAVING count(DISTINCT key_current) > 1
ORDER BY station_rows DESC
LIMIT 30;
