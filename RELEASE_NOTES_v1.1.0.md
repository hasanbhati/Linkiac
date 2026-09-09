# Linkiac Release Notes — v1.1.0

**Release Date:** September 7, 2026  
**Target Environments:** Web (Next.js 14 App Router) & Mobile (Expo SDK 57 / React Native)  
**Monorepo Version:** `1.1.0`

---

## Executive Summary

Linkiac v1.1.0 transitions the platform from a local-state / prototype stage into a production-grade, secure, multi-tenant cloud application. This milestone brings live Supabase authentication, server-side route guarding, device session independence, full mobile/web feature parity (folders, categories, account management, username-based login, avatars), friend discovery fixes, suggestions inbox RLS repairs, and a real-time operator administration portal.

---

## Detailed Changelog by Phase

### Phase 1: Security Hardening & Monorepo Hygiene

1. **Database Relational Integrity & RLS Restoration:**
   - Authored database migration `20260907000001_restore_security_and_constraints.sql`.
   - Purged all insecure `"Dev allow all..."` policies that permitted unauthenticated reads and writes.
   - Cleaned orphaned rows where `user_id IS NULL` and removed mock users (`a0000000...`, `b0000000...`, `c0000000...`) that did not exist in `auth.users`.
   - Re-established foreign keys with `ON DELETE CASCADE` (`profiles -> auth.users`, `links/categories/folders/tags -> profiles`).
   - Re-asserted multi-tenant Row-Level Security (RLS) across all 12 platform tables.
   - Deprecated `supabase/unified_sync_setup.sql` with prominent security warnings.

2. **Monorepo Cleanup & Build Optimization:**
   - Deleted dead `apps/web/capacitor.config.ts` and purged all `@capacitor/*` dependencies from `apps/web/package.json`.
   - Fixed `unrs-resolver: true` in `pnpm-workspace.yaml`.
   - Resolved React 18 / React 19 type cross-contamination via explicit path mappings in `apps/web/tsconfig.json`.
   - Re-enabled strict type-checking and ESLint during Next.js builds in `apps/web/next.config.mjs`.

---

### Phase 2: Live Supabase Authentication & Session Management

1. **Server-Side Route Guarding & Middleware:**
   - Built `@supabase/ssr` server client (`apps/web/src/lib/supabase/server.ts`) with cookie management.
   - Implemented Next.js edge middleware (`apps/web/src/middleware.ts`) that intercepts protected paths (`/library`, `/dashboard`, `/friends`, `/inbox`, `/settings`, `/admin`).
   - Automatically redirects unauthenticated users to `/login?redirectTo=...`, enforces `is_admin` for `/admin`, and redirects logged-in users away from auth screens.

2. **Web Authentication Flows:**
   - **Login (`/login`):** Supabase email/username + password authentication, Google OAuth sign-in, inline error feedback.
   - **Signup (`/signup`):** Account creation with email confirmation screen and metadata passing to database triggers.
   - **Auth Callback (`/auth/callback`):** Route Handler exchanging OAuth and PKCE verification tokens.
   - **Forgot / Reset Password (`/forgot-password`, `/reset-password`):** Complete password reset loop via Supabase Auth emails and recovery tokens.

3. **Mobile Authentication & Session Parity:**
   - Built native login/signup screen (`apps/mobile/app/login.tsx`) with `@react-native-async-storage/async-storage` session persistence.
   - Created startup auth gate (`apps/mobile/app/index.tsx`) ensuring automatic routing based on active session.
   - Subscribed to `onAuthStateChange` in mobile `AppContext.tsx` for real-time auth hydration.

4. **Independent Device Session Lifecycle:**
   - Verified session independence: logging out on web does not terminate mobile sessions, and logging out on mobile does not invalidate active web sessions.

5. **Self-Service Account Deletion:**
   - Created `public.delete_user_account()` RPC in `20260907000002_auth_and_account_rpcs.sql`.
   - Allows users to permanently purge their account and all personal links, categories, folders, tags, and friendships with full cascade.

---

### Phase 2.5: Cross-Platform Feature Parity & User Feedback Resolutions

1. **Mobile Folders & Categories:**
   - Created `ManageFoldersModal.tsx` for creating, color-coding, and managing categories and folders.
   - Integrated category filter pill strip, folder dropdown, and "+ Organize" action into `apps/mobile/app/(tabs)/library.tsx`.
   - Added category and folder selectors to `SaveLinkModal.tsx` and `LinkDetailModal.tsx`.

2. **Mobile Account Security (Email & Password):**
   - Added interactive "Change Email" and "Change Password" dialogs to `apps/mobile/app/(tabs)/settings.tsx`.

3. **Username Display, Editing & Uniqueness:**
   - Displayed `@username` across account settings on both Web and Mobile.
   - Added username edit inputs with real-time uniqueness validation against `public.profiles`.

4. **Dual-Identifier Login (Username or Email):**
   - Created secure RPC `public.get_email_by_username(p_username text)` in `20260907000003_profile_avatar_and_username_auth.sql`.
   - Updated Web and Mobile login screens to transparently resolve email when a username without an `@` symbol is entered.

5. **Profile Picture / Avatar Support:**
   - Provisioned `avatars` storage bucket and security policies in Supabase Storage.
   - Supported direct file upload to Supabase Storage on Web with instant preview, and custom avatar URL entry on Mobile.

6. **Friend Discovery Search:**
   - Replaced static mock search array with live `ilike` database queries against `public.profiles`.
   - Added dedicated "Find People" search tab in `apps/mobile/app/(tabs)/friends.tsx`.
   - Backfilled missing `profiles` rows for all existing `auth.users` (resolving discovery for all registered accounts).

7. **Friend Request Role Inversion Fix:**
   - Corrected request categorization into separate **Incoming Requests** (with Accept / Decline) and **Sent Requests** (with Awaiting Response / Cancel).
   - Ensured modals and cards always display the other party in the friendship rather than defaulting to the requester.

---

### Phase 2.6: Bug Fixes & Refinements

1. **Suggestions Inbox RLS & Hydration Fix:**
   - **Root Cause:** `public.sends` SELECT policy was restricted to `auth.uid() = sender_id`, blocking recipients from loading joined send details (resulting in `@friend`, an empty dark URL box, and no comments).
   - **Fix:** 
     - Added recursion-safe `SECURITY DEFINER` helper functions `is_send_recipient` and `is_send_sender`.
     - Updated RLS policies on `sends` and `send_recipients` allowing both sender and recipients to read shared suggestions.
     - Added secondary fallback hydration in `syncAllFromSupabase` on both Web and Mobile to batch-fetch missing send details.
     - Polished mobile `inbox.tsx` to render sender avatars, prevent empty URL containers, and render attached comments.

2. **Operator Admin Portal Real Data Refactor:**
   - Replaced static dummy mock array (`sarah_engineer`, `alex_curator`, etc.) with live Supabase data in `apps/web/src/app/(admin)/admin/page.tsx`.
   - Added live database RPCs:
     - `public.admin_get_users()`: Returns registered users with verified email from `auth.users`, role, status, and link counts.
     - `public.admin_toggle_user_status()`: Suspends / reactivates users with audit logging.
     - `public.admin_toggle_user_role()`: Promotes / demotes admins with a safeguard preventing removal of the last active admin.
     - `public.admin_delete_user()`: Permanently deletes users with cascade.
   - Added live "Refresh Data" action and real platform aggregate metrics.

3. **Removal of Obsolete "Reset Demo Data" Prototype Button:**
   - Removed the legacy `Reset Demo Data` button and `resetToSeed` function from `apps/web/src/components/Navbar.tsx` and `app-context.tsx`.
   - Replaced it with a live **"Sync Library"** action (`RefreshCw`) for on-demand cloud sync.

---

## Database Migrations Summary

All migrations are located in `supabase/migrations/`:
1. `20260907000001_restore_security_and_constraints.sql` — Insecure policy removal, orphan cleanup, cascading foreign keys, multi-tenant RLS restoration.
2. `20260907000002_auth_and_account_rpcs.sql` — GDPR self-deletion RPC (`delete_user_account`).
3. `20260907000003_profile_avatar_and_username_auth.sql` — Username login RPC, missing profile backfill, avatar storage bucket, sends RLS fix, operator admin RPCs (`admin_get_users`, `admin_toggle_user_status`, `admin_toggle_user_role`, `admin_delete_user`).

---

## Verification & Test Results

| Gate | Scope | Command | Result |
|---|---|---|:---:|
| **Dependency Sync** | Monorepo root | `pnpm install` | ✅ **0 errors** |
| **Shared Typecheck** | `@linkiac/shared` | `pnpm --filter @linkiac/shared exec tsc --noEmit` | ✅ **0 errors** |
| **Web Typecheck** | `@linkiac/web` | `pnpm --filter @linkiac/web exec tsc --noEmit` | ✅ **0 errors** |
| **Mobile Typecheck** | `@linkiac/mobile` | `pnpm --filter @linkiac/mobile exec tsc --noEmit` | ✅ **0 errors** |
| **Unit Test Battery** | Shared utils & security | `pnpm turbo run test` | ✅ **17 / 17 passed** |
| **Web Production Build** | Next.js App Router | `pnpm turbo run build` | ✅ **0 errors** |
