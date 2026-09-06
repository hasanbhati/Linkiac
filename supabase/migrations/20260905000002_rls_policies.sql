-- 20260905000002_rls_policies.sql
-- Linkiac Row-Level Security Policies

-- 1. Enable RLS on all tables
alter table profiles enable row level security;
alter table categories enable row level security;
alter table folders enable row level security;
alter table tags enable row level security;
alter table links enable row level security;
alter table link_tags enable row level security;
alter table friendships enable row level security;
alter table sends enable row level security;
alter table send_recipients enable row level security;
alter table import_batches enable row level security;
alter table import_items enable row level security;
alter table admin_audit_logs enable row level security;

-- 2. Profiles policies
create policy "Authenticated users can view public profile info"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Categories policies
create policy "Users manage their own categories"
  on categories for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Folders policies
create policy "Users manage their own folders"
  on folders for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Tags policies
create policy "Users manage their own tags"
  on tags for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Links policies
create policy "Users manage their own links"
  on links for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Link-Tags join table policies
create policy "Users manage tags on their own links"
  on link_tags for all
  to authenticated
  using (
    exists (
      select 1 from links
      where links.id = link_tags.link_id and links.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from links
      where links.id = link_tags.link_id and links.user_id = auth.uid()
    )
  );

-- 8. Friendships policies
create policy "Users can view friendships they are part of"
  on friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

create policy "Users can create friend requests as requester"
  on friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "Users can update friendships they are part of"
  on friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id)
  with check (auth.uid() = requester_id or auth.uid() = recipient_id);

create policy "Users can delete friendships they are part of"
  on friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- 9. Sends policies
create policy "Users can view sends they initiated"
  on sends for select
  to authenticated
  using (auth.uid() = sender_id);

create policy "Users can insert sends they initiate"
  on sends for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- 10. Send Recipients policies
create policy "Recipients can view incoming suggestions and senders can view status"
  on send_recipients for select
  to authenticated
  using (
    recipient_id = auth.uid() or
    exists (
      select 1 from sends
      where sends.id = send_recipients.send_id and sends.sender_id = auth.uid()
    )
  );

create policy "Recipients can update their own received suggestions"
  on send_recipients for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "Senders can insert recipient rows during send"
  on send_recipients for insert
  to authenticated
  with check (
    exists (
      select 1 from sends
      where sends.id = send_recipients.send_id and sends.sender_id = auth.uid()
    )
  );

-- 11. Import Batches & Items
create policy "Users manage their own import batches"
  on import_batches for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own import items"
  on import_items for all
  to authenticated
  using (
    exists (
      select 1 from import_batches
      where import_batches.id = import_items.batch_id and import_batches.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from import_batches
      where import_batches.id = import_items.batch_id and import_batches.user_id = auth.uid()
    )
  );

-- 12. Admin Audit Logs (Admins can view, only system/service role inserts)
create policy "Admins can view audit logs"
  on admin_audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
