# Linkiac Release Notes — v2.0.0

**Release Date:** September 9, 2026  
**Target Environments:** Web (Next.js 14 App Router) & Mobile (Expo SDK 57 / React Native 0.86)  
**Monorepo Version:** `2.0.0`  
**Git Tag:** `v2.0.0`  
**Target Branch:** `main`  
**Status:** **Production Ready**

---

## Executive Summary

Linkiac **v2.0.0** is a landmark major release marking the transition from development to an enterprise-grade, production-ready system. 

This release delivers end-to-end fidelity across the friend recommendation pipeline, full UI and feature parity between the Web and Mobile applications, resolution of all 17 security and architectural findings from the Senior QA Audit, battery-conscious lifecycle polling, and database compliance with Supabase Security Linter standards.

---

## Detailed Changelog by Capability

### 1. Recommendation Title & Note Fidelity System
- **Sender Title & Note Customization:**
  - Added dedicated, editable "Link Title" and "Personal Note" fields to `SendLinkModal` (Web) and `SendLinkToFriendsModal` (Mobile).
  - Senders can modify the title specifically for the recommendation without changing their own library bookmark title.
- **Backend Schema & Backward-Compatible RPCs:**
  - Added `title` column to `public.sends` table in Supabase.
  - Deployed upgraded 6-parameter `send_link_to_recipients(p_url, p_comment, p_recipient_ids, p_source_link_id, p_thumbnail_url, p_title)` RPC.
  - Implemented 3-tier graceful client fallback (Tier 1: 6-param RPC -> Tier 2: 5-param RPC -> Tier 3: Direct relational insert) ensuring zero downtime and compatibility across heterogeneous client versions.
- **Receiver Title Preservation:**
  - Eliminated domain name fallbacks and unintended title overwriting (`"shared by @..."`). The receiver’s inbox displays the sender's exact custom title.
- **Interactive Acceptance Modal on Mobile & Web:**
  - Added full acceptance modal in Mobile (`apps/mobile/app/(tabs)/inbox.tsx`) matching Web (`AcceptSuggestionModal.tsx`).
  - Recipients can review the sender's note, select destination category/folder, and customize or retain the bookmark title prior to saving into their library.

---

### 2. Notification & Mobile UX Refinements
- **Non-Intrusive Notification Badges:**
  - Replaced abrupt and intrusive modal alert popups (`Alert.alert('New Recommendation Received!')`) with clean, real-time unread counter badges on the Mobile Inbox tab bar (`tabBarBadge`).
- **iOS Presentation Collision Fix (`GAP-05`):**
  - Resolved iOS `UIViewController` modal hierarchy freeze caused by nesting `<SendLinkToFriendsModal>` inside `<LinkDetailModal>`.
  - Lifted share modal to screen level via `onShareToFriends` callback, ensuring clean modal stacking on iOS.

---

### 3. Full Mobile App Feature Parity
- **Category Management & Folder Assignment (`GAP-01`):**
  - Built a dedicated "Categories" management tab inside Mobile `ManageFoldersModal.tsx` supporting color-coded Category creation and deletion.
  - Enabled category assignment directly during folder creation.
  - Added horizontal Category filter chips bar to Mobile `library.tsx` with instant badge-filtered views.
- **Mobile Reading Analytics Dashboard (`GAP-06`):**
  - Added 4 KPI metric cards to Mobile `dashboard.tsx`: **Total Links**, **To Read**, **Reading**, and **Done**.
  - Added dynamic 3-color reading progress distribution bar matching the Web dashboard.
- **Mobile Password Recovery Flow (`GAP-07`):**
  - Added "Forgot password?" link and modal to Mobile `login.tsx`.
  - Dispatches Supabase password reset emails with deep link handling (`linkiac://`).

---

### 4. Data Consistency & Architecture Modernization
- **Automatic Folder Category Inheritance (`BUG-03`):**
  - Resolved issue where filing a link into a folder stripped the folder's parent `category_id`.
  - Links filed via `addLink`, `bulkMoveLinks`, or `acceptSuggestion` now automatically inherit the folder's `category_id`.
- **Legacy Tags Deprecation (`20260909000001_remove_tags.sql`):**
  - Dropped obsolete `tags` and `link_tags` tables from the database.
  - Removed deprecated tag state, types, and filter references across `@linkiac/shared`, Web, and Mobile.
- **Friendship Integrity Constraints (`SEC-07`):**
  - Enforced `CHECK (requester_id <> recipient_id)` to prevent self-friend requests.
  - Created bidirectional unique index `UNIQUE (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id))` preventing reverse duplicate friendships.
- **Pre-Registration Username Validation (`BUG-02`):**
  - Added real-time username availability check prior to registration on Web and Mobile, preventing silent `@user1` suffixing.

---

### 5. Senior QA Security Audit Remediations
- **Credential-Gated RPC Authentication (`SEC-01`):**
  - Replaced insecure public 1-parameter username lookup RPC with 2-parameter `get_email_by_username(p_username, p_password)`.
  - Uses `extensions.crypt` to verify bcrypt password hashes before disclosing emails, eliminating user enumeration vulnerabilities.
- **SSRF & Open Proxy Mitigation (`SEC-02`):**
  - Gated `/api/preview` with active session authentication (`supabase.auth.getUser()`).
  - Implemented manual redirect loop (max 3 hops) with RFC 1918 / private IP validation on every hop, blocking SSRF redirect bypasses.
- **Re-Authentication for Credential Updates (`SEC-03`):**
  - Added current password verification via `signInWithPassword` before permitting password changes in Web and Mobile Settings.
- **Bookmark Scheme Sanitization (`SEC-04`):**
  - Hardened Netscape bookmark export in `@linkiac/shared` to strictly enforce `http:` and `https:` schemes, preventing `javascript:` and `data:` URL execution.
- **Admin Self-Harm Safeguards (`SEC-05`):**
  - Added database triggers preventing administrators from accidentally demoting or suspending their own accounts.
- **Recommendation Anti-Spam Gating (`SEC-06`):**
  - Hardened `send_link_to_recipients` to verify the sender account is active and all recipients are accepted mutual friends.
- **Input Protocol Validation (`SEC-08`):**
  - Added URL format validation in Mobile `SaveLinkModal` before triggering network fetches.

---

### 6. Performance & Resource Optimization
- **Battery-Saving Mobile Polling (`PERF-01`):**
  - Gated sync polling with React Native `AppState`. Polling timers halt immediately when the app is backgrounded and resume on foreground with an instant sync.
- **Browser Tab Throttling (`PERF-02`):**
  - Web sync interval adjusted to 20 seconds, pausing automatically when `document.hidden === true`.
- **Hydration Guard (`BUG-01`):**
  - Added `!isLoaded` hydration guard in Web Admin portal, eliminating transient 403 "Access Denied" flashes on page refresh.

---

### 7. Supabase Database Linter & Infrastructure Compliance
Authored and deployed migration `20260909000004_linter_and_security_hardening.sql`:
- **Immutable Function Search Paths (`0011_function_search_path_mutable`):**
  - Set `search_path = public, pg_temp` across all 16 database functions.
- **Storage Bucket Listing Lockdown (`0025_public_bucket_allows_listing`):**
  - Cleaned duplicate and broad listing policies on `storage.objects` for `thumbnails` and `avatars`.
  - Restricted directory listing strictly to authenticated owners (`(storage.foldername(name))[1] = auth.uid()::text`).
- **Function Execution Privileges (`0028_anon_security_definer_function_executable`):**
  - Revoked public and anonymous `EXECUTE` privileges on internal database triggers and admin functions.
  - Granted explicit `EXECUTE` on user RPCs only to the `authenticated` role.

---

## Verification & Test Record

| Test Suite / Gate | Scope | Result | Details |
| :--- | :--- | :---: | :--- |
| **Vitest Unit Suite** | `@linkiac/shared` | ✅ **30 / 30 Passed** | SSRF validation, URL handling, Netscape bookmark generator |
| **Web Typecheck** | `@linkiac/web` | ✅ **0 Errors** | Strict TypeScript compilation (`tsc --noEmit`) |
| **Mobile Typecheck** | `@linkiac/mobile` | ✅ **0 Errors** | Strict TypeScript compilation (`tsc --noEmit`) |
| **Production Web Build** | `@linkiac/web` | ✅ **17 / 17 Routes** | Next.js 14 production bundle & static generation verified |
| **Database Linter** | Supabase SQL | ✅ **Compliant** | All warnings remediated via migration patch `0004` |

---

## Deployment & Upgrade Notes

1. **Database Migration:**
   - Execute [supabase/migrations/20260909000004_linter_and_security_hardening.sql](file:///f:/App%20Development/LinkIac/supabase/migrations/20260909000004_linter_and_security_hardening.sql) in your Supabase SQL Editor to clear all Supabase linter warnings.
2. **Web Deployment:**
   - Deploy `main` branch to Vercel/hosting provider. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.
3. **Mobile Build:**
   - Run `eas build --platform all` inside `apps/mobile` for App Store & Google Play distribution.
