CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT encode(gen_random_bytes(8), 'hex') AS pgcrypto_ok;
SELECT community_generate_user_hash() AS user_hash_ok;
