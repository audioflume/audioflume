# Supabase Auth cutover — account data access audit

Date: 2026-11-08. **Read-only inspection** of connected Audioflume Supabase project; no table permissions, policies, account records, or production API routes changed.

## Critical blocker

The following existing tables have RLS **disabled**, no policies, and `SELECT`, `INSERT`, and `UPDATE` privileges for both `anon` and `authenticated` database roles:

- `favorites`
- `playlists`
- `playlist_songs`
- `projects`
- `project_assets`
- `project_folders`
- `user_profiles`
- `user_memberships`
- `songs`

`artist_memberships` has RLS **enabled** but zero policies and broad grants. Its current policies must be designed deliberately, not guessed.

`auth_identity_links` has RLS **enabled**, no policies, and no `anon` or `authenticated` direct privileges. Preserve this server-only mapping boundary.

These observations are about the database roles. Before assuming exploitation, separately inspect whether the relevant schema and tables are exposed through Supabase's Data API, as well as any other direct database/API access. The risky configuration blocks production auth cutover until assessed and remediated.

## Ownership relationships (observed)

| Table | Direct owner key | Inherited or other key |
| --- | --- | --- |
| favorites | clerk_user_id | song_id (text) |
| playlists | clerk_user_id | is_public, source_playlist_id |
| playlist_songs | none | playlist_id -> playlists |
| projects | clerk_user_id | id |
| project_assets | none | project_id -> projects |
| project_folders | clerk_user_id | project_id -> projects |
| user_profiles | clerk_user_id | — |
| user_memberships | clerk_user_id | plan_key |
| artist_memberships | clerk_user_id | artist_id |
| songs | none | status, archived_at |

The arrows in this list indicate the application-level ownership path to check, not verified foreign-key constraints.

## Existing server route dependencies inspected

- `app/api/favorites/route.ts`: Clerk `auth().userId`, service-role queries scoped to `clerk_user_id`; unauthenticated GET deliberately returns `200 {favorites: []}`. POST writes user favorite.
- `app/api/playlists/route.ts`: Clerk `auth().userId`, multiple reads by `clerk_user_id`, joins/normalization for user playlists and cover sources; existing endpoint unauthorized semantics must be preserved.
- `app/api/projects/route.ts`: Clerk `auth().userId`, project reads/writes by `clerk_user_id`, follow-up `project_assets` counts and default folders.
- `app/api/desktop/auth/token/route.ts`: Clerk session required before issuing Audioflume desktop HMAC tokens; desktop transition must preserve security and callback behavior.

Other relevant API routes, subscription/artist/admin permissions, public curated/community playlists, and direct client queries need a complete call-site audit before modifying shared authorization.

## Required security design before changing policies

1. **Inventory exposure**: confirm public schema/Data API exposure, roles/grants, views, RPCs, storage, existing service-role reads and client-side access for each table.
2. **Preserve public content behavior**: distinguish published songs and public playlists from private user data. Do not apply a single blanket ownership policy to all tables.
3. **Preserve user ownership**: verified Supabase Auth `auth.uid()` must map to the existing `clerk_user_id` without trusting user-controlled email or metadata. Since the mapping table is restricted, plan a safe server boundary or separately reviewed policy structure—never expose mapping rows to users by default.
4. **Joined child tables**: `playlist_songs`, `project_assets` and related children require parent-ownership checks, and public visibility rules where relevant.
5. **Admin, artist, billing**: authorize via trusted server-managed role/membership data; don't trust `user_metadata`, and don't expose membership or billing records with unrestricted grants.
6. **Safe rollout**: backup/snapshot, test with linked and unlinked accounts, cross-account reads/writes, guest browsing, playlist sharing, artist/admin features, website and desktop sessions, then apply least-privilege policies with rollback plan. Ensure existing service-role code and browser clients remain functional during the rollout.

## Supabase SSR dependency gate

Official Supabase guidance recommends `@supabase/ssr` for Next.js cookie-based sessions, including coordinated token refresh and response cache headers.

At audit time:
- `@supabase/ssr` was not declared in `apps/web/package.json` or `apps/web/package-lock.json`.
- Local npm registry lookup failed due network DNS (`EAI_AGAIN`). No package files were modified. Do **not** hand-author integrity hashes or introduce unresolved imports.
- Install it with the web app's package manager in a network-enabled environment; commit **both** updated files, then add isolated server/browser cookie clients and session refresh handling before integrating with production Clerk middleware.

Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client

**Status:** Audit only. Existing production auth and table access settings remain unchanged.
