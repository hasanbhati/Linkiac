-- ==============================================================================
-- Linkiac — Master Database Schema & Production Infrastructure
-- Version: 2.0.0
-- Scope: Complete PostgreSQL schema, Storage Buckets, RLS, Triggers, & Hardened RPCs
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- ==============================================================================
-- 2. CORE TABLES
-- ==============================================================================

-- 2.1 PROFILES (1-to-1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  is_admin boolean default false not null,
  status text default 'active' not null check (status in ('active', 'suspended', 'deactivated')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2.2 CATEGORIES
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, name)
);

-- 2.3 FOLDERS (Hierarchical / Self-referential tree)
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2.4 LINKS (Bookmarks Library)
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  url text not null,
  title text not null,
  description text,
  thumbnail_url text,
  reading_status text default 'to_read' not null check (reading_status in ('to_read', 'reading', 'done')),
  is_favorite boolean default false not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2.5 FRIENDSHIPS (Bidirectional social graph)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending' not null check (status in ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  check (requester_id <> recipient_id)
);

-- Bidirectional uniqueness: guarantees only 1 friendship row exists between any pair of users
create unique index if not exists idx_friendships_bidirectional_unique
  on public.friendships (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

-- 2.6 SENDS (Broadcast master recommendation)
create table if not exists public.sends (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  title text,
  thumbnail_url text,
  comment text,
  source_link_id uuid references public.links(id) on delete set null,
  created_at timestamptz default now() not null
);

-- 2.7 SEND_RECIPIENTS (Per-recipient suggestion status)
create table if not exists public.send_recipients (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references public.sends(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending' not null check (status in ('pending', 'accepted', 'ignored')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (send_id, recipient_id)
);

-- Query performance indexes
create index if not exists idx_links_user_id on public.links(user_id);
create index if not exists idx_links_folder_id on public.links(folder_id);
create index if not exists idx_links_category_id on public.links(category_id);
create index if not exists idx_folders_user_id on public.folders(user_id);
create index if not exists idx_folders_parent_id on public.folders(parent_folder_id);
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_recipient on public.friendships(recipient_id);
create index if not exists idx_send_recipients_recipient on public.send_recipients(recipient_id);
create index if not exists idx_sends_sender on public.sends(sender_id);

-- ==============================================================================
-- 3. STORAGE BUCKETS (Thumbnails & Avatars)
-- ==============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('thumbnails', 'thumbnails', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880;

-- Storage object policies: Publicly readable via direct URL; Folder-isolated write/update/delete/select
drop policy if exists "Users can list own thumbnails" on storage.objects;
create policy "Users can list own thumbnails"
  on storage.objects for select to authenticated
  using (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users upload own thumbnails" on storage.objects;
create policy "Users upload own thumbnails"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own thumbnails" on storage.objects;
create policy "Users update own thumbnails"
  on storage.objects for update to authenticated
  using (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own thumbnails" on storage.objects;
create policy "Users delete own thumbnails"
  on storage.objects for delete to authenticated
  using (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can list own avatars" on storage.objects;
create policy "Users can list own avatars"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users upload own avatars" on storage.objects;
create policy "Users upload own avatars"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own avatars" on storage.objects;
create policy "Users update own avatars"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own avatars" on storage.objects;
create policy "Users delete own avatars"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ==============================================================================
-- 4. DATABASE TRIGGERS & UTILITY FUNCTIONS
-- ==============================================================================

-- 4.1 Update timestamp trigger
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories for each row execute function public.update_updated_at_column();

drop trigger if exists trg_folders_updated_at on public.folders;
create trigger trg_folders_updated_at before update on public.folders for each row execute function public.update_updated_at_column();

drop trigger if exists trg_links_updated_at on public.links;
create trigger trg_links_updated_at before update on public.links for each row execute function public.update_updated_at_column();

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at before update on public.friendships for each row execute function public.update_updated_at_column();

drop trigger if exists trg_send_recipients_updated_at on public.send_recipients;
create trigger trg_send_recipients_updated_at before update on public.send_recipients for each row execute function public.update_updated_at_column();

-- 4.2 Folder hierarchy cycle detection
create or replace function public.check_folder_cycle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  current_id uuid;
  depth int := 0;
  max_depth int := 50;
begin
  if new.parent_folder_id is null then
    return new;
  end if;

  if new.id is not null and new.id = new.parent_folder_id then
    raise exception 'Folder cannot be its own parent';
  end if;

  current_id := new.parent_folder_id;
  while current_id is not null and depth < max_depth loop
    if new.id is not null and current_id = new.id then
      raise exception 'Folder cycle detected: cannot move a folder under one of its descendants';
    end if;

    select parent_folder_id into current_id
    from public.folders
    where id = current_id;

    depth := depth + 1;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_check_folder_cycle on public.folders;
create trigger trg_check_folder_cycle
  before insert or update of parent_folder_id on public.folders
  for each row execute function public.check_folder_cycle();

-- 4.3 Recursive folder subtree function
create or replace function public.get_folder_subtree(target_folder_id uuid)
returns table (
  id uuid,
  name text,
  parent_folder_id uuid,
  category_id uuid,
  depth int
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  return query
  with recursive folder_tree as (
    select f.id, f.name, f.parent_folder_id, f.category_id, 0 as depth
    from public.folders f
    where f.id = target_folder_id
    union all
    select f.id, f.name, f.parent_folder_id, f.category_id, ft.depth + 1
    from public.folders f
    inner join folder_tree ft on f.parent_folder_id = ft.id
  )
  select * from folder_tree;
end;
$$;

-- 4.4 Automatic profile provisioning on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
  while exists (select 1 from public.profiles where username = assigned_username) loop
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
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4.5 Privilege escalation safeguards on profiles
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_is_admin boolean;
begin
  select coalesce(p.is_admin, false) into caller_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if coalesce(caller_is_admin, false) is false then
    new.is_admin := old.is_admin;
    new.status := old.status;
  end if;

  -- Admin self-harm protection: cannot demote or suspend oneself
  if auth.uid() = old.id and old.is_admin = true then
    if new.is_admin = false then
      raise exception 'Security Error: You cannot remove administrator privileges from your own account.';
    end if;
    if new.status <> 'active' then
      raise exception 'Security Error: You cannot suspend or deactivate your own administrator account.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_fields on public.profiles;
create trigger trg_protect_profile_privileged_fields
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

-- ==============================================================================
-- 5. RLS RECURSION HELPER FUNCTIONS
-- ==============================================================================

create or replace function public.is_send_recipient(p_send_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
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
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.sends
    where id = p_send_id and sender_id = p_user_id
  );
$$;

-- ==============================================================================
-- 6. APPLICATION RPCS (Security Definer Transactions)
-- ==============================================================================

-- 6.1 Send recommendations to multiple friends (Anti-spam & Title preserved)
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
set search_path = public, pg_temp
as $$
declare
  v_send_id uuid;
  v_recipient_id uuid;
  v_sender_status text;
  v_valid_recipient boolean;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: Must be authenticated to send links';
  end if;

  select status into v_sender_status
  from public.profiles
  where id = auth.uid();

  if v_sender_status <> 'active' then
    raise exception 'Account Suspended: You cannot send link recommendations while your account is inactive or suspended.';
  end if;

  if p_recipient_ids is null or array_length(p_recipient_ids, 1) is null or array_length(p_recipient_ids, 1) = 0 then
    raise exception 'Validation Error: At least one recipient must be selected';
  end if;

  foreach v_recipient_id in array p_recipient_ids loop
    if v_recipient_id = auth.uid() then
      raise exception 'Validation Error: You cannot send link recommendations to yourself.';
    end if;

    select exists (
      select 1 from public.friendships
      where status = 'accepted'
        and (
          (requester_id = auth.uid() and recipient_id = v_recipient_id) or
          (recipient_id = auth.uid() and requester_id = v_recipient_id)
        )
    ) into v_valid_recipient;

    if not v_valid_recipient then
      raise exception 'Security Error: Recommendations can only be sent to accepted mutual friends.';
    end if;
  end loop;

  insert into public.sends (sender_id, url, title, thumbnail_url, comment, source_link_id)
  values (auth.uid(), p_url, p_title, p_thumbnail_url, p_comment, p_source_link_id)
  returning id into v_send_id;

  foreach v_recipient_id in array p_recipient_ids loop
    insert into public.send_recipients (send_id, recipient_id, status)
    values (v_send_id, v_recipient_id, 'pending')
    on conflict (send_id, recipient_id) do nothing;
  end loop;

  return v_send_id;
end;
$$;

-- 6.2 Accept friend suggestion into library
create or replace function public.accept_friend_suggestion(
  p_suggestion_id uuid,
  p_category_id uuid default null,
  p_folder_id uuid default null,
  p_custom_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_send_record record;
  v_recipient_id uuid;
  v_new_link_id uuid;
  v_final_comment text;
  v_link_title text;
  v_category_id uuid;
begin
  select sr.recipient_id, s.url, s.title, s.thumbnail_url, s.comment
  into v_send_record
  from public.send_recipients sr
  join public.sends s on s.id = sr.send_id
  where sr.id = p_suggestion_id;

  if not found then
    raise exception 'Suggestion not found';
  end if;

  if v_send_record.recipient_id <> auth.uid() then
    raise exception 'Unauthorized to accept this suggestion';
  end if;

  v_final_comment := coalesce(p_custom_comment, v_send_record.comment);
  v_link_title := coalesce(nullif(trim(v_send_record.title), ''), v_send_record.url);

  -- Inherit folder category if omitted
  v_category_id := p_category_id;
  if v_category_id is null and p_folder_id is not null then
    select category_id into v_category_id from public.folders where id = p_folder_id;
  end if;

  insert into public.links (
    user_id,
    url,
    title,
    thumbnail_url,
    notes,
    category_id,
    folder_id,
    reading_status,
    is_favorite
  )
  values (
    auth.uid(),
    v_send_record.url,
    v_link_title,
    v_send_record.thumbnail_url,
    v_final_comment,
    v_category_id,
    p_folder_id,
    'to_read',
    false
  )
  returning id into v_new_link_id;

  update public.send_recipients
  set status = 'accepted', updated_at = now()
  where id = p_suggestion_id;

  return v_new_link_id;
end;
$$;

-- 6.3 Secure username to email credential lookup for login
create or replace function public.get_email_by_username(
  p_username text,
  p_password text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
  user_email text;
  stored_hash text;
  password_matches boolean := false;
begin
  select id into target_user_id
  from public.profiles
  where lower(username) = lower(trim(p_username))
    and status = 'active';

  if target_user_id is null then
    return null;
  end if;

  select email, encrypted_password into user_email, stored_hash
  from auth.users
  where id = target_user_id;

  if stored_hash is not null and p_password is not null then
    password_matches := (stored_hash = extensions.crypt(p_password, stored_hash));
  end if;

  if password_matches then
    return user_email;
  end if;

  return null;
end;
$$;

-- 6.4 Delete user account
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_is_admin boolean;
  active_admin_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Admin safeguard: prevent the last active administrator from deleting their account
  select coalesce(is_admin, false) into caller_is_admin
  from public.profiles
  where id = auth.uid();

  if caller_is_admin is true then
    select count(*) into active_admin_count
    from public.profiles
    where is_admin = true and status = 'active' and id <> auth.uid();

    if active_admin_count = 0 then
      raise exception 'Security Error: You are the last remaining active administrator. Please promote another active user to administrator before deleting this account.';
    end if;
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

-- ==============================================================================
-- 7. OPERATOR ADMINISTRATOR RPCS
-- ==============================================================================

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
set search_path = public, auth, pg_temp
as $$
declare
  calling_is_admin boolean;
begin
  select coalesce(p.is_admin, false) into calling_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if calling_is_admin is not true then
    raise exception 'Unauthorized: Only platform administrators can invoke this action';
  end if;

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(u.email, 'No Email')::text as email,
    p.is_admin,
    p.status,
    p.created_at,
    count(l.id)::bigint as links_count
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.links l on l.user_id = p.id
  group by p.id, p.username, p.display_name, p.avatar_url, u.email, p.is_admin, p.status, p.created_at
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_toggle_user_role(p_user_id uuid, p_is_admin boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  calling_is_admin boolean;
begin
  select coalesce(p.is_admin, false) into calling_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if calling_is_admin is not true then
    raise exception 'Unauthorized: Only platform administrators can invoke this action';
  end if;

  if auth.uid() = p_user_id and p_is_admin is false then
    raise exception 'Action Prohibited: You cannot remove administrator privileges from your own account.';
  end if;

  update public.profiles
  set is_admin = p_is_admin, updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

create or replace function public.admin_toggle_user_status(p_user_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  calling_is_admin boolean;
begin
  select coalesce(p.is_admin, false) into calling_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if calling_is_admin is not true then
    raise exception 'Unauthorized: Only platform administrators can invoke this action';
  end if;

  if auth.uid() = p_user_id and p_status <> 'active' then
    raise exception 'Action Prohibited: You cannot suspend or deactivate your own administrator account.';
  end if;

  update public.profiles
  set status = p_status, updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  calling_is_admin boolean;
begin
  select coalesce(p.is_admin, false) into calling_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if calling_is_admin is not true then
    raise exception 'Unauthorized: Only platform administrators can invoke this action';
  end if;

  if auth.uid() = p_user_id then
    raise exception 'Action Prohibited: You cannot delete your own account from the administrator portal.';
  end if;

  delete from auth.users where id = p_user_id;
  return true;
end;
$$;

-- ==============================================================================
-- 8. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.folders enable row level security;
alter table public.links enable row level security;
alter table public.friendships enable row level security;
alter table public.sends enable row level security;
alter table public.send_recipients enable row level security;

-- 8.1 PROFILES POLICIES
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated
  using (status = 'active' or id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 8.2 CATEGORIES POLICIES
drop policy if exists "Users manage own categories" on public.categories;
create policy "Users manage own categories"
  on public.categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 8.3 FOLDERS POLICIES
drop policy if exists "Users manage own folders" on public.folders;
create policy "Users manage own folders"
  on public.folders for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 8.4 LINKS POLICIES
drop policy if exists "Users manage own links" on public.links;
create policy "Users manage own links"
  on public.links for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 8.5 FRIENDSHIPS POLICIES
drop policy if exists "Users can view friendships they are part of" on public.friendships;
create policy "Users can view friendships they are part of"
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Users can create friend requests" on public.friendships;
create policy "Users can create friend requests"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id and requester_id <> recipient_id);

drop policy if exists "Recipients can respond to friend requests" on public.friendships;
create policy "Recipients can respond to friend requests"
  on public.friendships for update to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Users can delete their own friendships or cancel requests" on public.friendships;
create policy "Users can delete their own friendships or cancel requests"
  on public.friendships for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- 8.6 SENDS POLICIES
drop policy if exists "Users can view sends they initiated or received" on public.sends;
create policy "Users can view sends they initiated or received"
  on public.sends for select to authenticated
  using (auth.uid() = sender_id or public.is_send_recipient(id, auth.uid()));

drop policy if exists "Users can insert sends they initiate" on public.sends;
create policy "Users can insert sends they initiate"
  on public.sends for insert to authenticated
  with check (auth.uid() = sender_id);

-- 8.7 SEND_RECIPIENTS POLICIES
drop policy if exists "Recipients can view incoming suggestions and senders can view status" on public.send_recipients;
create policy "Recipients can view incoming suggestions and senders can view status"
  on public.send_recipients for select to authenticated
  using (auth.uid() = recipient_id or public.is_send_sender(send_id, auth.uid()));

drop policy if exists "Senders can insert recipient rows" on public.send_recipients;
create policy "Senders can insert recipient rows"
  on public.send_recipients for insert to authenticated
  with check (public.is_send_sender(send_id, auth.uid()));

drop policy if exists "Recipients can update their suggestion status" on public.send_recipients;
create policy "Recipients can update their suggestion status"
  on public.send_recipients for update to authenticated
  using (auth.uid() = recipient_id);

-- ==============================================================================
-- 9. PERMISSION HARDENING & LINTER COMPLIANCE
-- ==============================================================================

-- Revoke default public/anon execution
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_privileged_fields() from public, anon, authenticated;
revoke execute on function public.check_folder_cycle() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;

revoke execute on function public.admin_get_users() from public, anon;
revoke execute on function public.admin_toggle_user_role(uuid, boolean) from public, anon;
revoke execute on function public.admin_toggle_user_status(uuid, text) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;

revoke execute on function public.send_link_to_recipients(text, text, uuid[], uuid, text, text) from public, anon;
grant execute on function public.send_link_to_recipients(text, text, uuid[], uuid, text, text) to authenticated;

revoke execute on function public.accept_friend_suggestion(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.accept_friend_suggestion(uuid, uuid, uuid, text) to authenticated;

revoke execute on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;

revoke execute on function public.is_send_recipient(uuid, uuid) from public, anon;
grant execute on function public.is_send_recipient(uuid, uuid) to authenticated;

revoke execute on function public.is_send_sender(uuid, uuid) from public, anon;
grant execute on function public.is_send_sender(uuid, uuid) to authenticated;

-- Allow anonymous execution on get_email_by_username ONLY for username login lookup
grant execute on function public.get_email_by_username(text, text) to anon;
revoke execute on function public.get_email_by_username(text, text) from authenticated;
