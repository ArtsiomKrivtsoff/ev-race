-- Migration 003: generate_slug
-- Transliteration for URL slug. Immutable after first insert (§1.5) — manual edit in Studio only.

CREATE OR REPLACE FUNCTION generate_slug(
  p_city text,
  p_address text
) RETURNS text AS $$
DECLARE
  v_result text;
BEGIN
  v_result := lower(trim(coalesce(p_city, '') || '-' || coalesce(p_address, '')));

  -- two-char replacements first
  v_result := replace(v_result, 'ж', 'zh');
  v_result := replace(v_result, 'ч', 'ch');
  v_result := replace(v_result, 'ш', 'sh');
  v_result := replace(v_result, 'щ', 'sch');
  v_result := replace(v_result, 'ю', 'yu');
  v_result := replace(v_result, 'я', 'ya');
  v_result := replace(v_result, 'ё', 'yo');

  -- single-char via translate
  v_result := translate(
    v_result,
    'абвгдезийклмнопрстуфхцъыьэ',
    'abvgdeziyklmnoprstufhc_y_e'
  );

  -- cleanup
  v_result := regexp_replace(v_result, '[^a-z0-9-]', '-', 'g');
  v_result := regexp_replace(v_result, '-+', '-', 'g');
  v_result := trim(both '-' from v_result);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- URL path segment for ANY owner name (Cyrillic → latin), e.g. ЭлектроРумОСП → elektrorumosp
CREATE OR REPLACE FUNCTION generate_operator_slug(p_operator text)
RETURNS text AS $$
BEGIN
  RETURN generate_slug('', coalesce(p_operator, ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
