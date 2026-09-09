-- Migration: 20260909000004_linter_and_security_hardening.sql
-- Description: Resolves all Supabase Database Linter warnings:
-- 1. Sets immutable search_path on all functions (fixes function_search_path_mutable)
-- 2. Removes duplicate and broad listing policies on public buckets (fixes public_bucket_allows_listing)
-- 3. Restricts EXECUTE permissions on SECURITY DEFINER functions (fixes anon_security_definer_function_executable)

-- ==============================================================================
-- 1. FIX FUNCTION SEARCH_PATH (MUTABLE SEARCH PATH WARNINGS)
-- ==============================================================================

alter function public.check_folder_cycle(uuid, uuid) set search_path = public, pg_temp;
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.get_folder_subtree(uuid) set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.protect_profile_privileged_fields() set search_path = public, pg_temp;
alter function public.rls_auto_enable() set search_path = public, pg_temp;
alter function public.delete_user_account() set search_path = public, pg_temp;
alter function public.get_email_by_username(text, text) set search_path = public, pg_temp;
alter function public.is_send_recipient(uuid, uuid) set search_path = public, pg_temp;
alter function public.is_send_sender(uuid, uuid) set search_path = public, pg_temp;
alter function public.accept_friend_suggestion(uuid, uuid, uuid, text) set search_path = public, pg_temp;
alter function public.admin_get_users() set search_path = public, pg_temp;
alter function public.admin_toggle_user_role(uuid, boolean) set search_path = public, pg_temp;
alter function public.admin_toggle_user_status(uuid, text) set search_path = public, pg_temp;
alter function public.admin_delete_user(uuid) set search_path = public, pg_temp;
alter function public.send_link_to_recipients(text, text, uuid[], uuid, text, text) set search_path = public, pg_temp;

-- ==============================================================================
-- 2. STORAGE BUCKET LISTING POLICIES (FIXES public_bucket_allows_listing)
-- Public buckets serve objects directly via URL without needing storage.objects SELECT.
-- Restrict SELECT to authenticated users listing only their own subfolder.
-- ==============================================================================

-- Clean up duplicate / broad SELECT policies on storage.objects
drop policy if exists "Public thumbnails read" on storage.objects;
drop policy if exists "Thumbnails are publicly readable" on storage.objects;
drop policy if exists "Public avatars read" on storage.objects;
drop policy if exists "Avatars are publicly readable" on storage.objects;
drop policy if exists "Users can list own thumbnails" on storage.objects;
drop policy if exists "Users can list own avatars" on storage.objects;

-- Only authenticated users can list objects in their own folder
create policy "Users can list own thumbnails"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'thumbnails' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can list own avatars"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ==============================================================================
-- 3. FUNCTION EXECUTION RESTRICTIONS (FIXES anon_security_definer_function_executable)
-- ==============================================================================

-- Trigger functions should never be callable by client RPC
revoke execute on function public.handle_new_user() from public, anon;
revoke execute on function public.protect_profile_privileged_fields() from public, anon;
revoke execute on function public.rls_auto_enable() from public, anon;

-- Admin RPCs should never be callable by anonymous users
revoke execute on function public.admin_delete_user(uuid) from public, anon;
revoke execute on function public.admin_get_users() from public, anon;
revoke execute on function public.admin_toggle_user_role(uuid, boolean) from public, anon;
revoke execute on function public.admin_toggle_user_status(uuid, text) from public, anon;

-- User RPCs should be restricted to authenticated users
revoke execute on function public.accept_friend_suggestion(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.accept_friend_suggestion(uuid, uuid, uuid, text) to authenticated;

revoke execute on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;

revoke execute on function public.is_send_recipient(uuid, uuid) from public, anon;
grant execute on function public.is_send_recipient(uuid, uuid) to authenticated;

revoke execute on function public.is_send_sender(uuid, uuid) from public, anon;
grant execute on function public.is_send_sender(uuid, uuid) to authenticated;

revoke execute on function public.send_link_to_recipients(text, text, uuid[], uuid, text, text) from public, anon;
grant execute on function public.send_link_to_recipients(text, text, uuid[], uuid, text, text) to authenticated;
