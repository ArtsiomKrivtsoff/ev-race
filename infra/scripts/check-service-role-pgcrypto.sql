SELECT rolname, rolconfig FROM pg_roles WHERE rolname IN ('postgres', 'authenticator', 'service_role', 'supabase_admin');

DO $$
BEGIN
  EXECUTE 'SET ROLE service_role';
  PERFORM community_generate_user_hash();
  RAISE NOTICE 'service_role OK';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'service_role FAIL: %', SQLERRM;
END $$;

RESET ROLE;
