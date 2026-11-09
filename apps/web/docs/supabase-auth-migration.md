# Supabase Auth migration — Audioflume

Status: **in progress, not ready for production cutover.**

This is an isolated, staged migration. The production sign-in, web API authorization, and desktop authentication must continue using Clerk until every gate below passes.

## Confirmed current architecture

- Next.js 16 root layout uses `ClerkProvider` and Clerk's `currentUser`.
- Middleware protects private website routes with `auth.protect()`; API routes authorize callers independently.
- Client-side account state uses Clerk hooks across shared header, sidebar, player, song cards, playlists, favorites, projects, theme, account settings, artist dashboards and invitations.
- Supabase PostgreSQL stores user ownership using text `clerk_user_id` columns in many tables, including playlists, favorites, projects, artist memberships, profiles, memberships and billing profiles.
- Clerk also provides admin role metadata, artist invitations, user lookup and the account security-management UI.
- Desktop uses browser Clerk sign-in, `/api/desktop/auth/token`, an Audioflume HMAC token valid for up to 30 days and an `audioflume://auth/callback` deep link.
- Supabase Auth currently has two test accounts, with one confirmed Clerk identity mapping (checked November 8, 2026). Legacy ownership data must be retained.

## Prototype (this branch only)

- `/auth-preview` provides a custom Google/email-password interface plus sign-up, recovery and sign-out.
- Google OAuth explicitly requests `prompt=select_account`; **Google decides which account appears first**. The app cannot reliably reorder Google's native account list.
- The prototype uses the existing browser Supabase client and **must not be used as production SSR authorization**.
- Supabase sign-in alone does **not** establish access to any legacy Clerk-owned records. A separate opt-in linking action now requires verified, matching email addresses and valid sessions from both Clerk and Supabase.
- Once linked, the preview can use `GET /api/auth-preview/account-data` to verify counts of existing playlists, favorites, projects and artist memberships using the verified Supabase token and mapped legacy owner. This route never returns the legacy owner ID, makes no modifications and is not used by production features.
- An isolated **Test account access isolation** control now checks that anonymous requests are rejected (401) and that the current Supabase session gets either linked-account counts (200) or a denial (403). This does not automatically sign in another Google account; manually switch to a separate test identity for the unlinked case.
- The read-only account-data API now uses a request-scoped, independently verified Supabase identity resolver (`lib/supabasePreviewAuthorization.ts`) that returns 401 for missing/invalid sessions and 403 for unlinked users. It never accepts a client-supplied legacy owner ID. Supabase tokens use a dedicated header to avoid interfering with Clerk middleware.
- An isolated `/auth-preview/ssr` page uses `@supabase/ssr` browser cookies with an independent cookie name and Google OAuth. `GET /api/auth-preview/ssr-session` verifies the cookie against Supabase Auth server-side and returns only an authenticated boolean. Route-level refresh writes response cookies and prevents caching. This is not a production session or a substitute for a shared Next.js proxy refresh.
- **Preview-only middleware refresh added:** only exact path `/auth-preview/ssr` invokes `lib/supabaseSsrPreviewRefresh.ts` from existing Clerk middleware; it validates claims with Supabase, forwards rotated cookies into the server request and response, and preserves Supabase cache headers. All other routes retain the original Clerk middleware flow. This has not been end-to-end browser tested for token expiry.
- `GET /api/auth-preview/ssr-account-data` now tests a server-verified Supabase cookie against the existing one-to-one legacy ownership link and returns only aggregate playlist and project counts. It returns 401 for missing/invalid sessions and 403 for unlinked Supabase identities, without exposing the legacy owner ID or changing any account data. `/auth-preview/ssr` includes a button to exercise the endpoint. This is isolated migration verification, not production authorization.
- Isolated `GET /api/auth-preview/ssr-favorites` uses the verified SSR cookie and server-only identity link to return active (published, unarchived) favorite song IDs with the same `favorites: [{song_id, created_at}]` shape as the Clerk GET endpoint. The SSR preview compares exact song ID lists with `GET /api/favorites` only while a Clerk session is present. It gives 401 to missing/invalid cookie users and 403 to unlinked identities. This test does not modify or replace production Favorites.
- **Authorization foundation consolidated:** `lib/auth-preview/createPreviewSsrRequest.ts` is the request-scoped cookie/session/response helper for the three existing SSR preview endpoints (session, owner counts, active Favorites). `lib/auth-preview/resolveVerifiedLegacyOwner.ts` makes the 401/403/200 owner decision with no client-supplied IDs, keeping the existing endpoint paths and response payloads unchanged.
- **Automated checks:** `tests/supabase-preview-ownership.test.mjs` tests missing sessions, unlinked identities, owner mapping and fail-closed verification/lookup errors. From `apps/web`, run `node --experimental-strip-types --test tests/supabase-preview-ownership.test.mjs` (Node 22+). These unit checks do not replace browser/session integration or a full Next.js build.
- A production-targeted but **unused** `lib/auth/resolveSupabaseAccountRequest.ts` remains staged for future request-specific SSR use. Separately, the new `lib/auth/resolveAccountOwner.ts` is now used by 31 account-data route files but **defaults to Clerk**. Its Supabase branch requires an explicit server environment value and is not ready to activate until production browser sessions, refresh, RLS and regression tests are complete. See `docs/supabase-auth-api-cutover.md`.
- Production `/sign-in`, `/sign-up`, middleware protection, web APIs and desktop sync remain on Clerk.

## Security prerequisite — do not skip

Supabase's connected-project advisory reported 14 public tables with RLS disabled, including user data. The project also has tables with RLS enabled and no policies, plus a `security_definer` view. The legacy app currently uses a server-side service-role client.

**Read-only authorization audit updated:** `docs/supabase-auth-access-audit.md` now records all **14** tables with RLS disabled and broad database-role grants, an exposed security-definer project-folder view, the restricted identity mapping, and an ordered safety plan. `docs/sql/auth-rls-preflight-readonly.sql` is a repeatable read-only inspection. These remain release blockers; **no schema permissions or policies have been changed**.

Before any cutover:
1. Map required public vs private data access per table. Inspect existing grants, RLS, views and RPCs.
2. Apply ownership-checked RLS policies and restrict browser-facing grants. **Never** fix access by granting unrestricted access to `authenticated`.
3. Keep server-side service-role credentials server-only. Use cookie-aware SSR clients for user sessions, and call `auth.getUser()` or `auth.getClaims()` as appropriate.
4. Test public browsing, authenticated account reads, creation, updates, admin endpoints, artist permissions and desktop requests. Do not enable RLS in production blindly.

Reference: https://supabase.com/docs/guides/database/postgres/row-level-security

## Identity preservation

The Clerk ID is currently the application-facing ownership key. Supabase Auth uses new UUID identities.

1. **Implemented:** `public.auth_identity_links` stores a one-to-one link, keyed by Supabase `auth.users.id` and unique on `clerk_user_id`. RLS is enabled; `anon` and `authenticated` have no table privileges. The SQL applied to the connected Supabase project is preserved at `docs/sql/auth-identity-links.sql`. No existing ownership rows were changed.
2. **Partially implemented:** `POST /api/auth-preview/link` independently validates the active Clerk session and a Supabase bearer token, requires two verified matching primary emails, rejects conflicting IDs, and never automatically changes owners. It is opt-in from `/auth-preview`. This requires end-to-end browser testing before production use. Do **not** link solely because email addresses match.
3. Migrate administrative role claims to trusted server-managed authorization data, **not** Supabase `user_metadata`.
4. **Implemented, not yet integrated into production routes:** `lib/supabaseIdentity.ts` validates a Supabase bearer token and resolves its linked legacy owner ID server-side. `GET /api/auth-preview/link` returns only whether a verified Supabase session has a link, and the preview retains the status after reload. Do not expose the owner ID to the browser or grant access to protected records until authorization conversion and testing are complete.
5. Define first-time users who have no Clerk identity, including their ownership key strategy and onboarding.
6. Preserve subscriptions, artist memberships, profile ownership, invitations and activity history.
7. Plan a one-time password-reset route for legacy password users if hashes cannot be migrated compatibly. Re-link social accounts only after verification.
8. Export and back up existing ownership mappings before cutover.

## Provider setup (requires project owner configuration)

In the Supabase dashboard, configure:
- Auth site URL and allowlisted redirect URLs for local development, preview and production, including `/auth-preview` for the temporary prototype.
- Google OAuth client ID and secret plus the callback URL supplied by Supabase. Google account selection is controlled by `prompt=select_account`.
- Apple sign-in is intentionally out of scope because the project will not enroll in the paid Apple Developer Program.
- Custom SMTP for reliable sign-up confirmation, password reset and recovery emails.
- Session policies and safe account-linking behavior.

Never commit OAuth secrets, service-role keys or credentials to the repository.

## Cutover order

- [x] Audit Clerk usage and the ownership model.
- [x] Create an isolated branch and custom sign-in preview.
- [ ] Verify Google OAuth works in the test environment and configure SMTP for email signup and recovery.
- [x] Create the restricted UUID-to-legacy-ID table, dual-auth validation endpoint, and opt-in preview action.
- [ ] End-to-end test linking the correct Clerk and Supabase accounts, conflicts, missing sessions, account switching and reloads before production use.
- [x] Install `@supabase/ssr` with matching package and npm lockfile (user committed `07148093e`).
- [x] Add an isolated cookie-based sign-in and server-verification test, independent of existing Clerk and Supabase localStorage sessions.
- [x] Add narrowly scoped Supabase session refresh in existing Clerk middleware for `/auth-preview/ssr` only; no global refresh or production authentication change.
- [x] Add an isolated, read-only SSR cookie-to-linked-legacy-owner check with 401/403/200 responses and counts scoped to the resolved owner.
- [ ] Browser-test SSR Google redirect, session persistence across reload, automatic refresh near expiry, server `authenticated` responses, linked/unlinked ownership tests, sign-out, Clerk website session, and desktop behavior. Production-wide cookie refresh and authorization remain separate gates. Do not cut over before RLS work.
- [x] Centralize Supabase preview API authorization in a request-scoped server-only resolver, independent from Clerk headers.
- [x] Add a server-only linked-identity resolver and read-only link-status check (not used by existing application APIs yet).
- [x] Implement an isolated read-only API for verification of linked user-owned record counts.
- [ ] Browser-test linked-account record counts against the original Clerk account and run the new **Test account access isolation** button while signed into both the linked and second unlinked Google accounts. It checks no-token = 401; linked = 200; unlinked = 403. Do not claim these pass until run in the browser.
- [x] Implement isolated read-only active Favorites API using verified SSR cookie ownership, without touching `/api/favorites`.
- [ ] Browser-test exact song-ID parity for linked Clerk/Supabase identities and refusal of unlinked/signed-out sessions before migrating the production Favorites API.
- [x] Consolidate duplicated SSR-preview auth/owner/cookie response code and add executable owner-isolation regression tests.
- [x] Stage a production-cookie account-ownership resolver without wiring it into any active Clerk route; document API conversion boundaries and the browser-direct playlist dependency.
- [x] Run the source-tree inventory across 583 website files: 2 explicit browser Supabase imports (the isolated auth preview and the shared playlist filter), 21 Clerk client imports and 49 Clerk-dependent API routes. Four initial scanner tests passed locally. Correct the scanner's overinclusive dynamic `.from()` matches and add regression coverage; updated tests require local rerun.
- [x] Move the shared `PlaylistFilter.tsx` from direct browser Supabase reads to the Clerk-authenticated `/api/playlists/filter-options` endpoint without changing markup or UI states; browser regression testing still required.
- [x] Convert the primary 31 Favorites, Playlists, Projects, song membership and user-preferences API route files to a Clerk-default, explicitly gated Supabase owner resolver. Production Supabase login/refresh cutover and other API handlers still outstanding.
- [x] Add future production-cookie browser Supabase client, exact cutover test page and read-only owner verification, plus a middleware refresh allowlist that activates on account APIs only with the server-side Supabase provider selection. Browser testing and RLS/security gates remain pending.
- [x] Convert account notifications, account usage, security events, community-playlist favorites and curated playlist saving (five additional endpoints) through the verified legacy owner resolver, preserving Clerk default and owner-scoped queries. Identity-dependent profile, billing and membership remain unchanged.
- [x] Convert playlist recommendations with guest/public access retained and linked-owner protection for private playlists and Favorites.
- [x] Stage verified Clerk-default identity handling for account profile, billing profile and membership, with Supabase `getUser()` supplying verified email and display-only user metadata; all account records retain legacy owner IDs. Browser parity and live security tests remain outstanding.
- [x] Add server-selected, Clerk-default account session for Favorites, Playlists, Projects, User Preferences and the shared playlist filter; migrate the automatically invoked playlist-cover endpoint without changing R2 handling, cache key formats or UI. Shared contexts still need full browser regression, and Header/UserMenu/artist/middleware remain Clerk.
- [x] Make the shared website `Header` and `UserMenu` consume the Clerk-default account session, including display identity and provider-aware sign-out, without touching their DOM, classes, menu interactions, icons, or link destinations. Live login URLs and protected routes still depend on Clerk.
- [x] Replace direct Clerk identity hooks in the website Music page, Playlists page and Discover curated-hero filter with the shared Clerk-default account session. Source comparison confirms unchanged JSX/filter/state behavior; local/browser regression testing pending.
- [x] Stage actual `/sign-in` and `/sign-up` Supabase branches behind the existing server-side provider selection; preserve Clerk's original path by default. Add Google/email/password registration/reset form, one-to-one linked-owner OAuth callback, same-origin redirect allowlist and tests. Supabase-only protected page routing and end-to-end auth tests still pending.
- [x] Stage Supabase-verified session page guards only for Favorites, Projects and the main Playlists page, preserving Clerk for all other private pages and the community-tab redirect; suppress Clerk-only artist invitation reads in Supabase mode. End-to-end protected-page and cross-account testing still pending.
- [ ] Convert server API authorization and data-ownership lookups.
- [ ] Convert web auth provider/hooks and all dependent components.
- [ ] Replace Clerk account security, profiles, invitations and admin identity lookup.
- [ ] Migrate desktop sign-in and HMAC-token issuance/verification while preserving desktop project access.
- [x] Perform read-only inventory of first-wave account table access grants/RLS and document safe policy rollout.
- [x] Add a repeatable read-only RLS preflight and audit all 14 unprotected tables plus the security-definer project-folder view.
- [ ] Add data access policies; verify affected tables and views.
- [ ] Test sign-in/out, Google multiple-account chooser, email/password, recovery, reload persistence, new/existing users, identity switching, every account area and desktop synchronization.
- [ ] Compare ownership records before/after migration and verify rollback.
- [ ] Cut over sign-in routes and middleware in a controlled release.
- [ ] Remove Clerk only after successful validation and an agreed rollback window.

## Acceptance criteria

No existing user's songs, favorites, playlists, projects, licenses, artist ownership, subscriptions, desktop projects or admin permissions are reassigned or lost. A user who signs in with a different social identity cannot gain access to an existing account unless ownership has been verified. Social sign-in uses provider-owned OAuth, and Google shows its account chooser.

## Rollback

Clerk production paths stay intact until final cutover. Keep a documented database backup, identity mapping export and tested rollback release. Do not delete existing Clerk identities or columns during the transition.
