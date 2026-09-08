-- ============================================================================
-- Migration: 20260908000002_security_hardening_rls_and_isolation.sql
-- Description: Hardens RLS policies, prevents self-promotion privilege escalation,
--              secures storage objects by user folder, and restricts friendship
--              acceptance to recipients only.
-- ============================================================================

-- 1. PREVENT PRIVILEGE ESCALATION ON PROFILES
-- Ensure regular users cannot elevate themselves to is_admin=true or change status
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_is_admin boolean;
begin
  -- If is_admin or status is being modified
  if (new.is_admin is distinct from old.is_admin) or (new.status is distinct from old.status) then
    -- Check if current authenticated caller is a verified admin
    select coalesce(p.is_admin, false) into calling_is_admin
    from public.profiles p
    where p.id = auth.uid();

    -- If not admin and not service role, reject or revert privileged field changes
    if calling_is_admin is not true and auth.role() <> 'service_role' then
      new.is_admin := old.is_admin;
      new.status := old.status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_fields on public.profiles;
create trigger trg_protect_profile_privileged_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();

-- 2. RESTRICT FRIENDSHIP UPDATE TO RECIPIENTS ONLY
-- Senders (requesters) must NEVER be able to unilaterally approve their own requests
drop policy if exists "Users can update friendships they are part of" on public.friendships;
create policy "Only recipients can accept or reject friendship requests"
  on public.friendships for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- 3. HARDEN STORAGE POLICIES FOR AVATARS & THUMBNAILS
-- Restrict updates and deletes to files stored under the user's own UUID folder
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    -- Avatars: update/delete restricted to user's own folder
    drop policy if exists "Authenticated users can update avatar" on storage.objects;
    create policy "Users can update own avatar only"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'avatars' and
        (storage.foldername(name))[1] = auth.uid()::text
      );

    drop policy if exists "Authenticated users can delete avatar" on storage.objects;
    create policy "Users can delete own avatar only"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'avatars' and
        (storage.foldername(name))[1] = auth.uid()::text
      );

    -- Thumbnails: update/delete restricted to user's own folder
    drop policy if exists "Authenticated users can update thumbnail" on storage.objects;
    create policy "Users can update own thumbnail only"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'thumbnails' and
        (storage.foldername(name))[1] = auth.uid()::text
      );

    drop policy if exists "Authenticated users can delete thumbnail" on storage.objects;
    create policy "Users can delete own thumbnail only"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'thumbnails' and
        (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
