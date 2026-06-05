-- Migration 002: generate_location_key
-- Canonical identity: operator|city|address
-- Hygiene only (NOT address canonicalization): lower + trim + collapse \s+
-- NOTE: legacy JS locationKey() in stations.js is NOT canonical; do not mirror coords-based keys.
-- Raw city/address stored in locations unchanged; slug uses generate_slug() on raw values.

CREATE OR REPLACE FUNCTION normalize_identity_part(p text)
RETURNS text AS $$
BEGIN
  RETURN lower(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION generate_location_key(
  p_operator text,
  p_city text,
  p_address text
) RETURNS text AS $$
BEGIN
  RETURN normalize_identity_part(p_operator) || '|' ||
         normalize_identity_part(p_city) || '|' ||
         normalize_identity_part(p_address);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
