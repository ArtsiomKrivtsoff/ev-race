-- BY Community Identity — M9: random user_hash (V1 model correction)
-- Spec: docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md
-- Replaces: salt-derived user_hash from Stage 2 legacy port
-- Apply: BY production after 007 + 008

-- ── Rollback (manual, destructive) ──
-- Cannot restore salt-derived hashes; rollback = restore from backup only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Random user_hash generator ──

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

COMMENT ON FUNCTION community_generate_user_hash() IS
  'Random 256-bit user_hash (hex). Generated once at Identity create. NOT derived from Telegram.';

COMMENT ON COLUMN community_identities.user_hash IS
  'Random internal key (64 hex). Created at Identity create. NOT SHA256(telegram_id:salt).';

-- ── Sessions: Guest = telegram only, Verified = telegram + user_hash ──

TRUNCATE user_sessions;

ALTER TABLE user_sessions
  ALTER COLUMN user_hash DROP NOT NULL;

ALTER TABLE user_sessions
  ALTER COLUMN telegram_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_telegram_user_id
  ON user_sessions (telegram_user_id);

COMMENT ON COLUMN user_sessions.user_hash IS
  'NULL for Guest TG session; set after Identity create (random hash from community_identities).';
COMMENT ON COLUMN user_sessions.telegram_user_id IS
  'Telegram Login Widget id; session anchor before and after Identity create.';

-- ── Create RPC: random user_hash server-side ──

DROP FUNCTION IF EXISTS community_identity_create_full(text, bigint, text);

CREATE OR REPLACE FUNCTION community_identity_create_full(
  p_telegram_user_id bigint,
  p_pseudonym text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_evr_id text;
  v_user_hash text;
  v_identity_id bigint;
  v_member_since date := CURRENT_DATE;
  v_now timestamptz := now();
  v_pseudo text;
  v_set_count smallint := 0;
BEGIN
  IF p_telegram_user_id IS NULL OR p_telegram_user_id <= 0 THEN
    RAISE EXCEPTION 'invalid_telegram_user_id' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM community_identity_telegram
    WHERE telegram_user_id = p_telegram_user_id AND unlinked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'identity_exists' USING ERRCODE = 'P0001';
  END IF;

  v_pseudo := NULLIF(trim(COALESCE(p_pseudonym, '')), '');
  IF v_pseudo IS NOT NULL AND (
    char_length(v_pseudo) < 2 OR char_length(v_pseudo) > 32
    OR v_pseudo !~ '^[A-Za-z0-9_-]+$'
  ) THEN
    RAISE EXCEPTION 'invalid_pseudonym' USING ERRCODE = 'P0001';
  END IF;

  v_user_hash := community_generate_user_hash();
  v_evr_id := community_generate_unique_evr_id();

  INSERT INTO community_identities (evr_id, user_hash)
  VALUES (v_evr_id, v_user_hash)
  RETURNING id INTO v_identity_id;

  IF v_pseudo IS NOT NULL THEN
    v_set_count := 1;
    INSERT INTO community_identity_profile (
      identity_id, pseudonym, pseudonym_changed_at, member_since, pseudonym_set_count
    ) VALUES (v_identity_id, v_pseudo, v_now, v_member_since, v_set_count);
  ELSE
    INSERT INTO community_identity_profile (identity_id, member_since, pseudonym_set_count)
    VALUES (v_identity_id, v_member_since, 0);
  END IF;

  INSERT INTO community_identity_telegram (identity_id, telegram_user_id)
  VALUES (v_identity_id, p_telegram_user_id);

  RETURN jsonb_build_object(
    'identity_id', v_identity_id,
    'evr_id', v_evr_id,
    'user_hash', v_user_hash,
    'member_since', v_member_since::text,
    'pseudonym', v_pseudo
  );
END;
$$;

COMMENT ON FUNCTION community_identity_create_full(bigint, text) IS
  'Atomic Guest→Verified. Random user_hash at create. TG uniqueness via community_identity_telegram only.';
