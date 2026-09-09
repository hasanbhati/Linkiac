-- supabase/seed.sql
-- Deterministic Seed Data for Linkiac

-- Note: When running with local Supabase Auth, mock profiles can be linked or created.
-- In local mock development mode, the app uses these demo profiles and fixtures.

-- Demo Admin Profile
insert into profiles (id, username, display_name, avatar_url, is_admin, status, created_at)
values (
  'a0000000-0000-0000-0000-000000000001',
  'admin_hasan',
  'Hasan (Admin)',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  true,
  'active',
  now() - interval '30 days'
) on conflict (id) do nothing;

-- Demo Regular User Profile (Sarah)
insert into profiles (id, username, display_name, avatar_url, is_admin, status, created_at)
values (
  'b0000000-0000-0000-0000-000000000002',
  'sarah_engineer',
  'Sarah Connor',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  false,
  'active',
  now() - interval '20 days'
) on conflict (id) do nothing;

-- Demo Friend Profile (Alex)
insert into profiles (id, username, display_name, avatar_url, is_admin, status, created_at)
values (
  'c0000000-0000-0000-0000-000000000003',
  'alex_curator',
  'Alex Rivera',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  false,
  'active',
  now() - interval '15 days'
) on conflict (id) do nothing;

-- Friendship between Hasan and Alex (Accepted)
insert into friendships (id, requester_id, recipient_id, status, created_at, responded_at)
values (
  'f0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'accepted',
  now() - interval '10 days',
  now() - interval '9 days'
) on conflict (id) do nothing;

-- Friendship request from Sarah to Hasan (Pending)
insert into friendships (id, requester_id, recipient_id, status, created_at)
values (
  'f0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'pending',
  now() - interval '1 days'
) on conflict (id) do nothing;

-- Categories for Admin
insert into categories (id, user_id, name, created_at)
values 
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Software Architecture', now() - interval '25 days'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Design & Aesthetics', now() - interval '20 days')
on conflict (id) do nothing;

-- Folders for Admin (Hierarchy: Software Architecture -> Web Development -> Next.js)
insert into folders (id, user_id, category_id, parent_folder_id, name, created_at)
values 
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, 'Web Development', now() - interval '24 days'),
  ('20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Next.js & React', now() - interval '23 days'),
  ('20000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', null, null, 'Standalone Reading List', now() - interval '18 days')
on conflict (id) do nothing;

-- Links for Admin (Exercising standard URLs, media, unconstrained free text)
insert into links (id, user_id, url, title, comment, domain, reading_status, thumbnail_url, thumbnail_source, category_id, folder_id, created_at, updated_at)
values
  (
    '40000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'https://nextjs.org/docs/app/building-your-application/routing',
    'Next.js App Router Documentation',
    'Key reference for layout nesting and server component streaming',
    'nextjs.org',
    'reading',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    'auto',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    now() - interval '20 days',
    now() - interval '20 days'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'Building Robust Systems with Event Sourcing',
    'Video talk on distributed state machines',
    'youtube.com',
    'done',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    'auto',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    now() - interval '14 days',
    now() - interval '14 days'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'instagram reel about brutalist design I want to review next month',
    'Brutalist Design Instagram Reference',
    'Saved text snippet without URL prefix',
    null,
    'to_read',
    null,
    'none',
    '10000000-0000-0000-0000-000000000002',
    null,
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'https://github.com/supabase/supabase',
    'Supabase The Open Source Firebase Alternative',
    'Check out real-time subscriptions and postgres extensions',
    'github.com',
    'to_read',
    'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=600&auto=format&fit=crop&q=80',
    'auto',
    null,
    null,
    now() - interval '2 days',
    now() - interval '2 days'
  )
on conflict (id) do nothing;

-- Send from Alex to Hasan (Incoming Suggestion in Hasan's Inbox)
insert into sends (id, sender_id, url, comment, thumbnail_url, source_link_id, created_at)
values (
  '50000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000003',
  'https://owasp.org/www-project-top-ten/',
  'Thought you would find this useful for the upcoming security audit!',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
  null,
  now() - interval '3 days'
) on conflict (id) do nothing;

insert into send_recipients (id, send_id, recipient_id, status, reading_status, created_at)
values (
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'pending',
  'to_read',
  now() - interval '3 days'
) on conflict (id) do nothing;
