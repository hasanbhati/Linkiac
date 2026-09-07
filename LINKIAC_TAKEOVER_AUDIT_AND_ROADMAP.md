# LINKIAC — SENIOR SOFTWARE ENGINEER TAKEOVER AUDIT & PRODUCTION ROADMAP

**Document Title:** Linkiac Codebase Takeover Audit, Gap Analysis & 100% Completion Plan  
**Target Release:** Production Baseline v1.0 (Web + iOS + Android)  
**Author:** Senior Staff Software Engineer & Mobile Systems Architect  
**Status:** Audit Complete — Ready for Engineering Alignment  
**Location:** Workspace Root (`/LINKIAC_TAKEOVER_AUDIT_AND_ROADMAP.md`)  
**Reference Standards:**
- Product Requirements Definition ([Linkiac_Product_Requirements_Definition_v1.0.docx](file:///f:/App%20Development/LinkIac/Linkiac_Product_Requirements_Definition_v1.0.docx))
- Engineering Specification ([engineering-spec.md](file:///f:/App%20Development/LinkIac/engineering-spec.md))
- Engineering Best Practices Playbook ([Linkiac_Engineering_Best_Practices_v1.0.docx](file:///f:/App%20Development/LinkIac/Linkiac_Engineering_Best_Practices_v1.0.docx))
- Previous Team's Handover Plan ([IMPLEMENTATION_PLAN.md](file:///f:/App%20Development/LinkIac/IMPLEMENTATION_PLAN.md))

---

## 1. Executive Summary & Takeover Assessment

As your incoming Senior Software Engineer taking over the Linkiac platform, I have conducted a deep forensic code audit of the entire repository: scanning every file, database migration, API route, context provider, test suite, and configuration across the monorepo.

### The Bottom Line Assessment

The previous development team built an **attractive visual prototype with strong client-side design and shared utility foundations**, but they **cut severe corners on live backend integration, security, authentication, and cross-platform parity**.

When the previous team ran into hurdles with authentication, relational foreign keys, and PostgreSQL Row-Level Security (RLS), **they did not solve the problems — they dismantled the security and integrity model**:
1. **Database Integrity Gutted:** In `supabase/unified_sync_setup.sql`, they explicitly dropped `user_id NOT NULL` constraints, deleted foreign keys referencing `auth.users`, and replaced multi-tenant RLS policies with open `using (true) with check (true)` rules.
2. **Authentication is Completely Fake:** The login and signup screens simulate authentication with `setTimeout(..., 400)`. Google OAuth is a dummy click that navigates to `/library`. The entire app falls back to a hardcoded mock user (`@admin_hasan`).
3. **State Architecture is Polling LocalStorage (Not Production-Grade):** Instead of using TanStack Query as specified, both Web and Mobile apps maintain giant monolithic React contexts that cache everything in `localStorage` / `AsyncStorage` and hammer the database with an unthrottled 4-second polling loop (`setInterval`).
4. **Admin Panel & Social Features are Mocked:** The `/admin` portal renders a hardcoded list of 4 fake users; suspending, promoting, or deleting users only modifies local React component state. Searching for new friends in `/friends` queries an in-memory array of 3 dummy users.
5. **GDPR Account Deletion is Simulated:** Clicking "Delete Account" executes `localStorage.clear()` and redirects to `/login`. No user records, links, or folders are deleted from PostgreSQL.
6. **Mobile App Has Significant Parity Gaps:** The Expo mobile app is a flat list with no category/folder navigation drawer, no bulk selection mode, no pull-to-refresh, and empty buttons for bookmark import/export.
7. **Build Errors Were Silenced:** In `apps/web/next.config.mjs`, TypeScript checking and linting were explicitly disabled (`ignoreBuildErrors: true`) to suppress hundreds of compilation errors caused by conflicting React 18 / React 19 type definitions.

### Monorepo Architecture Overview

```
LinkIac Monorepo (pnpm workspaces + Turborepo)
├── apps/
│   ├── web/               # Next.js 14 App Router (Tailwind CSS, Framer Motion)
│   └── mobile/            # Expo SDK 57 / React Native (Expo Router)
├── packages/
│   ├── shared/            # TypeScript contracts, URL utils, SSRF validator, Netscape parser/gen
│   └── config/            # Base tsconfig
└── supabase/
    ├── migrations/        # Canonical PostgreSQL schema, RLS policies, cycle triggers
    ├── seed.sql           # Test fixtures
    ├── unified_sync_setup.sql # [CRITICAL DEBT] Dev script that dropped FKs and opened RLS
    └── fix_handle_new_user.sql # Trigger patch for auth.users profile creation
```

---

## 2. Part A: What Has Been Done and How

Below is a detailed breakdown of every system, module, and feature that has been built, how it is implemented under the hood, and its current operating status.

### 2.1 Shared Domain Package (`packages/shared`) — *High Quality Foundation*
The `packages/shared` package is the cleanest part of the existing codebase. It provides platform-agnostic business logic and data contracts shared between web and mobile:

* **Data Contracts & Types ([packages/shared/src/types/index.ts](file:///f:/App%20Development/LinkIac/packages/shared/src/types/index.ts)):**
  - Fully defines domain entities: `Profile`, `Category`, `Folder`, `Tag`, `Link`, `Friendship`, `Send`, `SendRecipient`, `ImportBatch`, `ImportItem`, `AdminAuditLog`, `DomainStat`, and `LibraryFilter`.
  - Enums defined: `ReadingStatus` (`to_read`, `reading`, `done`), `ThumbnailSource` (`auto`, `manual`, `none`), `UserStatus` (`active`, `suspended`), `FriendshipStatus`, `SuggestionStatus`.
* **URL & Domain Parsing ([packages/shared/src/utils/url.ts](file:///f:/App%20Development/LinkIac/packages/shared/src/utils/url.ts)):**
  - `parseNormalizedDomain()`: Safely extracts registrable hostnames from free-text URLs (e.g., handles missing protocols like `github.com/repo`, normalizes casing, and strips `www.` or `www2.` prefixes). Excludes malformed strings and plain sentences without throwing.
  - `isSafeWebUrl()`: Protects against XSS injection by verifying protocol is strictly `http:` or `https:`. Rejects `javascript:`, `file:`, `data:`, and arbitrary text.
  - `ensureUrlProtocol()`: Formats clean external links with `https://`.
* **SSRF Security Validator ([packages/shared/src/security/ssrf.ts](file:///f:/App%20Development/LinkIac/packages/shared/src/security/ssrf.ts)):**
  - Implements OWASP-compliant pre-fetch validation for preview scrapers.
  - Evaluates IPv4 and IPv6 addresses against private and reserved CIDRs: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, AWS/GCP metadata (`169.254.169.254`, `metadata.google.internal`), CG-NAT (`100.64.0.0/10`), multicast, and loopbacks.
  - Blocks internal domain TLDs (`.local`, `.internal`, `.localhost`, `.lan`, `.corp`).
* **Netscape Bookmark Parser & Generator ([packages/shared/src/bookmarks/](file:///f:/App%20Development/LinkIac/packages/shared/src/bookmarks)):**
  - `parseNetscapeBookmarks()`: Safe regex-based tokenizer that extracts hierarchical `<H3>` folder structures, `<A HREF>` links, creation dates (`ADD_DATE`), and favicons without constructing executable browser DOM (XSS-safe).
  - `generateNetscapeBookmarks()`: Generates standards-compliant Netscape bookmark HTML files compatible with Chrome, Safari, Firefox, and Edge. Accurately renders nested `<DL><p>` folder structures, category groupings, and unfiled links.
* **Zod Schemas ([packages/shared/src/validation/schemas.ts](file:///f:/App%20Development/LinkIac/packages/shared/src/validation/schemas.ts)):**
  - Complete validation schemas for mutations: `createLinkSchema`, `sendLinkSchema`, `bulkMoveSchema`, `bulkTagSchema`, `bulkDeleteSchema`, `acceptSuggestionSchema`.
  - Invariant verified: `createLinkSchema.url` is an unconstrained string (`z.string().min(1)`), honoring the PRD "Save Anything" rule.
* **Unit Test Suite:**
  - 17 unit tests across 3 suites (`url.test.ts`, `ssrf.test.ts`, `bookmarks.test.ts`) executed with Vitest — **100% passing**.

---

### 2.2 Database Schema & Migrations (`supabase/migrations`) — *Well Structured on Paper*
The canonical migration files represent a thoughtful relational design:

* **Schema Definition (`20260905000001_initial_schema.sql`):**
  - 12 tables matching the engineering specification.
  - `links.url` is plain `text` with **no check constraints**, fulfilling the "Save Anything" requirement.
  - Self-referencing folder tree via `folders.parent_folder_id references folders(id) on delete cascade`.
  - Case-insensitive unique username index: `idx_profiles_username_lower on profiles (lower(username))`.
  - Multi-recipient suggestion fan-out: `sends` (1 per broadcast) + `send_recipients` (1 per friend).
* **Database Triggers & Procedures (`20260905000003_functions_and_triggers.sql`):**
  - `check_folder_cycle()`: High-performance PL/pgSQL trigger that checks folder ancestry up to depth 50 to strictly block circular parent-child moves and self-parenting.
  - `update_updated_at_column()`: Automatically updates `links.updated_at` timestamps.
  - `get_folder_subtree(uuid)`: Recursive CTE SQL function for querying folder descent trees.
  - `handle_new_user()`: Trigger on `auth.users` to automatically populate `public.profiles`.

---

### 2.3 Web Application (`apps/web`) — *Rich Visual UI with Client State*
Built with Next.js 14 App Router, Tailwind CSS, Framer Motion, and Lucide React.

* **Layout & Navigation:**
  - Responsive layout with desktop `Navbar`, collapsible `Sidebar`, and mobile `MobileBottomNav`.
  - Aesthetic: Dark-mode-first aesthetic with zinc neutrals and indigo accents matching the PRD specification.
* **My Library Screen ([apps/web/src/app/(app)/library/page.tsx](file:///f:/App%20Development/LinkIac/apps/web/src/app/(app)/library/page.tsx)):**
  - Filter by folder, category, unfiled, reading status (`to_read`, `reading`, `done`), tags (strict AND semantics), and real-time search query.
  - HTML5 Drag-and-Drop:
    - Folders and link cards are draggable.
    - Drop onto Category: files link to category and clears folder.
    - Drop onto Folder: files link to folder and inherits parent category.
    - Drop onto Unfiled / All Links: clears category and folder.
  - Non-Drag Accessibility Alternative:
    - Full `MoveLinkModal.tsx` and context menu actions for keyboard/touch users.
  - Bulk Selection Mode (`BULK-01` to `BULK-05`):
    - Select mode toggle, select all, visual badge count, `BulkActionBar.tsx` with bulk move, bulk tagging, and bulk delete with count confirmation.
* **Suggestions Inbox Screen ([apps/web/src/app/(app)/inbox/page.tsx](file:///f:/App%20Development/LinkIac/apps/web/src/app/(app)/inbox/page.tsx)):**
  - Visually distinct workspace for incoming suggestions.
  - Cards show sender avatar, username, sender comment, target URL/text, and recipient reading status.
  - Interactive `AcceptSuggestionModal.tsx` allowing destination folder/category selection and note customization before filing.
* **Friends Screen ([apps/web/src/app/(app)/friends/page.tsx](file:///f:/App%20Development/LinkIac/apps/web/src/app/(app)/friends/page.tsx)):**
  - Displays accepted friends list and incoming requests.
  - Send link modal integration for single or broadcast sharing.
* **Dashboard Screen ([apps/web/src/app/(app)/dashboard/page.tsx](file:///f:/App%20Development/LinkIac/apps/web/src/app/(app)/dashboard/page.tsx)):**
  - Metrics cards: Total links, To Read, Reading, Done.
  - Visual reading progress breakdown bar.
  - Ranked bar chart of most frequently saved web domains using `parseNormalizedDomain()`.
* **Settings Screen ([apps/web/src/app/(app)/settings/page.tsx](file:///f:/App%20Development/LinkIac/apps/web/src/app/(app)/settings/page.tsx)):**
  - Netscape bookmark `.html` file upload, parsing, and duplicate detection against saved links.
  - Full review modal showing pre-selected non-duplicates and unselected duplicates (`BMK-04`).
  - Netscape HTML export trigger downloading `linkiac_bookmarks.html`.
* **API Route Handlers:**
  - `POST /api/preview`: Server-side Open Graph scraper with SSRF protection, timeout, and 512KB payload limits.
  - `POST /api/bookmarks/export`: Netscape HTML generation endpoint.

---

### 2.4 Mobile Application (`apps/mobile`) — *Expo / React Native Setup*
Built with Expo SDK 57, React Native 0.86, and Expo Router.

* **Routing Structure:**
  - Standard tab navigation: `library`, `inbox`, `friends`, `dashboard`, `settings`.
* **Screens & Modals:**
  - `MobileLibraryScreen`: FlatList rendering of saved links with search and status badges.
  - `SaveLinkModal`: Slide-up modal with raw URL input, title, comment, status picker, and tag adder.
  - `LinkDetailModal`: Detail modal displaying raw text, note, tags, domain, and external browser launch.
  - `FriendDetailModal` & `SendFriendLinkModal`: Modals to view friend details and compose suggestions.
  - External link handler using `expo-linking` with `isSafeWebUrl()` validation.

---

## 3. Part B: The Reality Check — Critical Flaws, Mocks & Unfinished Engineering

While the visual UI gives the appearance of a functioning app, inspecting the data and network layer reveals why the previous team was unable to ship. The following critical issues must be resolved:

| Category | Finding in Codebase | Severity | Impact |
|---|---|:---:|---|
| **Database Security** | `supabase/unified_sync_setup.sql` dropped `user_id NOT NULL` and replaced RLS with open `using (true) with check (true)` | **CRITICAL (P0)** | Cross-tenant data leakage. Any user can read, overwrite, or delete any other user's links, folders, or profiles. |
| **Authentication** | `login/page.tsx` & `signup/page.tsx` use `setTimeout(..., 400)`. Google OAuth is a dummy click. | **CRITICAL (P0)** | No real user registration or login. The app is hardcoded to a mock user (`admin_hasan`). |
| **State Management** | Monolithic `app-context.tsx` uses `localStorage` cache and polls Supabase every 4 seconds (`setInterval`). | **HIGH (P0)** | Not scalable; wastes network and battery; leads to race conditions and out-of-sync tabs. TanStack Query hooks were never implemented. |
| **Admin Panel** | `/admin/page.tsx` operates entirely on a hardcoded React `useState` array of 4 users. | **CRITICAL (P0)** | Admin management is completely fake. No database queries, no service role key, and no server-side route guards. |
| **User Discovery** | `/friends/page.tsx` searches a hardcoded array of 3 dummy users. | **HIGH (P0)** | Real users cannot find each other or send friend requests in the live database. |
| **GDPR / Deletion** | "Delete Account" in `settings/page.tsx` merely runs `localStorage.clear()`. | **CRITICAL (P0)** | Violates GDPR right to erasure (`ACCT-04`). User data is never deleted from the database. |
| **Thumbnail Storage** | No file upload input exists; user can only paste image URLs. No Supabase Storage integration. | **HIGH (P0)** | Users cannot upload local image files (`THMB-04`), and auto-fetched images are not cached in private storage. |
| **Backend Atomicity** | `supabase/functions/` does not exist. `send-link` and `accept-suggestion` run client-side. | **HIGH (P0)** | Partial writes can occur if a client disconnects mid-transaction. |
| **Mobile Parity** | Mobile library lacks category/folder drawer, bulk actions, and pull-to-refresh. | **HIGH (P0)** | Mobile users cannot navigate folder trees or organize links in bulk. |
| **Build & Tooling** | `next.config.mjs` sets `ignoreBuildErrors: true` to suppress React 18/19 type conflicts. ESLint is unconfigured. | **HIGH (P1)** | Type safety is disabled in CI/CD. Codebase fails `tsc --noEmit` with hundreds of errors. |

---

## 4. Part C: Exhaustive PRD Gap Analysis (Matrix)

The table below audits every functional requirement defined in the Product Requirements Definition (PRD) v1.0 against the actual code implementation:

### 4.1 Authentication & Account Management
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **AUTH-01** | Email/Password Signup | Email, password, unique username | **Fake.** Form uses `setTimeout` and routes to `/library`. No Supabase Auth call. | ❌ **0%** |
| **AUTH-02** | Google OAuth Login | Google login with unique username prompt | **Fake.** Button executes `router.push('/library')`. No OAuth flow. | ❌ **0%** |
| **AUTH-03** | Login Flow | Email/password login; block suspended users | **Fake.** Uses `setTimeout`. Suspended status is never checked against DB. | ❌ **0%** |
| **AUTH-04** | Forgot/Reset Password | Password reset request & email completion | **Missing.** No `/forgot-password` or `/reset-password` pages exist. | ❌ **0%** |
| **AUTH-05** | Protected Routes | Server-side session verification | **Missing.** No Next.js middleware exists. Unauthenticated users can load all routes. | ❌ **0%** |
| **AUTH-06** | Username Rules | Case-insensitive globally unique username | Schema index exists (`idx_profiles_username_lower`), but signup has no server check. | ⚠️ **40%** |
| **AUTH-07** | Session Persistence | Sessions survive browser/app restarts | AsyncStorage configured on mobile, but web relies on localStorage fallback. | ⚠️ **50%** |
| **ACCT-01** | Change Email | User can change email with verification | **Fake.** Form in `settings/page.tsx` just toggles a local success state. | ❌ **0%** |
| **ACCT-02** | Change Password | Current + new password verification | **Fake.** Form only checks string length in local state. No Supabase Auth update. | ❌ **0%** |
| **ACCT-04** | Delete Account | Typed "delete my account" confirmation | **Fake.** Executes `localStorage.clear()` only. DB records are not deleted. | ❌ **10%** |
| **ACCT-05** | Deletion Completeness | Cascade delete of user-owned records | Foreign key cascade exists in initial schema, but no backend endpoint triggers it. | ⚠️ **30%** |

### 4.2 My Library: Link Capture & Organization
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **LINK-01** | Create Link | URL, title, comment, category, folder, tags | **Done on Web.** Full modal with all fields. Mobile modal functional. | ✅ **90%** |
| **LINK-02** | Free-Text URL Field | Accepts broken URLs and arbitrary sentences | **Done.** Schema has no check constraints; tested and verified. | ✅ **100%** |
| **LINK-03** | Default Status | Newly created link defaults to "To Read" | **Done.** Enforced in schema and modals. | ✅ **100%** |
| **LINK-04** | Edit All Fields | Edit URL, title, comment, filing, tags | **Done on Web.** `SaveLinkModal` handles editing. Mobile modal is read-only. | ⚠️ **70%** |
| **LINK-05** | Delete Link | Delete owned link permanently | **Done.** Functional on web and mobile via context. | ✅ **90%** |
| **LINK-07** | Card Grid Layout | Visual card grid with thumbnail emphasis | **Done.** Clean responsive layout with thumbnail support. | ✅ **95%** |
| **LINK-09** | Open Behavior | External link opens only if valid web URL | **Done.** Validated via `isSafeWebUrl()` on web and mobile. | ✅ **100%** |
| **ORG-01** | Categories CRUD | Create, rename, delete categories | **Done on Web.** Can add/delete in sidebar. Rename UI missing. | ⚠️ **80%** |
| **ORG-02** | Folders CRUD | Top-level, categorized, or nested folders | **Done on Web.** Full recursive folder creation. | ✅ **90%** |
| **ORG-03** | Unlimited Nesting | Self-referencing recursive folder tree | **Done.** Supported in DB schema, tree component, and CTE helper. | ✅ **100%** |
| **ORG-07** | Folder Integrity | Cycle prevention on reparenting | **Done.** Enforced client-side and via database trigger `check_folder_cycle`. | ✅ **100%** |
| **DND-01** | Drag Links | Drag link cards onto categories/folders | **Done on Web.** HTML5 DnD fully wired in `FolderTree.tsx`. | ✅ **90%** |
| **DND-02** | Drop Semantics | Category = clear folder; Folder = inherit cat | **Done on Web.** Handled in `app-context.tsx`. | ✅ **100%** |
| **DND-06** | Touch / Non-Drag | Accessible Move modals for all operations | **Done on Web.** `MoveLinkModal.tsx` and bulk move available. | ✅ **100%** |

### 4.3 Thumbnails, Previews & Media Storage
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **THMB-01** | Auto-Fetch Preview | Open Graph / Twitter metadata scraper | **Partial.** `/api/preview` works, but returns external URL; doesn't store in S3/Supabase. | ⚠️ **60%** |
| **THMB-03** | Failure Tolerance | Malformed URL/scraping failure never blocks | **Done.** Scraper fails gracefully with `success: false`. | ✅ **100%** |
| **THMB-04** | Custom Upload | User can upload local image files | **Missing.** Only a text input for image URLs exists. No file picker or storage bucket. | ❌ **0%** |
| **THMB-05** | Replace/Remove | User can replace or remove thumbnail | **Partial.** Can edit text field; cannot upload or delete stored file. | ⚠️ **40%** |
| **THMB-06** | Server Safety | SSRF checks, private IP blocking, timeouts | **Done.** Comprehensive SSRF validation unit-tested and enforced in `/api/preview`. | ✅ **100%** |

### 4.4 Tags, Reading Status & Search
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **TAG-01** | Free-Text Tags | Arbitrary tags per user; no global list | **Done.** Users create arbitrary tags in modal. | ✅ **100%** |
| **TAG-03** | Many-to-Many | Many tags per link; many links per tag | **Done.** Supported via `link_tags` join table and context. | ✅ **90%** |
| **TAG-06** | Tag Filtering | Filter library by one or more tags | **Done on Web.** Multi-tag AND filter functional in `library/page.tsx`. | ✅ **100%** |
| **STAT-01** | Reading Status | Exactly 3 values: To Read, Reading, Done | **Done.** Enforced across types, schema, and UI chips. | ✅ **100%** |
| **STAT-04** | Instant Save | Status update persists immediately | **Done.** Quick-toggle updates state and DB without full form. | ✅ **90%** |
| **SRCH-01** | Library Search | Search title, URL, comment, tags | **Done on Web & Mobile.** Real-time search filter implemented. | ✅ **100%** |
| **SRCH-03** | Combined Filters | Search + tags + status + folder/category | **Done on Web.** Unified `useMemo` filter in `library/page.tsx`. | ✅ **100%** |

### 4.5 Bulk Actions
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **BULK-01** | Selection Mode | Select toggle button / checkbox mode | **Done on Web.** Select mode with card checkboxes. Missing on mobile. | ⚠️ **50%** |
| **BULK-02** | Bulk Move | Move selected links to category/folder | **Done on Web.** `BulkActionBar` modal triggers `bulkMoveLinks`. | ⚠️ **60%** |
| **BULK-03** | Bulk Tag | Add tags to selected links | **Done on Web.** `bulkTagLinks` in `BulkActionBar`. | ⚠️ **60%** |
| **BULK-04** | Bulk Delete | Delete selected links with count prompt | **Done on Web.** Confirmation prompt with selection count. | ⚠️ **60%** |

### 4.6 Friends & Suggestion Sharing
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **FRND-01** | Discover Users | Search by public username | **Fake.** Searches a hardcoded array of 3 dummy users. No DB query. | ❌ **10%** |
| **FRND-02** | Send Request | Send friend request to discovered user | **Fake.** Adds to a local React `Set`. No DB insert into `friendships`. | ❌ **10%** |
| **FRND-03** | Accept / Decline | Accept/decline mutual friendship | **Partial.** Updates DB if friend exists, but discovery is broken. | ⚠️ **50%** |
| **FRND-06** | Send Eligibility | Only accepted friends are eligible recipients | **Enforced in UI.** Filter checks `status === 'accepted'`. | ⚠️ **70%** |
| **SEND-01** | Send Existing | Send library link to friends | **Done.** Modal selects accepted friends and creates suggestions. | ⚠️ **70%** |
| **SEND-02** | Compose Fresh | Type arbitrary URL to send without saving | **Done.** Supported in `SendLinkModal.tsx`. | ✅ **90%** |
| **SEND-04** | Broadcast Send | One send action targets multiple friends | **Done on Web.** Multi-select friend picker supported. | ⚠️ **80%** |
| **SEND-05** | Independent Copy | 1 independent suggestion per recipient | Schema designed for it (`send_recipients`), but lacks atomic transaction. | ⚠️ **60%** |
| **INBX-01** | Separate Workspace| Suggestions Inbox visually distinct | **Done.** Independent route `/inbox` and tab on mobile. | ✅ **100%** |
| **INBX-03** | Accept Suggestion | File into category/folder; creates link | **Done on Web.** `AcceptSuggestionModal` files link. Missing dialog on mobile. | ⚠️ **70%** |
| **INBX-04** | Decline Suggestion| Removes suggestion from recipient's inbox | **Done.** Updates `send_recipients.status = 'rejected'`. | ✅ **90%** |

### 4.7 Dashboard & Bookmarks Import/Export
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **DASH-01** | Domain Extraction | Normalize host domains for analytics | **Done.** Handled via `parseNormalizedDomain()` in shared package. | ✅ **100%** |
| **DASH-03** | Private Ranking | Descending frequency counts | **Done.** Visual cards and ranked bars in `/dashboard`. | ✅ **90%** |
| **BMK-01** | Import Netscape | Accept `.html` bookmark file | **Done on Web.** File upload handler parses HTML. Missing on mobile. | ⚠️ **60%** |
| **BMK-02** | Recreate Hierarchy| Imported folders become standalone folders | **Done.** Parser extracts folder tree; context saves standalone folders. | ✅ **90%** |
| **BMK-03** | Duplicate Review | Flag duplicates; review screen | **Done on Web.** Pre-selects non-duplicates, flags duplicates (`BMK-04`). | ✅ **100%** |
| **BMK-06** | Export Netscape | Download standard `.html` bookmark file | **Done on Web.** Generates Netscape file via `/api/bookmarks/export`. | ⚠️ **70%** |

### 4.8 Admin Panel
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **ADM-01** | Protected Route | Route accessible only to `is_admin` users | **Client-only check.** No server-side middleware or route guard. | ❌ **15%** |
| **ADM-02** | User Table | Full user list with username, email, role, date | **Fake.** Hardcoded array of 4 dummy users. | ❌ **10%** |
| **ADM-03** | Search & Filter | Filter by active/suspended and role | **Fake.** Filters the in-memory dummy array. | ❌ **15%** |
| **ADM-05** | Suspend User | Suspend active user account | **Fake.** Mutates local React state; no DB update or session revocation. | ❌ **10%** |
| **ADM-06** | Reactivate User | Reactivate suspended user account | **Fake.** Mutates local React state. | ❌ **10%** |
| **ADM-07** | Delete User | Permanently delete user and data | **Fake.** Removes item from local React state. | ❌ **10%** |
| **ADM-08** | Promote / Demote | Change user role with self-demote safeguards | **Fake logic.** Safeguard logic written, but mutates only React state. | ❌ **15%** |
| **ADM-10** | Aggregate Stats | Platform-wide user and link counts | **Fake.** Computed from the 4 dummy users. | ❌ **10%** |

### 4.9 Mobile & Cross-Platform Packaging
| ID | Requirement | PRD Spec | Actual Implementation State | Status |
|---|---|---|---|:---:|
| **MOB-01** | Safe Area Top | Notch / status bar padding | **Done.** Configured via `react-native-safe-area-context`. | ✅ **90%** |
| **MOB-02** | Safe Area Bottom | Home indicator clearance | **Done.** Bottom tab bar incorporates safe area insets. | ✅ **90%** |
| **MOB-09** | Pull to Refresh | Touch pull-to-refresh on library & inbox | **Missing.** `RefreshControl` is not added to FlatLists. | ❌ **0%** |
| **MOB-11** | External Links | Open valid URLs in system browser | **Done.** `expo-linking` handles URLs safely with scheme checks. | ✅ **100%** |
| **MOB-12** | Native File Access | Bookmark import/export on mobile | **Missing.** Settings buttons have no `onPress` actions. | ❌ **0%** |
| **MOB-14** | Store Ready | EAS configuration, splash, icons | **Unfinished.** Base `app.json` exists; EAS build profiles missing. | ⚠️ **30%** |

---

## 5. Part D: What is Remaining to Reach 100% Production Readiness

To transform Linkiac into a rock-solid, production-grade application matching the PRD and Engineering Spec, the remaining work is divided into 6 engineering phases:

### Phase 1: Security Hardening & Database Integrity Restoration (P0 — Immediate)
* **Re-establish Strict PostgreSQL Constraints:**
  - Re-apply `NOT NULL` constraints on `user_id` across `links`, `categories`, `folders`, `tags`.
  - Re-attach foreign keys referencing `profiles(id)` and `auth.users(id)` with `ON DELETE CASCADE`.
* **Lock Down Row-Level Security (RLS):**
  - Drop the permissive `"Dev allow all..."` policies.
  - Enforce tenant isolation so users can only `SELECT`, `INSERT`, `UPDATE`, `DELETE` rows matching `auth.uid() = user_id`.
  - Re-verify cross-user isolation for `friendships` and `send_recipients`.
* **Clean Monorepo & Dependencies:**
  - Remove dead Capacitor files (`capacitor.config.ts`, `@capacitor/*` dependencies) from `apps/web/package.json`.
  - Align React 18 / React 19 types across monorepo packages to eliminate the hundreds of `tsc --noEmit` errors.
  - Re-enable TypeScript checking in `apps/web/next.config.mjs` (`ignoreBuildErrors: false`).
  - Configure ESLint for `@linkiac/web` and `@linkiac/mobile` so `pnpm turbo run lint` passes cleanly.

### Phase 2: Live Supabase Authentication & Session Management (P0)
* **Live Web Authentication:**
  - Replace dummy `setTimeout` in `apps/web/src/app/(auth)/login/page.tsx` and `signup/page.tsx` with live `supabase.auth.signInWithPassword` and `supabase.auth.signUp`.
  - Implement Next.js App Router Auth Callback handler (`/auth/callback/route.ts`).
  - Implement Google OAuth sign-in flow via `supabase.auth.signInWithOAuth({ provider: 'google' })`.
  - Add missing `/forgot-password` and `/reset-password` pages.
* **Server-Side Route Protection (Next.js Middleware):**
  - Implement `apps/web/src/middleware.ts` using `@supabase/ssr`.
  - Automatically redirect unauthenticated users visiting `/(app)/*` or `/(admin)/*` to `/login`.
  - Enforce server-side `is_admin === true` verification for `/(admin)/*`.
* **Live Mobile Authentication:**
  - Add login/signup flow to `apps/mobile` backed by `@supabase/supabase-js` and `AsyncStorage`.
  - Configure deep linking callback scheme (`linkiac://auth/callback`) for OAuth returns.
* **Real Account Management & GDPR Deletion:**
  - Wire real email update via `supabase.auth.updateUser({ email })` with email confirmation.
  - Wire real password change via `supabase.auth.updateUser({ password })`.
  - Implement secure server-side account deletion (`ACCT-04`): invoking backend deletion that cascades through owned links, folders, categories, friendships, and auth records, while preserving links already accepted into friends' libraries.

### Phase 3: Live Data Layer with TanStack Query & Shared Hooks (P0)
* **Centralize Query Hooks in `packages/shared`:**
  - Migrate away from the monolithic 4-second polling in `app-context.tsx`.
  - Build idiomatic TanStack Query hooks:
    - `useLibrary(filters)`
    - `useCategories()`
    - `useFolders()`
    - `useFriends()`
    - `useInbox()`
    - `useDomainStats()`
    - `useCreateLinkMutation()`, `useUpdateLinkMutation()`, `useDeleteLinkMutation()`
    - `useBulkMoveMutation()`, `useBulkTagMutation()`, `useBulkDeleteMutation()`
* **Optimistic UI & Cache Management:**
  - Provide instant UI updates for drag-and-drop moves and status toggles with automatic rollback on network failure.
  - Eliminate the CPU-intensive 4-second polling loop and replace with targeted cache invalidation.

### Phase 4: Backend Privileged Endpoints & Atomic Transactions (P0)
* **Supabase Storage Bucket (`thumbnails`):**
  - Provision public-read `thumbnails` bucket with strict RLS: writes restricted to `auth.uid() = (storage.foldername(name))[1]`.
  - Add native file upload (`<input type="file">` on web; image picker on mobile) with 5MB cap and MIME validation.
  - Update `/api/preview` to download scraped preview images directly to the user's storage bucket rather than hotlinking external URLs.
* **Atomic Broadcast Send & Suggestion Acceptance:**
  - Implement `send-link` as an atomic backend transaction (1 `sends` row + N `send_recipients` rows).
  - Implement `accept-suggestion` as an atomic transaction (inserts new `links` row under recipient and marks suggestion `accepted`).
* **Live Admin API Route Handlers:**
  - Create protected Route Handlers (`/api/admin/users`, `/api/admin/users/[id]`, `/api/admin/stats`).
  - Gated by server-side `is_admin` check before initializing the Supabase `service_role` client.
  - Operations: real user list with pagination/search, suspend, reactivate, permanent delete, promote, demote.
  - Enforce safeguards: block self-demotion, block removal of the last remaining admin.

### Phase 5: Mobile App Feature Parity & Native Capabilities (P0)
* **Folder Tree Navigation Drawer:**
  - Replace the flat link list in `apps/mobile/app/(tabs)/library.tsx` with a sliding drawer or bottom sheet showing:
    - All Links / Unfiled views.
    - Category list with collapsible nested folder trees.
    - Badge counts and active filter indicator.
* **Bulk Selection Mode on Mobile:**
  - Long-press card gesture to enter multi-select mode (`BULK-01`).
  - Bottom action sheet: Bulk Move, Bulk Tag, Bulk Delete (`BULK-02` to `BULK-05`).
* **Native Bookmark Import / Export:**
  - Install `expo-document-picker`, `expo-file-system`, and `expo-sharing`.
  - Wire Settings "Import Browser Bookmarks" to launch native document picker, parse bookmarks with `@linkiac/shared`, and show review modal.
  - Wire "Export My Library" to generate Netscape HTML, save to cache, and trigger native OS share sheet.
* **Pull-to-Refresh & Modals:**
  - Add `RefreshControl` to `library.tsx` and `inbox.tsx`.
  - Add folder destination picker dialog to mobile `inbox.tsx` on accept.
  - Upgrade `LinkDetailModal.tsx` to support full in-place editing.

### Phase 6: Automated Testing & CI/CD Pipeline (P1)
* **Automated Test Coverage:**
  - Web E2E smoke suite (Playwright): Register → Add Link → Drag to Folder → Send to Friend → Accept in Inbox.
  - API & RLS negative tests: Verify that User B cannot query or mutate User A's links/folders.
  - Secret leak checks: CI grep ensuring `SUPABASE_SERVICE_ROLE_KEY` is never included in client bundles.
* **CI/CD Pipeline Setup:**
  - Create `.github/workflows/ci.yml` running lint, typecheck, unit tests, and production build on every push and PR.
  - Configure EAS build profiles (`eas.json`) for iOS and Android store distribution.

---

## 6. Implementation Readiness & Immediate Next Steps

I am prepared to begin the implementation systematically. Because the architectural foundations (monorepo, shared schemas, and visual components) are already in place, we can transition this prototype into a hardened, production-ready product quickly by tackling the fundamentals first.

### Recommended Execution Order:
1. **Sprint 1 (Foundations & Security):**
   - Clean up Capacitor artifacts and resolve React 18/19 TypeScript type conflicts.
   - Restore database constraints (`NOT NULL`, foreign keys, strict RLS).
   - Wire live Supabase Auth on Web (login, signup, session middleware, OAuth callback).
2. **Sprint 2 (Data Layer & Storage):**
   - Implement TanStack Query hooks in `packages/shared` and replace `localStorage` polling.
   - Configure Supabase Storage `thumbnails` bucket and image uploads.
   - Deploy atomic backend handlers for `send-link` and `accept-suggestion`.
3. **Sprint 3 (Admin Panel & Social):**
   - Wire live Admin Panel with service role API routes and safeguards.
   - Wire live user discovery and friend requests in PostgreSQL.
   - Implement real GDPR account deletion.
4. **Sprint 4 (Mobile Parity & Release):**
   - Implement mobile folder drawer, bulk selection, pull-to-refresh, and native bookmark picker/sharing.
   - Set up CI pipeline and EAS build profiles.

---

*This document serves as the master engineering takeover baseline. Let's discuss your priorities and begin execution.*
