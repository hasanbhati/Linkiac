-- Migration: 20260909000005_linter_trigger_cleanup.sql
-- Description: Revokes EXECUTE from authenticated for functions that signed-in users never need to invoke via RPC:
-- 1. Internal trigger functions (handle_new_user, protect_profile_privileged_fields, rls_auto_enable)
-- 2. Pre-auth login lookup (get_email_by_username)

DO $$
DECLARE
  func record;
BEGIN
  -- Revoke EXECUTE from authenticated for internal triggers and unauthenticated-only functions
  FOR func IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_new_user',
        'protect_profile_privileged_fields',
        'rls_auto_enable',
        'get_email_by_username'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated;', func.nspname, func.proname, func.args);
  END LOOP;
END $$;
