-- Fix: RPC via PostgREST may run without extensions in search_path
ALTER FUNCTION community_generate_user_hash() SET search_path = public, extensions;
ALTER FUNCTION community_identity_create_full(bigint, text) SET search_path = public, extensions;

-- Qualify gen_random_bytes explicitly in generator (belt + suspenders)
CREATE OR REPLACE FUNCTION community_generate_user_hash()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions
AS $$
DECLARE
  candidate text;
  attempt int;
BEGIN
  FOR attempt IN 1..10 LOOP
    candidate := encode(extensions.gen_random_bytes(32), 'hex');
    IF NOT EXISTS (
      SELECT 1 FROM community_identities WHERE user_hash = candidate
    ) THEN
      RETURN candidate;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'user_hash_generation_failed' USING ERRCODE = 'P0001';
END;
$$;
