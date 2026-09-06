-- 20260905000003_functions_and_triggers.sql
-- Triggers, Cycle Detection, and Tree Procedures

-- 1. Folder cycle detection trigger
create or replace function check_folder_cycle()
returns trigger as $$
declare
  current_id uuid;
  depth int := 0;
  max_depth int := 50; -- Circuit breaker against infinite loops
begin
  if new.parent_folder_id is null then
    return new;
  end if;

  -- Cannot be parent of oneself
  if new.id is not null and new.id = new.parent_folder_id then
    raise exception 'Folder cannot be its own parent';
  end if;

  -- Traverse upwards to ensure new.id is not in the ancestor path
  current_id := new.parent_folder_id;
  while current_id is not null and depth < max_depth loop
    if new.id is not null and current_id = new.id then
      raise exception 'Folder cycle detected: cannot move a folder under one of its descendants';
    end if;

    select parent_folder_id into current_id
    from folders
    where id = current_id;

    depth := depth + 1;
  end loop;

  return new;
end;
$$ language plpgsql;

create or replace trigger trg_check_folder_cycle
  before insert or update of parent_folder_id on folders
  for each row execute function check_folder_cycle();

-- 2. Automatically update updated_at on links
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_links_updated_at
  before update on links
  for each row execute function update_updated_at_column();

-- 3. Automatic Profile Creation on user signup
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
  -- Generate unique username from metadata or email
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  -- Sanitize base username
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

-- Trigger on auth.users if available
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function handle_new_user();
  end if;
end $$;

-- 4. Recursive query function to get all descendants of a folder
create or replace function get_folder_subtree(target_folder_id uuid)
returns table (
  id uuid,
  name text,
  parent_folder_id uuid,
  category_id uuid,
  depth int
) as $$
begin
  return query
  with recursive folder_tree as (
    select f.id, f.name, f.parent_folder_id, f.category_id, 0 as depth
    from folders f
    where f.id = target_folder_id
    union all
    select f.id, f.name, f.parent_folder_id, f.category_id, ft.depth + 1
    from folders f
    inner join folder_tree ft on f.parent_folder_id = ft.id
  )
  select * from folder_tree;
end;
$$ language plpgsql stable;
