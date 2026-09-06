# [App Name] — Engineering Specification

**Audience:** Senior engineer building this from scratch.
**Purpose:** Complete reference for architecture, data model, and feature behavior. Open decisions that need an engineering call are flagged explicitly in the final section rather than silently assumed.

---

## 1. Overview

A cross-platform (web + iOS + Android) link-saving app. Users save links from anywhere on the web — regular sites, Instagram/Facebook posts, reels, YouTube, or arbitrary text that isn't even a real URL — and organize them into categories and nested folders. A second, separate workspace lets users receive link suggestions from friends and accept or reject them into their own library. An admin panel (web only) lets the operator manage user accounts.

---

## 2. Tech Stack Reference

| Layer | Technology | Notes |
|---|---|---|
| Database | PostgreSQL via **Supabase** | Relational; needed for the self-referencing folder tree and join tables |
| Auth | **Supabase Auth** | Email/password; shared identity across web and mobile |
| File storage | **Supabase Storage** | Thumbnail images (auto-fetched or user-uploaded) |
| Realtime (optional) | Supabase Realtime | Not required for v1; noted as a later enhancement |
| Web app + admin panel | **Next.js** (App Router, TypeScript) | Single codebase, `/admin` is a protected route group |
| Styling (web) | **Tailwind CSS** | |
| Mobile | **Expo** (React Native, TypeScript) | Use **Expo Router** — file-based routing, mirrors Next.js App Router conventions |
| Styling (mobile) | **NativeWind** | Tailwind syntax on React Native |
| Data fetching/cache | **TanStack Query** | Shared hooks between web and mobile |
| Monorepo tooling | **Turborepo** + **pnpm workspaces** | |
| Web hosting | **Vercel** | Auto-deploy from GitHub |
| Mobile build/release | **EAS Build** + **EAS Submit** | Also enables **EAS Update** for OTA JS updates without a store resubmission |
| Transactional email | **Resend** (custom SMTP) | Supabase's built-in mailer is rate-limited and unsuitable for production signup volume |

---

## 3. Monorepo Structure

```
app/
├── apps/
│   ├── web/                 # Next.js — public app + /admin
│   └── mobile/               # Expo — iOS + Android
├── packages/
│   ├── shared/                # Types, Supabase client, TanStack Query hooks
│   └── config/                 # Shared ESLint/TS config
├── supabase/
│   ├── migrations/            # SQL migration files (source of truth for schema)
│   └── functions/              # Edge Functions
├── turbo.json
└── pnpm-workspace.yaml
```

Schema changes go through `supabase/migrations` and are applied with the Supabase CLI — this is the single source of truth, not manual dashboard edits.

---

## 4. Database Schema

```sql
-- Profiles: extends Supabase's built-in auth.users with app-specific fields
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  is_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

-- Categories: top-level, user-owned groups
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Folders: can belong to a category, stand alone, or nest inside another folder
create table folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  parent_folder_id uuid references folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Links: the core object. `url` is intentionally unconstrained free text.
create table links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  url text not null,                     -- NO format validation, NO check constraint — see §9.1
  title text,
  note text,
  thumbnail_url text,
  thumbnail_source text not null default 'none' check (thumbnail_source in ('auto', 'manual', 'none')),
  category_id uuid references categories(id) on delete set null,
  folder_id uuid references folders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Friendships: request/accept model (see §16, open decision #2)
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, recipient_id)
);

-- Sends: one row per "send" action, regardless of how many recipients
create table sends (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  url text not null,
  note text,
  thumbnail_url text,
  source_link_id uuid references links(id) on delete set null,  -- null if composed fresh, not from library
  created_at timestamptz not null default now()
);

-- Send recipients: fan-out join table, one row per recipient per send
create table send_recipients (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references sends(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  resulting_link_id uuid references links(id) on delete set null,  -- set on accept
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index on folders (parent_folder_id);
create index on links (user_id, folder_id);
create index on links (user_id, category_id);
create index on send_recipients (recipient_id, status);
```

### Recursive folder queries

Nesting is unlimited by schema design, which means fetching a folder's descendants (for cascade deletes, breadcrumbs, or moving a subtree) needs a recursive CTE:

```sql
with recursive folder_tree as (
  select id, name, parent_folder_id, category_id
  from folders
  where id = $1
  union all
  select f.id, f.name, f.parent_folder_id, f.category_id
  from folders f
  inner join folder_tree ft on f.parent_folder_id = ft.id
)
select * from folder_tree;
```

---

## 5. Row-Level Security

RLS is the primary access-control layer — the client (web or mobile) talks to Supabase directly using the anon key, and RLS decides what each request can see or touch. Every table above has RLS enabled.

Standard pattern, applied to `categories`, `folders`, and `links`:

```sql
alter table links enable row level security;

create policy "Users manage their own links"
  on links for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

| Table | Access rule |
|---|---|
| `profiles` | Any authenticated user can `select` (needed for username search); a user can `update` only their own row; `is_admin`/`status` are only writable via the service role (see §6) |
| `categories`, `folders`, `links` | Full CRUD restricted to `user_id = auth.uid()` |
| `friendships` | `select`/`update` allowed where `auth.uid()` is either `requester_id` or `recipient_id` |
| `sends` | `select` restricted to `sender_id = auth.uid()`; `insert` requires `sender_id = auth.uid()` |
| `send_recipients` | Recipient can `select`/`update` their own row (`recipient_id = auth.uid()`); sender can `select` (not update) rows joined through their own `sends` |

---

## 6. Backend Logic (Edge Functions)

Four pieces of logic don't fit a plain RLS-gated table write and need Supabase Edge Functions:

**`fetch-thumbnail`**
Input: a URL string. Tries Open Graph / link-preview scraping. On success, downloads the image and stores it in the `thumbnails` bucket, returns the storage URL. On failure (unreachable, blocked, or not a real URL — Instagram and Facebook in particular block unauthenticated scraping), returns `null` so the client falls back to the manual upload UI. Never throws on a bad URL — this must degrade gracefully, since the URL field is unvalidated by design.

**`send-link`**
Input: sender, url/note/source_link_id, array of recipient user IDs. Runs as a single transaction: one `sends` row, then N `send_recipients` rows. Must be atomic — a partial fan-out (some recipients written, others not) is a bug.

**`accept-suggestion`**
Input: `send_recipients.id`, target category/folder (or neither). Transaction: inserts a new `links` row, then updates the matching `send_recipients` row (`status='accepted'`, `resulting_link_id` = new link's id). Runs with the recipient's own auth context — no elevated privileges needed since they're only writing their own data.

**Admin actions** (`admin-suspend-user`, `admin-delete-user`, etc.)
Run using the **service role key**, called only from Next.js Route Handlers/Server Actions under `/admin`, each gated by an explicit `is_admin` check on the requesting user before the service-role client is touched. The service role key must never reach the browser bundle or the mobile app.

---

## 7. Storage

One bucket, `thumbnails`, holding both auto-fetched and user-uploaded images. Public read (thumbnails aren't sensitive), write restricted to the owning user's `user_id` folder prefix (e.g. `thumbnails/{user_id}/{link_id}.jpg`) via storage policy. Enforce a file size/type limit (e.g. 5MB, jpg/png/webp) on manual uploads client-side and again in the storage policy.

---

## 8. Authentication & Cross-Platform Sessions

Single Supabase Auth project backs both apps — same credentials work on web, iPhone, and Android by design, no extra sync layer needed.

- **Web**: `@supabase/ssr` for cookie-based sessions compatible with Next.js Server Components and Route Handlers.
- **Mobile**: `@supabase/supabase-js` with a custom `AsyncStorage`-backed storage adapter for session persistence between app launches.
- Admin gating: `is_admin` lives on `profiles`, checked server-side on every `/admin` request (middleware or layout-level check) — never trust a client-side flag for this.

---

## 9. Feature Specifications

### 9.1 Links — no format validation

The `links.url` column is plain text with no `CHECK` constraint and no client-side regex gate on save. A user must be able to save a broken link, a partial address, or a sentence with no URL in it, and it must succeed every time.

This has one real consequence the client needs to handle carefully: when rendering a saved "link" as a clickable element, don't assume it's a valid, safe href. Validate/sanitize at render time (e.g. only render as a clickable `<a href>` if it parses as `http(s)://...`; otherwise render as plain text) to avoid both broken links and potential `javascript:`-style injection through the free-text field.

### 9.2 Categories & Folders

- A link belongs to zero or one category, zero or one folder, independently.
- A folder can belong to a category, stand alone, or nest under another folder to any depth (self-referencing `parent_folder_id`).
- Deleting a category: `folders.category_id` is set to `null` (folder becomes standalone), not cascade-deleted.
- Deleting a folder: cascades to child folders (`on delete cascade` on `parent_folder_id`); links inside become unfiled (`folder_id` set to `null`).

### 9.3 Thumbnails

On link creation, call `fetch-thumbnail` asynchronously. While pending, show a placeholder. On success, `thumbnail_source = 'auto'`. On failure, prompt the user to upload manually (`thumbnail_source = 'manual'`). Users can override either at any time via edit.

### 9.4 Two Workspaces

- **My Library**: categories/folders/links tree, owned and private.
- **Suggestions Inbox**: rows from `send_recipients` where `recipient_id = auth.uid() and status = 'pending'`. Accept → `accept-suggestion` function. Reject → `status = 'rejected'` (row can be soft-deleted from the visible list; keep the row for audit/history rather than hard-deleting).

### 9.5 Friends

Username search (`ilike` on `profiles.username`, paginated). Request/accept flow via `friendships`. Only rows with `status = 'accepted'` populate the friend picker in the send flow.

### 9.6 Sending Links (broadcast)

Single `send-link` call handles both cases — sending an existing library link (`source_link_id` set) or a freshly typed URL (`source_link_id` null) — to one or many friends in one transaction. Each recipient's accept/reject is fully independent; nothing about one recipient's decision touches another's row.

### 9.7 Admin Panel

Web-only, under `/admin`, protected by the `is_admin` check in §8. Reads and writes go through Route Handlers using the service role key — the admin UI never queries `profiles` directly with the anon key for cross-user data, since RLS would block it anyway (by design).

Minimum viable screens:
- User list: username, email, signup date, status, search/filter.
- User detail: basic info, suspend/reactivate/delete actions.
- Simple counts: total users, total links.

---

## 10. Web App Structure (Next.js)

```
/                    → marketing/redirect
/login, /signup
/library
/library/category/[id]
/library/folder/[id]
/inbox
/friends
/settings
/admin                 (protected, is_admin required)
/admin/users
/admin/users/[id]
```

---

## 11. Mobile App Structure (Expo Router)

Mirrors the web route structure as file-based screens: `app/(tabs)/library`, `app/(tabs)/inbox`, `app/(tabs)/friends`, `app/(tabs)/settings`. No admin panel on mobile — admin is web-only by design, given it's an internal operator tool.

---

## 12. Shared Package (`packages/shared`)

- TypeScript types generated via `supabase gen types typescript` — regenerate on every schema change, don't hand-maintain.
- Supabase client factory (separate init for web SSR vs. mobile AsyncStorage, same underlying config).
- TanStack Query hooks: `useLibrary`, `useCategories`, `useFolders`, `useLinks`, `useFriends`, `useInbox`, `useSendLink`, `useAcceptSuggestion`. These are ~90% identical between web and mobile since both run React + TanStack Query — only the UI layer differs.

---

## 13. Security & Compliance Notes

- Service role key: server-only, never in any client bundle (web or mobile). Store as a Vercel/EAS secret, not a public env var.
- Free-text URL field: sanitize at render time (§9.1) — this is the main injection surface in the app.
- Since this will run in the EU (Poland), account deletion and data export need to satisfy GDPR — right to erasure and right to access apply to a real user base. Worth a short conversation with whoever handles compliance before launch about what "delete account" actually does to the user's rows (hard delete vs anonymize) and whether a self-serve data export is needed. This isn't legal advice — flagging it as a build requirement to confirm, not a solved problem.
- Rate-limit username search and friend requests to deter enumeration/spam.

---

## 14. Local Development Setup

- Node 18+, **pnpm**, **Supabase CLI**, **Docker Desktop** (the Supabase CLI runs local Postgres + Auth + Storage in Docker containers — the CLI handles this, no manual Docker work needed).
- Expo Go app (iOS/Android) for fast device testing without a full native build.
- VSCode extensions: ESLint, Prettier, Tailwind CSS IntelliSense.
- `supabase start` brings up the full local stack; `supabase db push` applies migrations.

---

## 15. Deployment Pipeline

| Component | Path to production |
|---|---|
| Web | GitHub → Vercel auto-deploy on push to `main`; PR preview deployments |
| Database | Migrations in `supabase/migrations` applied to a separate hosted Supabase project per environment (local → staging → prod) |
| Mobile | `eas build` → `eas submit` to App Store Connect / Google Play Console; `eas update` for OTA JS-only patches between store releases |
| Email | Resend configured as custom SMTP in the Supabase Auth settings for the hosted project |

---

## 16. Open Decisions for the Engineering Team

These are genuine calls that affect the schema/UX above — flagged rather than silently decided:

1. **Folder nesting depth** — schema allows unlimited nesting. Recommend a UI-enforced soft cap (e.g. 8–10 levels) to keep recursive queries and breadcrumb UI sane; not a hard schema constraint.
2. **Friend model** — spec assumes request/accept, not instant add-by-username. Confirm before building the friend UI.
3. **Category inheritance for nested folders** — currently a sub-folder's `category_id` is independent of its parent's. Recommend auto-inheriting from the root ancestor folder for UX consistency, enforced in the application layer (trigger or API logic), not the DB schema as written above.
4. **Thumbnail scraping approach** — self-hosted OG scraper vs. a third-party link-preview API (e.g. microlink.io, urlbox.io). Instagram/Facebook actively block unauthenticated scraping, so a third-party service is likely more reliable at the cost of a per-request fee. Recommend starting with a third-party API and revisiting if volume makes cost a concern.
5. **Account deletion semantics** — hard delete vs. soft-suspend-then-purge, tied to the GDPR note in §13.
