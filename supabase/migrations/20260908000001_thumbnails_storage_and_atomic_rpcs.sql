-- ============================================================================
-- Migration: 20260908000001_thumbnails_storage_and_atomic_rpcs.sql
-- Description: Provisions 'thumbnails' storage bucket, adds security policies,
--              and provides atomic RPC transactions for link sending and
--              suggestion acceptance.
-- ============================================================================

-- 1. THUMBNAILS STORAGE BUCKET
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'thumbnails',
      'thumbnails',
      true,
      5242880, -- 5 MB limit
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
    on conflict (id) do update set
      public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  end if;
end $$;

-- 2. STORAGE POLICIES FOR THUMBNAILS
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    drop policy if exists "Thumbnails are publicly readable" on storage.objects;
    create policy "Thumbnails are publicly readable"
      on storage.objects for select
      using (bucket_id = 'thumbnails');

    drop policy if exists "Authenticated users can upload thumbnail" on storage.objects;
    create policy "Authenticated users can upload thumbnail"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'thumbnails');

    drop policy if exists "Authenticated users can update thumbnail" on storage.objects;
    create policy "Authenticated users can update thumbnail"
      on storage.objects for update
      to authenticated
      using (bucket_id = 'thumbnails');

    drop policy if exists "Authenticated users can delete thumbnail" on storage.objects;
    create policy "Authenticated users can delete thumbnail"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'thumbnails');
  end if;
end $$;

-- 3. ATOMIC BROADCAST SEND RPC
create or replace function public.send_link_to_recipients(
  p_url text,
  p_comment text default null,
  p_recipient_ids uuid[] default '{}',
  p_source_link_id uuid default null,
  p_thumbnail_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid;
  v_send_id uuid := gen_random_uuid();
  v_recipient_id uuid;
begin
  v_sender_id := auth.uid();
  if v_sender_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_url is null or length(trim(p_url)) = 0 then
    raise exception 'URL is required';
  end if;

  if array_length(p_recipient_ids, 1) is null or array_length(p_recipient_ids, 1) = 0 then
    raise exception 'At least one recipient is required';
  end if;

  -- Insert master sends record
  insert into public.sends (id, sender_id, url, comment, thumbnail_url, source_link_id, created_at)
  values (v_send_id, v_sender_id, trim(p_url), p_comment, p_thumbnail_url, p_source_link_id, now());

  -- Fan out to each recipient
  foreach v_recipient_id in array p_recipient_ids loop
    if v_recipient_id <> v_sender_id then
      insert into public.send_recipients (id, send_id, recipient_id, status, reading_status, created_at)
      values (gen_random_uuid(), v_send_id, v_recipient_id, 'pending', 'to_read', now());
    end if;
  end loop;

  return v_send_id;
end;
$$;

-- 4. ATOMIC SUGGESTION ACCEPTANCE RPC
create or replace function public.accept_friend_suggestion(
  p_suggestion_id uuid,
  p_category_id uuid default null,
  p_folder_id uuid default null,
  p_custom_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_suggestion record;
  v_send record;
  v_sender record;
  v_new_link_id uuid := gen_random_uuid();
  v_title text;
  v_comment text;
  v_domain text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify suggestion exists and belongs to current user
  select * into v_suggestion from public.send_recipients
  where id = p_suggestion_id and recipient_id = v_user_id;

  if not found then
    raise exception 'Suggestion not found or unauthorized';
  end if;

  -- Fetch associated send
  select * into v_send from public.sends where id = v_suggestion.send_id;
  if not found then
    raise exception 'Associated send record not found';
  end if;

  -- Fetch sender profile
  select * into v_sender from public.profiles where id = v_send.sender_id;

  v_title := case
    when v_sender.username is not null then 'Shared by @' || v_sender.username
    else 'Suggested link'
  end;

  v_comment := coalesce(p_custom_comment, v_send.comment);

  -- Extract clean domain
  v_domain := nullif(split_part(regexp_replace(v_send.url, '^https?://(www\.)?', '', 'i'), '/', 1), '');

  -- Insert into recipient library
  insert into public.links (
    id,
    user_id,
    url,
    title,
    comment,
    domain,
    reading_status,
    thumbnail_url,
    thumbnail_source,
    category_id,
    folder_id,
    created_at,
    updated_at
  ) values (
    v_new_link_id,
    v_user_id,
    v_send.url,
    v_title,
    v_comment,
    v_domain,
    coalesce(v_suggestion.reading_status, 'to_read'),
    v_send.thumbnail_url,
    case when v_send.thumbnail_url is not null then 'auto' else 'none' end,
    p_category_id,
    p_folder_id,
    now(),
    now()
  );

  -- Mark suggestion as accepted and record resulting link ID
  update public.send_recipients
  set
    status = 'accepted',
    resulting_link_id = v_new_link_id,
    decided_at = now()
  where id = p_suggestion_id;

  return v_new_link_id;
end;
$$;

-- Permissions
grant execute on function public.send_link_to_recipients to authenticated;
grant execute on function public.accept_friend_suggestion to authenticated;
