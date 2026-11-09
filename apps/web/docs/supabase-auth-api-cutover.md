# Supabase Auth — coordinated website API cutover plan

**Status: implementation staged only; Clerk remains the only active provider on website/desktop routes.**

## Implemented foundation

- `lib/auth/resolveSupabaseAccountRequest.ts` is a server-only, request-scoped Supabase authorization utility, staged but not imported by any production route.
- It uses the future production cookie namespace `sb-audioflume-auth`, **not** the separate `sb-audioflume-auth-preview-ssr` preview cookie.
- It independently verifies the session through Supabase Auth `getUser()`, resolves only the existing one-to-one `auth_identity_links` mapping, and fails closed on missing/unlinked identities.
- It returns owner IDs **only to server code**. Never expose them to the browser or take them from request bodies, emails, claims in `user_metadata`, or search parameters.
- The `respond` helper propagates refreshed cookies, no-store headers and auth-specific cache headers. This does not substitute for a reviewed Next.js proxy refresh.
- Pure owner decision tests: `node --experimental-strip-types --test tests/supabase-preview-ownership.test.mjs` from `apps/web`.
- The new utility is dormant until the production browser client, proxy refresh, API routing and RLS checks are deliberately switched together.

## Explicit production API dependencies (inspected)

| Area | Existing Clerk dependency | Migration contract |
| --- | --- | --- |
| `GET /api/favorites` | `auth().userId`; signed-out request returns `200 {favorites: []}` | Preserve empty-array guest behavior, saved song ID/timestamp shape and ordering; only read mapped owner rows. |
| `POST /api/favorites` | `auth().userId`; owner-scoped upsert | Preserve `401` for guest and constrain inserts to mapped owner, not a request-supplied owner. |
| `DELETE /api/favorites/[songId]` | `auth().userId`; owner and song-scoped delete | Preserve status semantics and both equality predicates. |
| `GET /api/playlists` | `auth().userId`; owner-scoped rows, normalization and positions | Preserve normalizations, public/community references and existing response shape. |
| `POST /api/playlists` | `auth().userId`; creates under legacy owner | Preserve source validations and ownership on writes. |
| `GET /api/projects` | `auth().userId`; scoped rows and project-assets count | Preserve project ordering, default folders and file counts; child rows must follow verified parent ownership. |
| `POST /api/projects` | `auth().userId`; creates project/default folders | Preserve server-managed ownership and folder creation. |
| `GET/PATCH /api/account/profile` | Clerk `currentUser()` provides identity fields | Requires trusted Supabase Auth user-profile data and a separate profile-identity mapping; not a simple user ID swap. |
| `GET /api/desktop/auth/token` | Clerk session plus `currentUser()` issues desktop HMAC tokens | Requires a separately reviewed desktop login/callback/token rollout; do not silently change. |

## Automated access inventory (new)

Run from the repository root:

```bash
node apps/web/scripts/audit-auth-cutover.mjs
node --test apps/web/tests/auth-cutover-audit.test.mjs
```

Use `node apps/web/scripts/audit-auth-cutover.mjs --json` for a machine-readable report. This scans web source for explicit browser Supabase imports, literal/dynamic `.from()` queries and Clerk imports in client components and API handlers.

**Scope/limitations:** heuristic static import scanning does not prove that a call is reachable from the browser through a transitive dependency, cover desktop code, resolve dynamic query targets, or inspect RPCs/network libraries. Review findings against the real code and Supabase Data API settings before changing grants. Run the scanner after each major migration batch to detect new dependencies. No app behavior is changed by this tool.

## Critical browser-direct dependency

`components/PlaylistFilter.tsx` currently imports the legacy browser `supabase` client and directly queries `public.playlists`, filtering with the Clerk `userId`. The owner filter is **not** a database permission barrier while RLS is disabled.

**Before revoking browser role access to playlists**, migrate this filter through an authorized server API or an equivalent reviewed ownership-enforced RLS path. It is a shared user-facing filter; do not change its UX, classes, states, styling, interactions or behavior without a separate explicit implementation review. The same audit must be completed for every other browser-direct callsite before applying broad grants/RLS changes.

## Safe batch order

1. **Secure access design:** inspect complete browser callsites, Data API exposure, the recursive `project_folder_paths` view, public vs private song/playlist visibility and browser permissions. Create reviewed backup and rollback SQL. Do not turn on all RLS policies blindly.
2. **Cookie/client parity:** implement a production browser Supabase client with exactly the `sb-audioflume-auth` cookie namespace; add reviewed proxy refresh and test session rotation without changing active Clerk middleware.
3. **API batch:** convert Favorites, Playlists and Projects authorization in one coordinated branch batch while preserving each route's guest behavior, payload, order, owner predicates, write controls and desktop shared data. Avoid a provider fallback based solely on the presence of a cookie.
4. **UI and identity batch:** convert Clerk hooks/provider usage, account profile, admin/artist roles, invitations and billing only after corresponding API/auth checks exist.
5. **Desktop batch:** migrate token issuance and callback while preserving existing offline/desktop projects; validate cross-account isolation and the web/desktop sync contract.
6. **Validation/cutover:** automated session and cross-owner CRUD tests, Google/password/recovery flows, no-cache handling, public discovery, filters, admin/artist/billing, desktop token exchange, build/Vercel. Use explicit deployment rollback; leave Clerk active until all criteria pass.

## Gates not yet met

- RLS/security advisor: 14 public tables with RLS disabled and broad browser-role grants plus a security-definer project-folders view. No live database changes made.
- Outstanding npm audit vulnerabilities include critical Next.js advisories.
- The isolated SSR browser tests passed for a linked account, including 31 playlists, 4 projects and six matching Favorites. Cross-account, expired-session and production-route integration tests remain required.
- Separate Vercel build failure previously observed at `HomeLandingContent.tsx:414` (unrelated TS nullability) remains unmodified.

Do not merge PR #158 or cut over web or desktop auth while any release gate remains.
