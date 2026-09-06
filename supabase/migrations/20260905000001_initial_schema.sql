-- 20260905000001_initial_schema.sql
-- Linkiac Database Schema
-- Source of Truth for Supabase migrations

create extension if not exists "pgcrypto";

-- 1. Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  is_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

-- Case-insensitive username lookup
create unique index if not exists idx_profiles_username_lower on profiles (lower(username));

-- 2. Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 3. Folders (Self-referencing tree, can belong to a category or be standalone)
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  parent_folder_id uuid references folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 4. Tags (Private, free-text per user)
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create unique index if not exists idx_tags_user_name_lower on tags (user_id, lower(name));

-- 5. Links (Core entity: URL is intentionally unconstrained free text)
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  url text not null,
  title text,
  comment text,
  domain text,
  reading_status text not null default 'to_read' check (reading_status in ('to_read', 'reading', 'done')),
  thumbnail_url text,
  thumbnail_source text not null default 'none' check (thumbnail_source in ('auto', 'manual', 'none')),
  category_id uuid references categories(id) on delete set null,
  folder_id uuid references folders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Link-Tag join table
create table if not exists link_tags (
  link_id uuid not null references links(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (link_id, tag_id)
);

-- 7. Friendships (Request / Accept mutual friendship model)
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, recipient_id)
);

-- 8. Sends (Broadcast action, single row per send)
create table if not exists sends (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  url text not null,
  comment text,
  thumbnail_url text,
  source_link_id uuid references links(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 9. Send Recipients (Fan-out suggestions inbox, independent per recipient)
create table if not exists send_recipients (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references sends(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reading_status text not null default 'to_read' check (reading_status in ('to_read', 'reading', 'done')),
  resulting_link_id uuid references links(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- 10. Bookmark Import Batches
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source text not null default 'browser',
  created_at timestamptz not null default now()
);

-- 11. Bookmark Import Items
create table if not exists import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  url text not null,
  title text,
  folder_path text,
  duplicate_link_id uuid references links(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'imported', 'skipped')),
  created_at timestamptz not null default now()
);

-- 12. Admin Audit Logs
create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid not null references profiles(id) on delete cascade,
  target_user_id uuid references profiles(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists idx_folders_parent on folders (parent_folder_id);
create index if not exists idx_folders_user_category on folders (user_id, category_id);
create index if not exists idx_links_user_folder on links (user_id, folder_id);
create index if not exists idx_links_user_category on links (user_id, category_id);
create index if not exists idx_links_user_domain on links (user_id, domain);
create index if not exists idx_links_user_status on links (user_id, reading_status);
create index if not exists idx_links_user_created on links (user_id, created_at desc);
create index if not exists idx_link_tags_tag on link_tags (tag_id);
create index if not exists idx_friendships_users on friendships (requester_id, recipient_id);
create index if not exists idx_send_recipients_inbox on send_recipients (recipient_id, status, created_at desc);
create index if not exists idx_import_items_batch on import_items (batch_id, status);
