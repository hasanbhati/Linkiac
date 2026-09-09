-- 20260908000003_retain_original_shared_titles.sql
-- Linkiac Migration: Retain original link titles across friend shares & inbox acceptance

-- 1. Add title column to public.sends if not exists
alter table public.sends add column if not exists title text;

-- 2. Update send_link_to_recipients RPC to accept p_title and store in public.sends
create or replace function public.send_link_to_recipients(
  p_url text,
  p_comment text default null,
  p_recipient_ids uuid[] default '{}',
  p_source_link_id uuid default null,
  p_thumbnail_url text default null,
  p_title text default null
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
  v_final_title text;
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

  -- Determine title: priority given to passed title, then source link title
  v_final_title := p_title;
  if (v_final_title is null or length(trim(v_final_title)) = 0) and p_source_link_id is not null then
    select title into v_final_title from public.links where id = p_source_link_id;
  end if;

  -- Insert master sends record with original title
  insert into public.sends (id, sender_id, url, title, comment, thumbnail_url, source_link_id, created_at)
  values (v_send_id, v_sender_id, trim(p_url), v_final_title, p_comment, p_thumbnail_url, p_source_link_id, now());

  -- Fan out to each recipient (excluding sender if accidentally included)
  foreach v_recipient_id in array p_recipient_ids loop
    if v_recipient_id <> v_sender_id then
      insert into public.send_recipients (id, send_id, recipient_id, status, reading_status, created_at)
      values (gen_random_uuid(), v_send_id, v_recipient_id, 'pending', 'to_read', now());
    end if;
  end loop;

  return v_send_id;
end;
$$;

-- 3. Update accept_friend_suggestion RPC to retain original title (omit 'Shared by @username')
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
  v_source_link record;
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

  -- Attempt to fetch source link if present
  if v_send.source_link_id is not null then
    select * into v_source_link from public.links where id = v_send.source_link_id;
  end if;

  -- Retain original title: send.title -> source_link.title -> url fallback
  v_title := coalesce(
    nullif(trim(v_send.title), ''),
    nullif(trim(v_source_link.title), ''),
    v_send.url
  );

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
    v_suggestion.reading_status,
    v_send.thumbnail_url,
    case when v_send.thumbnail_url is not null then 'auto'::public.thumbnail_source else 'none'::public.thumbnail_source end,
    p_category_id,
    p_folder_id,
    now(),
    now()
  );

  -- Update suggestion status
  update public.send_recipients
  set
    status = 'accepted',
    resulting_link_id = v_new_link_id,
    decided_at = now()
  where id = p_suggestion_id;

  return v_new_link_id;
end;
$$;
