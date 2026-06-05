-- Migration 001: locations
-- EVRACE Infrastructure Platform — Stage 1
-- Nationwide: ANY real owner in operator (no whitelist).
-- URL path segment: operator_slug (translit). Display/raw owner: operator.
-- Canonical location_key: operator|city|address (see 002)

CREATE TABLE locations (
  id bigserial PRIMARY KEY,
  location_key text UNIQUE NOT NULL,

  -- Real infrastructure owner from stations.operator (any name, Cyrillic OK)
  operator text NOT NULL,

  -- URL-safe owner segment: /{operator_slug}/{slug} — e.g. elektrorumosp
  operator_slug text NOT NULL,

  city text NOT NULL,
  address text NOT NULL,
  location_name text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  slug text NOT NULL,
  is_active boolean DEFAULT true,
  cached_avg_rating numeric(3, 2),
  cached_review_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- slug unique per operator_slug (URL identity), not globally
  CONSTRAINT locations_operator_slug_path_unique UNIQUE (operator_slug, slug)
);

CREATE INDEX idx_locations_operator ON locations (operator) WHERE is_active = true;
CREATE INDEX idx_locations_operator_slug ON locations (operator_slug) WHERE is_active = true;
CREATE INDEX idx_locations_city ON locations (city) WHERE is_active = true;
CREATE INDEX idx_locations_rating ON locations (cached_avg_rating DESC NULLS LAST)
  WHERE is_active = true;

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY locations_public_read ON locations
  FOR SELECT
  USING (is_active = true);
