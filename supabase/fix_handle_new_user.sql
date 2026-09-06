-- ==============================================================================
-- Linkiac Universal Cross-Platform Sync & Dev Fix
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Make user_id flexible for development and cross-device testing
alter table public.links alter column user_id drop not null;
alter table public.links drop constraint if exists links_user_id_fkey;

-- 2. Allow cross-device development access on Links, Categories, and Folders
drop policy if exists "Dev allow all on links" on public.links;
create policy "Dev allow all on links"
  on public.links for all
  using (true)
  with check (true);

drop policy if exists "Dev allow all on categories" on public.categories;
create policy "Dev allow all on categories"
  on public.categories for all
  using (true)
  with check (true);

drop policy if exists "Dev allow all on folders" on public.folders;
create policy "Dev allow all on folders"
  on public.folders for all
  using (true)
  with check (true);

-- 3. Fix handle_new_user trigger on auth.users with correct public search_path
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

-- 4. Recreate trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Ensure authenticated users can also insert their own profile directly if needed
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);
