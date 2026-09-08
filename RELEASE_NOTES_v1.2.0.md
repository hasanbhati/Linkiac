# Linkiac Release Notes — v1.2.0

**Release Date:** September 8, 2026  
**Target Environments:** Web (Next.js 14 App Router) & Mobile (Expo SDK 57 / React Native)  
**Monorepo Version:** `1.2.0`  
**Git Tag:** `v1.2.0`  
**Target Branch:** `main`

---

## Executive Summary

Linkiac v1.2.0 represents the completion of the full-stack product baseline, delivering seamless cross-platform parity between Web and Mobile, universal link thumbnail extraction, atomic friend recommendations, full native mobile file capabilities (bookmark import/export), and multi-tenant security hardening.

This milestone covers all engineering deliverables across **Phase 3 (Live Data Layer & Sync)**, **Phase 4 (Backend Privileged Endpoints & RPCs)**, **Phase 5 (Mobile Parity & Native Capabilities)**, critical vulnerability remediations from the production security audit, and runtime stabilization fixes.

---

## Detailed Changelog by Phase

### Phase 3: Live Data Layer, Synchronization & Multi-Tenant Scoping

1. **User-Namespaced Cache Isolation (`linkiac_cache_${userId}`):**
   - Eliminated cross-user data leakage by namespacing client-side caches with the authenticated user's unique UUID (`linkiac_cache_${userId}` on Web and `@linkiac_cache_${userId}` on Mobile).
   - Added strict validation before cache hydration: cached data is only applied if `parsed.userId === session.user.id`.
   - On user switch or logout, private cached records are instantly flushed, preventing transient flashes of previous accounts.

2. **Unprivileged Client Initialization:**
   - Replaced legacy hardcoded mock administrator state in `constants.ts` and `AppContext.tsx` with a clean guest baseline (`is_admin: false`, `id: ''`, `username: ''`).
   - Completely prevents unauthenticated or regular users from momentarily seeing the Operator Administration portal during startup hydration.

3. **Multi-Tenant Query Scoping (Defense-in-Depth):**
   - Added explicit client-side tenant scoping (`.eq('user_id', authUser.id)`) across all data-fetching queries for links, categories, folders, tags, and friendships in both Web and Mobile contexts.

---

### Phase 4: Backend Privileged Endpoints, Atomic Transactions & Universal Thumbnails

1. **Atomic Database Transactions via PL/pgSQL RPCs:**
   - Authored database migration `20260908000001_thumbnails_storage_and_atomic_rpcs.sql`.
   - **`send_link_to_recipients()`:** Executes multi-friend broadcast sends within an isolated, atomic transaction (creates 1 `sends` master record and N `send_recipients` entries, preventing partial send states).
   - **`accept_friend_suggestion()`:** Atomically creates the recipient's new library link and transitions the suggestion status to `accepted` in one call.

2. **Supabase Storage Infrastructure (`thumbnails` & `avatars`):**
   - Configured public-read storage buckets for `thumbnails` and `avatars`.
   - Hardened upload and update policies: authenticated users can only write to their own isolated folder: `(storage.foldername(name))[1] = auth.uid()::text`.

3. **Universal Link Preview & Thumbnail Scraper Engine:**
   - **SSRF & Security Validation:** Integrated OWASP CIDR / IP validation (`packages/shared/src/security/ssrf.ts`) to block requests to private networks, loopbacks, and cloud metadata endpoints.
   - **Social Crawler Emulation:** Scrapes sensitive platforms (Facebook, Instagram, Twitter/X) using `facebookexternalhit/1.1` and `Twitterbot/1.0` User-Agents to prevent HTTP 400/403 bot blocks and extract clean OpenGraph metadata.
   - **Fast oEmbed Resolvers:** Integrated native oEmbed endpoints for YouTube, Spotify, TikTok, Reddit, and Vimeo.
   - **Universal Domain Fallback Engine (`packages/shared/src/utils/url.ts`):** High-resolution brand assets for major platforms plus Google's 256px domain favicon service (`https://www.google.com/s2/favicons?domain=${domain}&sz=256`), guaranteeing that every valid web link receives a rich default thumbnail.
   - **Live Preview Modals & Cards:** Debounced 500ms preview fetching in `SaveLinkModal` on both Web and Mobile with image aspect ratio containers in link cards.

4. **Recommendation Inbox Scoping Fix:**
   - Resolved issue where senders saw their own outgoing recommendations in their Suggestions Inbox:
     - Removed unintended optimistic updates to sender's inbox state on broadcast.
     - Added `.eq('recipient_id', authUser.id)` query filtering and client-side validation (`s.recipient_id === authUser.id && s.send?.sender_id !== authUser.id`).
     - Added recipient checks on Inbox badge counters in navigation bars and mobile tab bars.

---

### Phase 5: Mobile App Feature Parity & Native Capabilities

1. **Native Document Picker & OS File Sharing:**
   - Installed and integrated `expo-document-picker`, `expo-file-system`, and `expo-sharing` (SDK 57).
   - **Bookmark Import (`MOB-12`):** Pick Netscape `.html` bookmark files from the native device file manager, parse hierarchical folder structures via `@linkiac/shared`, and batch-insert folders and links into Supabase.
   - **Bookmark Export (`MOB-12`):** Generate standards-compliant Netscape HTML files from the user's library and invoke the native iOS / Android system share sheet.

2. **Pull-to-Refresh (`MOB-09`):**
   - Attached native `RefreshControl` with themed indigo indicators across all main mobile tabs: `Library`, `Inbox`, `Friends`, and `Dashboard`.

3. **Mobile Bulk Selection Mode (`BULK-01` to `BULK-05`):**
   - Added multi-select mode activated via header "Select" button or card long-press gesture.
   - Sticky floating action bar with item counter, "Select All", "Bulk Move" (to category or folder), and "Bulk Delete" with native confirmation alerts.

4. **Folder Destination Picker on Mobile Suggestion Acceptance:**
   - Mobile `inbox.tsx` opens an interactive modal allowing users to organize accepted suggestions directly into specific categories or folders (or save as unfiled).

5. **Send Link to Friend on Mobile:**
   - Added `SendLinkToFriendsModal.tsx` on Mobile: allows users to select accepted friends, compose an optional message, and dispatch recommendations directly from link details or library selection mode.

6. **In-App Alerts & Tab Bar Badges:**
   - Dynamic `tabBarBadge` on the Mobile Inbox tab for pending recommendations count, and on the Friends tab for incoming friend requests.
   - Background diff detection: triggers an in-app `Alert.alert('New Recommendation Received!')` when a friend sends a link while the app is active.

7. **Device Photo Upload on Mobile:**
   - Added native photo picker in Mobile `settings.tsx` with 5MB file size validation and direct upload to Supabase `avatars` storage.
   - Replaced exposed internal database storage URLs in profile avatar inputs with a clean `Custom photo uploaded from device [Remove]` badge.

8. **Fixed Profile Edit Form State Overwriting:**
   - Fixed display name auto-reverting when typing in Settings by decoupling background polling from local form inputs and memoizing user updates.

---

### Security Audit & Production Hardening

Authored and applied database migration `20260908000002_security_hardening_rls_and_isolation.sql`:

1. **Privilege Escalation Prevention (CRITICAL):**
   - Created PostgreSQL trigger `protect_profile_privileged_fields` that strictly reverts or rejects any attempt by regular users to modify `is_admin` or `status` on `public.profiles`.
2. **Inverted Friendship Authorization Fix (HIGH):**
   - Fixed RLS policy on `public.friendships` to restrict acceptance/rejection actions strictly to `auth.uid() = recipient_id`, preventing senders from unilaterally accepting their own requests.
3. **Storage Bucket Folder Ownership Lockdown (HIGH):**
   - Secured `storage.objects` update and delete policies for `avatars` and `thumbnails` to enforce folder-level ownership (`(storage.foldername(name))[1] = auth.uid()::text`).

---

### Runtime & Bundler Stability Fixes

1. **React Rules of Hooks Fix in Web `SaveLinkModal`:**
   - Corrected conditional early return placed before `useEffect` hook, resolving runtime errors when opening the modal.
2. **Windows Metro Bundler Watch Collision Fix:**
   - Isolated `apps/mobile/metro.config.js` watch folders strictly to `[packages/shared]` and blocked `apps/web` and `.next`, resolving `ENOENT` watcher crashes on Windows.
3. **Mobile `Maximum update depth exceeded` Infinite Re-render Loop:**
   - Resolved React infinite loop in mobile `AppContext.tsx`:
     - Decoupled `syncAllFromSupabase` dependency array to `[]`.
     - Separated cache persistence into a dedicated, non-cascading `useEffect`.
     - Removed cascading manual `persistState` helper calls and cleaned dependency arrays across all action handlers.
     - Stored `router` in `routerRef` to keep navigation calls stable.

---

## Verification & Test Results

| Test Gate | Scope | Command | Result |
|---|---|---|:---:|
| **Web Production Build** | Next.js 14 App Router | `pnpm --filter @linkiac/web exec next build` | ✅ **17/17 routes compiled (0 errors)** |
| **Mobile Typecheck** | Expo SDK 57 / React Native | `pnpm --filter @linkiac/mobile exec tsc --noEmit` | ✅ **0 errors** |
| **Web Typecheck** | Next.js TypeScript | `pnpm --filter @linkiac/web exec tsc --noEmit` | ✅ **0 errors** |
| **Shared Unit Tests** | Vitest (SSRF, URL, Bookmarks) | `pnpm --filter @linkiac/shared test` | ✅ **26/26 passed (100%)** |
| **Route Smoke Test** | All Web & Mobile Screens | Manual navigation & dev server check | ✅ **0 crashes, 0 loops** |
