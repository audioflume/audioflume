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

An updated inspection also confirmed five more tables with RLS disabled and broad role grants: `song_edit_points`, `user_billing_profiles`, `user_downloads`, `user_security_events`, and `song_shorten_jobs`. The full list is **14 tables**. The read-only query used to recheck their current settings is preserved at `docs/sql/auth-rls-preflight-readonly.sql`.

`artist_memberships` has RLS **enabled** but zero policies and broad grants. Its current policies must be designed deliberately, not guessed.

`auth_identity_links` has RLS **enabled**, no policies, and no `anon` or `authenticated` direct privileges. Preserve this server-only mapping boundary.

These observations are about the database roles. Before assuming exploitation, separately inspect whether the relevant schema and tables are exposed through Supabase's Data API, as well as any other direct database/API access. The risky configuration blocks production auth cutover until assessed and remediated.

## View and table exposure findings (read-only checks)

- The Supabase security advisor currently reports **14 tables without RLS**; each of those has `anon` and `authenticated` role grants for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`. These grants combined with disabled RLS are a critical potential direct-access exposure. The Data API's configured exposed-schema list was **not independently verified** by this audit; assess that in the Supabase dashboard before cutover.
- Supabase's advisor also flags `public.project_folder_paths` as a **security-definer view**. The view recursively reads `project_folders` and exposes `id`, `project_id`, `clerk_user_id`, names and paths. Its `reloptions` are null; it is not configured as a security-invoker view. `anon` and `authenticated` have `SELECT` access to it. This requires priority review because ordinary view permissions can bypass underlying table RLS.
- Several other public tables have RLS already enabled but **no policies**. Do not assume broad table grants alone imply those rows are readable: an enabled RLS policy barrier denies direct row access unless a policy permits it.
- `auth_identity_links` remains the appropriately restricted exception: RLS enabled with no browser-role `SELECT` rights.

## Proposed safe rollout — **not executed**

1. Confirm Data API schema exposure, client-side Supabase call sites, PostgREST RPC/view dependencies, and any third-party integrations. A GitHub code search found the browser `lib/supabase.ts` client and server-only `lib/supabaseServer.ts` client, but this does **not** constitute a complete call-site audit.
2. Prioritize protecting **private owner data**: `favorites`, `playlists`, `playlist_songs`, `projects`, `project_assets`, `project_folders`, `user_profiles`, `user_billing_profiles`, `user_memberships`, `user_downloads`, `user_security_events`. Determine which direct browser accesses must remain possible and how they will be authorized. Use explicit reviewed policies and least-privilege grants. Do not rely on the client to supply a `clerk_user_id`.
3. Treat **public-content or operational data** separately: `songs`, `song_edit_points`, `song_shorten_jobs`. Public reading of published songs may be necessary, but direct client modification is not. The job queue should not become public simply because it shares the schema.
4. Review `project_folder_paths` before modifying `project_folders`. Consider revoking browser-role access until a reviewed owner-scoped read is available, or converting the view to `security_invoker` *after* verifying the caller's underlying permissions and deployed clients. Neither change was applied.
5. Test a staged rollout with **guest / Clerk / Supabase-linked / Supabase-unlinked / admin / artist / desktop** identities. Include cross-account read and write denial, public song discovery, playlists and project folders. Verify service-role routes behave as intended without bypassing business-level authorization.
6. Backup and record grants/view definitions and policy state, deploy a reversible change one table group at a time, and re-run `docs/sql/auth-rls-preflight-readonly.sql` and the Supabase security advisor after each group. Do not perform a blanket 14-table `ENABLE ROW LEVEL SECURITY` action without policies and regression testing.

Reference:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

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

At the initial audit, `@supabase/ssr` was missing and npm access failed in the model environment. Since then it was installed locally with the generated npm lockfile (commit `07148093e`), and isolated browser/server preview clients were added. This does **not** complete production-wide Clerk replacement or resolve the RLS blocker.

Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client

**Status:** Audit only. Existing production auth and table access settings remain unchanged.
