-- 20260907000003_profile_avatar_and_username_auth.sql
-- Linkiac Production Migration: Username Auth Resolution, Profile Backfill & Avatar Storage

-- ============================================================================
-- 1. USERNAME LOGIN RESOLUTION RPC
-- ============================================================================
-- Allows resolving a case-insensitive username to the associated auth.users email
-- for authentication on both Web and Mobile.
create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  found_email text;
  clean_username text;
begin
  if p_username is null or trim(p_username) = '' then
    return null;
  end if;

  clean_username := lower(trim(p_username));

  select u.email into found_email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = clean_username
  limit 1;

  return found_email;
end;
$$;

-- Grant execution to anonymous and authenticated clients
grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- ============================================================================
-- 2. BACKFILL MISSING PROFILES
-- ============================================================================
-- Ensures any users in auth.users (such as 'korneliaf' or newly created users)
-- who may have missed trigger execution have valid public.profiles records.
insert into public.profiles (id, username, display_name, avatar_url, is_admin, status, created_at)
select
  u.id,
  coalesce(
    nullif(regexp_replace(lower(u.raw_user_meta_data->>'username'), '[^a-z0-9_]', '', 'g'), ''),
    nullif(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
    'user_' || substr(md5(u.id::text), 1, 8)
  ) as username,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'display_name',
    split_part(u.email, '@', 1)
  ) as display_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  false as is_admin,
  'active' as status,
  coalesce(u.created_at, now()) as created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name;

-- Ensure handle_new_user trigger is active on auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_username text;
  base_username text;
  count_suffix int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  if length(base_username) < 3 then
    base_username := 'user_' || substr(md5(random()::text), 1, 6);
  end if;

  assigned_username := base_username;
  while exists (select 1 from public.profiles where lower(username) = lower(assigned_username) and id <> new.id) loop
    count_suffix := count_suffix + 1;
    assigned_username := base_username || count_suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url, is_admin, status)
  values (
    new.id,
    assigned_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', assigned_username),
    new.raw_user_meta_data->>'avatar_url',
    false,
    'active'
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ============================================================================
-- 3. AVATARS STORAGE BUCKET & POLICIES
-- ============================================================================
-- Create public avatars bucket if storage schema exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('avatars', 'avatars', true)
    on conflict (id) do update set public = true;
  end if;
end $$;

-- Storage RLS policies for avatars
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    drop policy if exists "Avatars are publicly readable" on storage.objects;
    create policy "Avatars are publicly readable"
      on storage.objects for select
      using (bucket_id = 'avatars');

    drop policy if exists "Authenticated users can upload avatar" on storage.objects;
    create policy "Authenticated users can upload avatar"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'avatars');

    drop policy if exists "Authenticated users can update avatar" on storage.objects;
    create policy "Authenticated users can update avatar"
      on storage.objects for update
      to authenticated
      using (bucket_id = 'avatars');

    drop policy if exists "Authenticated users can delete avatar" on storage.objects;
    create policy "Authenticated users can delete avatar"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'avatars');
  end if;
end $$;

-- ============================================================================
-- 4. FIX SENDS & SUGGESTIONS RLS AND FOREIGN KEYS
-- ============================================================================
-- Ensure explicit foreign key constraints for PostgREST resource embedding
alter table public.sends drop constraint if exists sends_sender_id_fkey;
alter table public.sends add constraint sends_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete cascade;

alter table public.send_recipients drop constraint if exists send_recipients_send_id_fkey;
alter table public.send_recipients add constraint send_recipients_send_id_fkey
  foreign key (send_id) references public.sends(id) on delete cascade;

alter table public.send_recipients drop constraint if exists send_recipients_recipient_id_fkey;
alter table public.send_recipients add constraint send_recipients_recipient_id_fkey
  foreign key (recipient_id) references public.profiles(id) on delete cascade;

-- Recursion-safe security definer helper functions for RLS checks
create or replace function public.is_send_recipient(p_send_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.send_recipients
    where send_id = p_send_id and recipient_id = p_user_id
  );
$$;

create or replace function public.is_send_sender(p_send_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.sends
    where id = p_send_id and sender_id = p_user_id
  );
$$;

grant execute on function public.is_send_recipient(uuid, uuid) to authenticated;
grant execute on function public.is_send_sender(uuid, uuid) to authenticated;

-- Allow senders AND recipients to view the broadcast send row
drop policy if exists "Users can view sends they initiated" on public.sends;
drop policy if exists "Users can view sends they initiated or received" on public.sends;
create policy "Users can view sends they initiated or received"
  on public.sends for select
  to authenticated
  using (
    auth.uid() = sender_id or
    public.is_send_recipient(id, auth.uid())
  );

-- Recipients view incoming suggestions; Senders view outgoing status
drop policy if exists "Recipients can view incoming suggestions and senders can view status" on public.send_recipients;
create policy "Recipients can view incoming suggestions and senders can view status"
  on public.send_recipients for select
  to authenticated
  using (
    recipient_id = auth.uid() or
    public.is_send_sender(send_id, auth.uid())
  );

-- ============================================================================
-- 5. OPERATOR ADMIN PORTAL REAL DATA & LIFECYCLE RPCS
-- ============================================================================
-- Returns all registered platform users with link counts and verified emails
create or replace function public.admin_get_users()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  email text,
  is_admin boolean,
  status text,
  created_at timestamptz,
  links_count bigint
)
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

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(u.email::text, '')::text as email,
    coalesce(p.is_admin, false) as is_admin,
    coalesce(p.status, 'active') as status,
    p.created_at,
    coalesce(count(l.id), 0) as links_count
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.links l on l.user_id = p.id
  group by p.id, p.username, p.display_name, p.avatar_url, u.email, p.is_admin, p.status, p.created_at
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_get_users() to authenticated;

-- Suspend or reactivate user account
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

-- Promote or demote operator admin role with safeguard against losing the last admin
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

-- Operator admin permanent user deletion (purges auth.users and cascades)
create or replace function public.admin_delete_user(p_user_id uuid)
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
    raise exception 'Cannot delete your own admin account from the admin panel.';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'admin_audit_logs') then
    insert into public.admin_audit_logs (actor_admin_id, target_user_id, action, metadata)
    values (auth.uid(), p_user_id, 'USER_DELETION', jsonb_build_object('deleted_user_id', p_user_id));
  end if;

  delete from auth.users where id = p_user_id;
  delete from public.profiles where id = p_user_id;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

