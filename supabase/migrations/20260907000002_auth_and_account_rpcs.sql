-- 20260907000002_auth_and_account_rpcs.sql
-- Linkiac Production Migration: User Account Self-Deletion & Security RPCs

-- Function to allow an authenticated user to permanently delete their own account (ACCT-04)
-- Deleting from auth.users cascades to public.profiles and all owned domain records
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_user_id uuid := auth.uid();
begin
  if calling_user_id is null then
    raise exception 'Unauthorized: Must be logged in to delete your account';
  end if;

  -- Delete from auth.users; foreign keys with ON DELETE CASCADE will purge profiles, links, categories, folders, tags, friendships
  delete from auth.users where id = calling_user_id;
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.delete_user_account() to authenticated;
