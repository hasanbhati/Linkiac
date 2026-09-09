-- ============================================================================
-- LINKIAC CONSOLIDATED PRODUCTION INFRASTRUCTURE & SECURITY PATCH
-- Migration File: 20260909000003_consolidated_production_patch.sql
-- 
-- Instructions:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard)
-- 2. Navigate to "SQL Editor" in the left sidebar
-- 3. Paste this entire script and click "Run" (green button)
-- ============================================================================

-- ============================================================================
-- 1. PROVISION SUPABASE STORAGE BUCKETS (Thumbnails & Avatars)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('thumbnails', 'thumbnails', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880;

-- Storage RLS Policies: Public read access
drop policy if exists "Public thumbnails read" on storage.objects;
create policy "Public thumbnails read"
  on storage.objects for select
  to public
  using (bucket_id = 'thumbnails');

drop policy if exists "Public avatars read" on storage.objects;
create policy "Public avatars read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Storage RLS Policies: Authenticated user write/update/delete isolated to their own folder prefix
drop policy if exists "Users upload own thumbnails" on storage.objects;
create policy "Users upload own thumbnails"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'thumbnails' and 
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own thumbnails" on storage.objects;
create policy "Users update own thumbnails"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'thumbnails' and 
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own thumbnails" on storage.objects;
create policy "Users delete own thumbnails"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'thumbnails' and 
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload own avatars" on storage.objects;
create policy "Users upload own avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars' and 
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own avatars" on storage.objects;
create policy "Users update own avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars' and 
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own avatars" on storage.objects;
create policy "Users delete own avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars' and 
    (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- 2. DROP RETIRED FEATURE TABLES (Tags & Link-Tags)
-- ============================================================================
drop table if exists public.link_tags cascade;
drop table if exists public.tags cascade;


-- ============================================================================
-- 3. ENSURE SENDS.TITLE COLUMN & SEND_LINK_TO_RECIPIENTS RPC
-- ============================================================================
alter table public.sends add column if not exists title text;

-- Drop any conflicting legacy overloads
drop function if exists public.send_link_to_recipients(text, text, uuid[], uuid, text);
drop function if exists public.send_link_to_recipients(text, text, uuid[], uuid, text, text);

create or replace function public.send_link_to_recipients(
  p_url text,
  p_comment text default null,
  p_recipient_ids uuid[] default '{}'::uuid[],
  p_source_link_id uuid default null,
  p_thumbnail_url text default null,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_send_id uuid;
  v_recipient_id uuid;
  v_sender_id uuid := auth.uid();
  v_url text;
  v_title text;
  v_comment text;
  v_thumb text;
  v_recipient_count int := 0;
begin
  if v_sender_id is null then
    raise exception 'Unauthorized: Must be authenticated to send link recommendations.';
  end if;

  -- Ensure sender account is active
  if exists (select 1 from public.profiles where id = v_sender_id and status = 'suspended') then
    raise exception 'Unauthorized: Account is suspended.';
  end if;

  v_url := nullif(trim(p_url), '');
  if v_url is null then
    raise exception 'A valid URL or text is required.';
  end if;

  if p_recipient_ids is null or array_length(p_recipient_ids, 1) is null or array_length(p_recipient_ids, 1) = 0 then
    raise exception 'At least one recipient must be specified.';
  end if;

  v_title := nullif(trim(p_title), '');
  v_comment := nullif(trim(p_comment), '');
  v_thumb := nullif(trim(p_thumbnail_url), '');

  -- 1. Create the master send recommendation record
  insert into public.sends (sender_id, url, title, comment, thumbnail_url, source_link_id)
  values (v_sender_id, v_url, v_title, v_comment, v_thumb, p_source_link_id)
  returning id into v_send_id;

  -- 2. Insert distinct recipient entries who are accepted mutual friends (excluding the sender)
  foreach v_recipient_id in array p_recipient_ids
  loop
    if v_recipient_id is not null and v_recipient_id <> v_sender_id then
      -- Verify mutual accepted friendship exists to prevent arbitrary inbox spam
      if exists (
        select 1 from public.friendships
        where status = 'accepted'
          and (
            (requester_id = v_sender_id and recipient_id = v_recipient_id) or
            (requester_id = v_recipient_id and recipient_id = v_sender_id)
          )
      ) then
        insert into public.send_recipients (send_id, recipient_id, status, reading_status)
        values (v_send_id, v_recipient_id, 'pending', 'to_read')
        on conflict (send_id, recipient_id) do nothing;
        v_recipient_count := v_recipient_count + 1;
      end if;
    end if;
  end loop;

  if v_recipient_count = 0 then
    delete from public.sends where id = v_send_id;
    raise exception 'No valid, accepted friends found among specified recipients.';
  end if;

  return v_send_id;
end;
$$;

grant execute on function public.send_link_to_recipients to authenticated;


-- ============================================================================
-- 4. HARDEN USERNAME LOGIN RPC (Prevents Anonymous Email Scraping)
-- ============================================================================
-- Drop insecure 1-parameter signature
drop function if exists public.get_email_by_username(text);

-- Create secure 2-parameter signature that validates credentials before returning email
create or replace function public.get_email_by_username(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  found_email text;
  clean_username text;
  pw_matches boolean;
begin
  if p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    return null;
  end if;

  clean_username := lower(trim(p_username));

  -- Query auth.users and verify hashed password
  select u.email, (u.encrypted_password = extensions.crypt(p_password, u.encrypted_password))
  into found_email, pw_matches
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = clean_username
  limit 1;

  if pw_matches is true then
    return found_email;
  end if;

  return null;
end;
$$;

grant execute on function public.get_email_by_username(text, text) to anon, authenticated;


-- ============================================================================
-- 5. ADMIN ROLE & STATUS SELF-MODIFICATION SAFEGUARDS
-- ============================================================================
create or replace function public.admin_toggle_user_role(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  calling_is_admin boolean;
  active_admin_count int;
begin
  select coalesce(p.is_admin, false) into calling_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if calling_is_admin is not true then
    raise exception 'Unauthorized: Operator admin privileges required.';
  end if;

  -- PRD Requirement: Admins cannot demote themselves
  if p_user_id = auth.uid() and p_is_admin is false then
    raise exception 'Safeguard: Self-demotion from admin role is prohibited.';
  end if;

  if p_is_admin is false then
    select count(*) into active_admin_count
    from public.profiles
    where is_admin = true and status = 'active';

    if active_admin_count <= 1 and exists (select 1 from public.profiles where id = p_user_id and is_admin = true) then
      raise exception 'Safeguard: Cannot remove the final active operator admin.';
    end if;
  end if;

  update public.profiles
  set is_admin = p_is_admin
  where id = p_user_id;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'admin_audit_logs') then
    insert into public.admin_audit_logs (actor_admin_id, target_user_id, action, metadata)
    values (auth.uid(), p_user_id, 'USER_ROLE_CHANGE', jsonb_build_object('is_admin', p_is_admin));
  end if;
end;
$$;

grant execute on function public.admin_toggle_user_role(uuid, boolean) to authenticated;

create or replace function public.admin_toggle_user_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  calling_is_admin boolean;
begin
  select coalesce(p.is_admin, false) into calling_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if calling_is_admin is not true then
    raise exception 'Unauthorized: Operator admin privileges required.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Safeguard: You cannot suspend your own admin account.';
  end if;

  if p_status not in ('active', 'suspended') then
    raise exception 'Invalid status value. Must be active or suspended.';
  end if;

  update public.profiles
  set status = p_status
  where id = p_user_id;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'admin_audit_logs') then
    insert into public.admin_audit_logs (actor_admin_id, target_user_id, action, metadata)
    values (auth.uid(), p_user_id, 'USER_STATUS_CHANGE', jsonb_build_object('new_status', p_status));
  end if;
end;
$$;

grant execute on function public.admin_toggle_user_status(uuid, text) to authenticated;

-- ============================================================================
-- 7. FRIENDSHIP INTEGRITY: PREVENT SELF-FRIENDING & BIDIRECTIONAL DUPLICATES
-- ============================================================================
do $$
begin
  -- Prevent self-friending
  if not exists (
    select 1 from pg_constraint where conname = 'friendships_no_self_friend'
  ) then
    alter table public.friendships
      add constraint friendships_no_self_friend check (requester_id <> recipient_id);
  end if;
end $$;

-- Prevent reverse duplicate friendships (e.g. A->B and B->A existing simultaneously)
create unique index if not exists idx_friendships_bidirectional_unique
  on public.friendships (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
