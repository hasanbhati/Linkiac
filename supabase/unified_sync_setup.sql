-- ==============================================================================
-- [DEPRECATED / DO NOT RUN IN PRODUCTION OR STAGING]
-- WARNING: This script was an unhardened development workaround that dropped
-- relational foreign keys and bypassed multi-tenant Row-Level Security.
-- Use canonical migrations in supabase/migrations/ instead.
-- ==============================================================================

-- 1. PROFILES: Relax auth.users FK for demo/system accounts and allow full access
alter table public.profiles drop constraint if exists profiles_id_fkey;
drop policy if exists "Dev allow all on profiles" on public.profiles;
create policy "Dev allow all on profiles" on public.profiles for all using (true) with check (true);

-- Insert baseline demo profiles so foreign keys and relations work across devices
insert into public.profiles (id, username, display_name, avatar_url, is_admin, status)
values
  ('a0000000-0000-0000-0000-000000000001', 'admin_hasan', 'Hasan (Admin)', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', true, 'active'),
  ('b0000000-0000-0000-0000-000000000002', 'sarah_engineer', 'Sarah Connor', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', false, 'active'),
  ('c0000000-0000-0000-0000-000000000003', 'alex_curator', 'Alex Rivera', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', false, 'active')
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  is_admin = excluded.is_admin;

-- 2. CATEGORIES: Allow flexible access and seed initial categories
alter table public.categories alter column user_id drop not null;
alter table public.categories drop constraint if exists categories_user_id_fkey;
drop policy if exists "Dev allow all on categories" on public.categories;
create policy "Dev allow all on categories" on public.categories for all using (true) with check (true);

insert into public.categories (id, user_id, name)
values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Software Architecture'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Design & Aesthetics'),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Security')
on conflict (id) do nothing;

-- 3. FOLDERS: Allow flexible access and seed initial folders
alter table public.folders alter column user_id drop not null;
alter table public.folders drop constraint if exists folders_user_id_fkey;
drop policy if exists "Dev allow all on folders" on public.folders;
create policy "Dev allow all on folders" on public.folders for all using (true) with check (true);

insert into public.folders (id, user_id, category_id, parent_folder_id, name)
values
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, 'Web Development'),
  ('20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Next.js & React')
on conflict (id) do nothing;

-- 4. LINKS: Allow flexible access and seed initial links
alter table public.links alter column user_id drop not null;
alter table public.links drop constraint if exists links_user_id_fkey;
drop policy if exists "Dev allow all on links" on public.links;
create policy "Dev allow all on links" on public.links for all using (true) with check (true);

insert into public.links (id, user_id, url, title, comment, domain, reading_status, thumbnail_url, thumbnail_source, category_id, folder_id)
values
  ('30000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'https://nextjs.org', 'Next.js App Router Documentation', 'Key reference for layout nesting and server component streaming', 'nextjs.org', 'reading', null, 'none', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'https://owasp.org', 'OWASP Top 10 Security Risks', 'Essential web application security checklist and guidelines', 'owasp.org', 'to_read', null, 'none', '10000000-0000-0000-0000-000000000003', null),
  ('30000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Just an arbitrary idea snippet or note saved for later', 'Saved arbitrary idea snippet', 'Saved free-text snippet without URL scheme — tested by Save Anything requirement', null, 'to_read', null, 'none', null, null),
  ('30000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'https://youtube.com', 'YouTube - Distributed Systems Deep Dive', 'Lecture on consensus protocols and event sourcing', 'youtube.com', 'done', null, 'none', '10000000-0000-0000-0000-000000000001', null)
on conflict (id) do nothing;

-- 5. FRIENDSHIPS: Allow flexible access and seed initial friendships
drop policy if exists "Dev allow all on friendships" on public.friendships;
create policy "Dev allow all on friendships" on public.friendships for all using (true) with check (true);

insert into public.friendships (id, requester_id, recipient_id, status, created_at, responded_at)
values
  ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'accepted', now() - interval '10 days', now() - interval '9 days'),
  ('40000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'pending', now() - interval '1 day', null)
on conflict (id) do nothing;

-- 6. SENDS & SUGGESTIONS INBOX: Allow flexible access and seed initial suggestions
drop policy if exists "Dev allow all on sends" on public.sends;
create policy "Dev allow all on sends" on public.sends for all using (true) with check (true);

drop policy if exists "Dev allow all on send_recipients" on public.send_recipients;
create policy "Dev allow all on send_recipients" on public.send_recipients for all using (true) with check (true);

insert into public.sends (id, sender_id, url, comment, thumbnail_url, created_at)
values
  ('50000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'https://owasp.org/www-project-top-ten/', 'Thought you would find this useful for the upcoming security audit!', null, now() - interval '3 days')
on conflict (id) do nothing;

insert into public.send_recipients (id, send_id, recipient_id, status, reading_status, created_at)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'pending', 'to_read', now() - interval '3 days')
on conflict (id) do nothing;

-- 7. TAGS: Allow flexible access
alter table public.tags alter column user_id drop not null;
alter table public.tags drop constraint if exists tags_user_id_fkey;
drop policy if exists "Dev allow all on tags" on public.tags;
create policy "Dev allow all on tags" on public.tags for all using (true) with check (true);

drop policy if exists "Dev allow all on link_tags" on public.link_tags;
create policy "Dev allow all on link_tags" on public.link_tags for all using (true) with check (true);
