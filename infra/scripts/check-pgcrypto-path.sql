SELECT n.nspname AS schema, p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'gen_random_bytes';

SHOW search_path;

SELECT proconfig
FROM pg_proc
WHERE proname = 'community_generate_user_hash';
