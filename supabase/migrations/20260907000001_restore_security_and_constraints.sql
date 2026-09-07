-- 20260907000001_restore_security_and_constraints.sql
-- Linkiac Production Migration: Restore Foreign Key Constraints & Row-Level Security
-- Reverses dev-only integrity drops from unified_sync_setup.sql

-- ============================================================================
-- 1. PURGE DEV-ONLY PERMISSIVE POLICIES
-- ============================================================================
drop policy if exists "Dev allow all on profiles" on public.profiles;
drop policy if exists "Dev allow all on categories" on public.categories;
drop policy if exists "Dev allow all on folders" on public.folders;
drop policy if exists "Dev allow all on links" on public.links;
drop policy if exists "Dev allow all on friendships" on public.friendships;
drop policy if exists "Dev allow all on sends" on public.sends;
drop policy if exists "Dev allow all on send_recipients" on public.send_recipients;
drop policy if exists "Dev allow all on tags" on public.tags;
drop policy if exists "Dev allow all on link_tags" on public.link_tags;

-- ============================================================================
-- 2. CLEAN UP ORPHANED & MOCK DEV DATA & RE-ESTABLISH NOT NULL CONSTRAINTS
-- ============================================================================
-- Purge dev records where user_id is null OR where the profile/user does not exist in auth.users
-- (This purges fake mock profiles a0000000..., b0000000..., c0000000... seeded by unified_sync_setup.sql)
delete from public.link_tags where link_id in (
  select id from public.links 
  where user_id is null or user_id not in (select id from auth.users)
);
delete from public.links where user_id is null or user_id not in (select id from auth.users);
delete from public.folders where user_id is null or user_id not in (select id from auth.users);
delete from public.categories where user_id is null or user_id not in (select id from auth.users);
delete from public.tags where user_id is null or user_id not in (select id from auth.users);
delete from public.send_recipients where recipient_id not in (select id from auth.users) or send_id in (
  select id from public.sends where sender_id not in (select id from auth.users)
);
delete from public.sends where sender_id not in (select id from auth.users);
delete from public.friendships where requester_id not in (select id from auth.users) or recipient_id not in (select id from auth.users);
delete from public.import_items where batch_id in (
  select id from public.import_batches where user_id not in (select id from auth.users)
);
delete from public.import_batches where user_id not in (select id from auth.users);
delete from public.admin_audit_logs where actor_admin_id not in (select id from auth.users);
delete from public.profiles where id not in (select id from auth.users);

-- Re-apply NOT NULL constraints
alter table public.categories alter column user_id set not null;
alter table public.folders alter column user_id set not null;
alter table public.links alter column user_id set not null;
alter table public.tags alter column user_id set not null;

-- ============================================================================
-- 3. RE-ESTABLISH FOREIGN KEY CONSTRAINTS WITH CASCADE DELETES
-- ============================================================================
-- Profiles -> auth.users
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    alter table public.profiles drop constraint if exists profiles_id_fkey;
    alter table public.profiles add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- Categories -> profiles
alter table public.categories drop constraint if exists categories_user_id_fkey;
alter table public.categories add constraint categories_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Folders -> profiles & categories
alter table public.folders drop constraint if exists folders_user_id_fkey;
alter table public.folders add constraint folders_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Links -> profiles
alter table public.links drop constraint if exists links_user_id_fkey;
alter table public.links add constraint links_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Tags -> profiles
alter table public.tags drop constraint if exists tags_user_id_fkey;
alter table public.tags add constraint tags_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- ============================================================================
-- 4. RE-ASSERT STRICT MULTI-TENANT ROW LEVEL SECURITY POLICIES
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.folders enable row level security;
alter table public.tags enable row level security;
alter table public.links enable row level security;
alter table public.link_tags enable row level security;
alter table public.friendships enable row level security;
alter table public.sends enable row level security;
alter table public.send_recipients enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_items enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Profiles: Authenticated users can view public profile info (for usernames & friend discovery)
drop policy if exists "Authenticated users can view public profile info" on public.profiles;
create policy "Authenticated users can view public profile info"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Categories: Full isolation by user_id
drop policy if exists "Users manage their own categories" on public.categories;
create policy "Users manage their own categories"
  on public.categories for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Folders: Full isolation by user_id
drop policy if exists "Users manage their own folders" on public.folders;
create policy "Users manage their own folders"
  on public.folders for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tags: Full isolation by user_id
drop policy if exists "Users manage their own tags" on public.tags;
create policy "Users manage their own tags"
  on public.tags for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Links: Full isolation by user_id
drop policy if exists "Users manage their own links" on public.links;
create policy "Users manage their own links"
  on public.links for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Link-Tags Join Table: Accessible only if the user owns the parent link
drop policy if exists "Users manage tags on their own links" on public.link_tags;
create policy "Users manage tags on their own links"
  on public.link_tags for all
  to authenticated
  using (
    exists (
      select 1 from public.links
      where links.id = link_tags.link_id and links.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.links
      where links.id = link_tags.link_id and links.user_id = auth.uid()
    )
  );

-- Friendships: Only parties to the friendship can view/modify
drop policy if exists "Users can view friendships they are part of" on public.friendships;
create policy "Users can view friendships they are part of"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Users can create friend requests as requester" on public.friendships;
create policy "Users can create friend requests as requester"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

drop policy if exists "Users can update friendships they are part of" on public.friendships;
create policy "Users can update friendships they are part of"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id)
  with check (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Users can delete friendships they are part of" on public.friendships;
create policy "Users can delete friendships they are part of"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- Sends: Sender can view and insert their own broadcasts
drop policy if exists "Users can view sends they initiated" on public.sends;
create policy "Users can view sends they initiated"
  on public.sends for select
  to authenticated
  using (auth.uid() = sender_id);

drop policy if exists "Users can insert sends they initiate" on public.sends;
create policy "Users can insert sends they initiate"
  on public.sends for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- Send Recipients: Recipient can view their inbox; Sender can view status
drop policy if exists "Recipients can view incoming suggestions and senders can view status" on public.send_recipients;
create policy "Recipients can view incoming suggestions and senders can view status"
  on public.send_recipients for select
  to authenticated
  using (
    recipient_id = auth.uid() or
    exists (
      select 1 from public.sends
      where sends.id = send_recipients.send_id and sends.sender_id = auth.uid()
    )
  );

drop policy if exists "Recipients can update their own received suggestions" on public.send_recipients;
create policy "Recipients can update their own received suggestions"
  on public.send_recipients for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "Senders can insert recipient rows during send" on public.send_recipients;
create policy "Senders can insert recipient rows during send"
  on public.send_recipients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sends
      where sends.id = send_recipients.send_id and sends.sender_id = auth.uid()
    )
  );

-- Import Batches & Items: Owned by user
drop policy if exists "Users manage their own import batches" on public.import_batches;
create policy "Users manage their own import batches"
  on public.import_batches for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own import items" on public.import_items;
create policy "Users manage their own import items"
  on public.import_items for all
  to authenticated
  using (
    exists (
      select 1 from public.import_batches
      where import_batches.id = import_items.batch_id and import_batches.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.import_batches
      where import_batches.id = import_items.batch_id and import_batches.user_id = auth.uid()
    )
  );

-- Admin Audit Logs: Visible only to verified admins
drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
create policy "Admins can view audit logs"
  on public.admin_audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
