-- Migration: 20260909000004_linter_and_security_hardening.sql
-- Description: Resolves all Supabase Database Linter warnings dynamically:
-- 1. Sets immutable search_path on all functions (fixes function_search_path_mutable)
-- 2. Removes duplicate and broad listing policies on public buckets (fixes public_bucket_allows_listing)
-- 3. Restricts EXECUTE permissions on SECURITY DEFINER functions (fixes anon_security_definer_function_executable)

-- ==============================================================================
-- 1. FIX FUNCTION SEARCH_PATH (MUTABLE SEARCH PATH WARNINGS)
-- Dynamically discovers exact parameter signatures from PostgreSQL catalog
-- ==============================================================================

DO $$
DECLARE
  func record;
BEGIN
  FOR func IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND p.proname IN (
        'check_folder_cycle',
        'update_updated_at_column',
        'get_folder_subtree',
        'handle_new_user',
        'protect_profile_privileged_fields',
        'rls_auto_enable',
        'delete_user_account',
        'get_email_by_username',
        'is_send_recipient',
        'is_send_sender',
        'accept_friend_suggestion',
        'admin_get_users',
        'admin_toggle_user_role',
        'admin_toggle_user_status',
        'admin_delete_user',
        'send_link_to_recipients'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp;', func.nspname, func.proname, func.args);
  END LOOP;
END $$;

-- ==============================================================================
-- 2. STORAGE BUCKET LISTING POLICIES (FIXES public_bucket_allows_listing)
-- Public buckets serve objects directly via URL without needing storage.objects SELECT.
-- Restrict SELECT to authenticated users listing only their own subfolder.
-- ==============================================================================

-- Clean up duplicate / broad SELECT policies on storage.objects
DROP POLICY IF EXISTS "Public thumbnails read" ON storage.objects;
DROP POLICY IF EXISTS "Thumbnails are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public avatars read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can list own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can list own avatars" ON storage.objects;

-- Only authenticated users can list objects in their own folder
CREATE POLICY "Users can list own thumbnails"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'thumbnails' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can list own avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ==============================================================================
-- 3. FUNCTION EXECUTION RESTRICTIONS (FIXES anon_security_definer_function_executable)
-- Dynamically discovers exact parameter signatures to revoke anon & grant authenticated
-- ==============================================================================

DO $$
DECLARE
  func record;
BEGIN
  -- Revoke EXECUTE from anon & public for internal triggers and admin RPCs
  FOR func IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_new_user',
        'protect_profile_privileged_fields',
        'rls_auto_enable',
        'admin_delete_user',
        'admin_get_users',
        'admin_toggle_user_role',
        'admin_toggle_user_status',
        'accept_friend_suggestion',
        'delete_user_account',
        'is_send_recipient',
        'is_send_sender',
        'send_link_to_recipients'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;', func.nspname, func.proname, func.args);
  END LOOP;

  -- Grant EXECUTE to authenticated for standard user RPCs
  FOR func IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'accept_friend_suggestion',
        'delete_user_account',
        'is_send_recipient',
        'is_send_sender',
        'send_link_to_recipients'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated;', func.nspname, func.proname, func.args);
  END LOOP;
END $$;
