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

## Production-cookie integration staged (without activating the provider)

- `lib/auth/supabaseAccountBrowser.ts` creates a browser SSR client with cookie namespace **`sb-audioflume-auth`**, matching `lib/auth/resolveAccountOwner.ts` and the previously staged request-scoped resolver. It is separate from both the localStorage-based legacy client and the `sb-audioflume-auth-preview-ssr` test cookie.
- `lib/auth/refreshSupabaseAccountSession.ts` refreshes the SSR cookie using `auth.getClaims()` and forwards cookie changes downstream and to the browser, preserving cache-related headers.
- Existing Clerk middleware is modified **only** to refresh that namespace at the exact `/auth-preview/cutover` path, and when `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase` for paths returned by `shouldRefreshAccountSession`. The allowlist does not include desktop, admin, artist, public library, account profile or other Clerk-only API routes. The existing `/auth-preview/ssr` cookie branch and all Clerk route protection remain unchanged.
- `/auth-preview/cutover` is a read-only **future production-cookie** Google sign-in test. `/api/auth-preview/cutover-session` independently verifies the future cookie and one-to-one linked owner, returning 200 / 401 / 403 without exposing an owner ID. The page displays the server-selected API provider; migrated Favorites/Playlists/Projects reads are offered only if the provider is `supabase` and the cookie mapping passes.
- Google OAuth redirect URLs must include the new `/auth-preview/cutover` callback URL in Supabase's redirect allowlist before browser login works. Do not alter existing OAuth redirect configuration without checking the current registered URLs.
- **Do not set `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase` on live deployments.** The website's other Clerk hooks/protected pages, admin/artist/billing roles, desktop login, database RLS, browser integration tests and full build are not yet completed. The new preview page may be opened while Clerk is the provider, but a passing cookie check alone does *not* prove that the core APIs have switched.

Verification from the repository root:

```bash
node --experimental-strip-types --test apps/web/tests/supabase-account-session-routing.test.mjs
node --experimental-strip-types --test apps/web/tests/account-auth-provider.test.mjs
node --test apps/web/tests/account-route-migration.test.mjs
```

Then start the website and visit `http://localhost:3000/auth-preview/cutover` to test the cookie. The standard auth preview remains at `/auth-preview/ssr` and uses a **different session**, so a second Google sign-in may be needed. Without a server-side provider switch, the page should show `Clerk (default)`; the read-only migrated API check button should **not** appear.

## Core account API conversion staged (Clerk remains default)

- **28 existing route files** covering Favorites (read/add/remove), Playlists (read/create/update/delete, songs, ordering and stats), Projects (read/create/update/delete, assets, folders, synchronization/SSE), song-to-playlist/project membership and user preferences now call `lib/auth/resolveAccountOwner.ts`.
- The resolver returns the exact existing Clerk owner ID by default, from `auth()`. Only `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase` (server-side environment) selects a Supabase verified-cookie session, which is mapped to the legacy owner using `auth_identity_links`. The production-cookie client and allowlisted middleware refresh are now staged, **but do not set this environment variable on live deployments** until full role, RLS, desktop and end-to-end regression gates pass.
- Supabase authorization failures never fall back to Clerk. Missing/invalid session -> `401`, verified unlinked identity -> `403`, auth mapping failure -> `500`. Guest Favorites GET and playlist stats GET preserve the existing empty-response contract for a true 401; a 403/500 is not silently treated as empty.
- The owner predicates, API payloads, ordering and write validations were not rewritten. All changes are isolated to the authorization lookup and denied-response status, except the separate shared playlist-filter read discussed below.
- The shared `components/PlaylistFilter.tsx` now requests the Clerk-protected same-origin `/api/playlists/filter-options` endpoint instead of a direct browser Supabase query. JSX, shared components, icons, onOpen/onChange and state variables are unchanged. This removes the known browser-direct playlist dependency ahead of RLS remediation.
- This is code conversion, **not a verified or enabled Supabase production session**. Admin, artist, billing, other community/public endpoints and desktop token/sync authorization still need coordinated migration before cutting over. Existing Clerk middleware remains in place.

Automated checks from the repository root:

```bash
node --experimental-strip-types --test apps/web/tests/account-auth-provider.test.mjs
node --test apps/web/tests/account-route-migration.test.mjs
node --test apps/web/tests/auth-cutover-audit.test.mjs
node apps/web/scripts/audit-auth-cutover.mjs
```

The tests check provider selection and source-level route coverage; they are not equivalent to browser, database RLS, integration, or Next.js build tests. Verify signed-in and signed-out API responses, filtering, playlists, Projects and both website/desktop interactions before enabling Supabase provider.

## Next account-data route batch

- **28 owner-only route files** now use the Clerk-default, Supabase-ready owner resolver, adding `/api/account/notifications` (GET/PATCH/DELETE), `/api/account/usage` (GET), `/api/account/security-events` (GET), `/api/community-playlist-favorites` (GET/POST/DELETE), and `/api/curated-playlists/[playlistId]/save` (POST).
- Playlist recommendations now also resolve the account through the verified owner resolver while preserving public guest recommendations (401 behaves as guest). Verified unlinked accounts (403) and server authorization failures (500) are denied, rather than treated as guests.
- Their existing owner constraints remain unchanged, including `account_notifications.recipient_clerk_user_id`, `community_playlist_favorites.clerk_user_id`, and the public-playlist check before saving. No content or membership write semantics were changed.
- These five exact route patterns were added to `shouldRefreshAccountSession` and its positive/negative tests. Clerk remains the server default.
- **Identity-dependent routes now staged:** `/api/account/profile`, `/api/account/billing-profile`, and `/api/account/membership` use server-only `resolveAccountIdentity`. With Clerk enabled, it obtains `currentUser()` and preserves the same profile field values. With Supabase enabled, it uses the verified `getUser()` email/display fields plus the one-to-one mapped legacy owner. `verifiedSupabaseProfile.ts` exposes display-only metadata conversion and ensures `user_metadata` cannot set owner IDs, roles or verified email. All profile, billing and membership records remain keyed by the trusted **legacy Clerk owner ID**, not the Supabase UUID. Existing account record and membership write logic remains unchanged. Source tests and pure profile tests are added, but runtime/browser parity and security reviews remain required.
- This is **not** a completed production cutover. All converted routes require runtime verification under the explicit Supabase provider after surrounding website Clerk hooks and security controls are ready. Do not activate the provider globally.

## Account settings protected pages (staged, Clerk default)

- The `AccountSidebar`, `ProfileSection` and `PaymentSection` now use the existing Clerk-default `useAccountSession()` display identity. Each file was compared to the earlier committed version; **only the import and hook calls changed**. No JSX, styling, links, form handling or sidebar behavior was changed.
- `isMigratedAccountPage` now includes the exact `/account` redirect and only `/account/profile`, `/account/payment`, `/account/membership`, `/account/notifications`, `/account/settings` and `/account/support`. These page sections rely on previously converted account APIs or existing non-identity presentation.
- `/account/security` is **explicitly excluded**: it still calls Clerk `openUserProfile()` for password, 2FA and recovery-email controls. Unknown or nested account routes remain under Clerk. A future security-page migration must provide tested Supabase equivalents before changing its guard.
- The same server-side provider switch and `auth.getUser()` middleware guard apply; independently owner-scoped APIs remain authoritative. The new allowance does not change any account records, Stripe, entitlement calculations, desktop, artist or admin permissions.
- Source tests: `node --experimental-strip-types --test apps/web/tests/supabase-protected-pages.test.mjs`. Verify all account sections and Clerk security controls in the browser while the provider stays unset. Supabase-only end-to-end validation still pending.

## First protected website pages (staged, Clerk default)

- `lib/auth/isMigratedAccountPage.ts` explicitly recognizes only `/favorites`, `/projects`, one-segment `/projects/[projectId]`, and the exact `/playlists` page. These pages render client-side account data via previously owner-verified account APIs. The allowlist does not include admin, artist, account settings, playlist community/detail pages, desktop, or APIs.
- `middleware.ts` invokes `refreshSupabaseAccountSession(request, { requireVerifiedUser: true })` only on those routes when the **server** explicitly sets `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase`. `auth.getUser()` must independently verify a Supabase session; missing/invalid sessions redirect to `/sign-in?redirect_url=...`. Refreshed cookie writes are copied to the redirect. All other private pages continue to use the original Clerk `auth.protect()`.
- The existing `/playlists?tab=community-playlists` redirect is preserved ahead of this new guard. Public playlist detail pages retain their public behavior. No visual or page markup changes.
- **Security boundary:** the middleware checks that the Supabase session is valid. It does **not** establish the linked legacy owner; each personal data API still independently verifies `getUser()` and `auth_identity_links` before returning or writing account data. An unlinked valid session may receive the client page shell, but cannot access account records via migrated APIs.
- `app/layout.tsx` now skips Clerk-only artist invite preloading when Supabase is selected, avoiding identity mix-ups when both Clerk and Supabase cookies exist. Clerk mode uses the same existing invite preload and provider tree.
- `ArtistInvitesContext` likewise avoids Clerk-only invitation refresh requests while Supabase is selected and clears the count. This prevents an old concurrent Clerk cookie from showing another account’s invitation badge; it does **not** migrate artist invitation permissions or the underlying endpoint.
- **Still not a full website cutover:** account settings, remaining artist/admin privileges and APIs, project-related routes not in the allowlist, and desktop authentication remain Clerk-only. Keep the server switch unset until all release gates are satisfied.
- Source tests: `node --experimental-strip-types --test apps/web/tests/supabase-protected-pages.test.mjs`; `node --test apps/web/tests/account-session-contexts.test.mjs`. Verify sign-in redirect preservation, existing community-tab redirect, cross-account API isolation, and Clerk desktop behavior in a local browser before any enablement.

## Real website sign-in/sign-up routes (staged, Clerk default)

- `/sign-in` and `/sign-up` now select an authentication implementation through the **same server-only** `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER` setting. When unset or `clerk`, they render exactly their previous Clerk components, including existing Clerk redirect handling; JSX and classes in that path are unchanged.
- A new `components/auth/SupabaseAccountAuthForm.tsx` contains the Supabase branch: Google OAuth, email/password login, email registration, password reset request and password update. It reuses the existing preview's CSS module instead of introducing shared CSS changes. It uses the production-format `sb-audioflume-auth` browser cookie, **not** the original localStorage preview client.
- The form verifies direct email/password login using **`GET /api/account/auth-session`**, a new production (not preview) endpoint. It returns only `{authorized:true}` after a server-verified cookie and linked legacy owner. With Clerk default it returns 404; 401/403/500 fail closed. That exact API path is included in the gated cookie-refresh allowlist. It does not return a legacy owner ID or modify data.
- New `/auth/supabase/callback` exchanges PKCE authorization codes into that same SSR cookie. The handler independently verifies `auth.getUser()` and looks up `auth_identity_links` for an existing legacy owner before redirecting into the site. It never auto-links identities by matching editable email/metadata. Its redirect destination is constrained by `safeAuthRedirect` to same-origin relative paths; unlinked identities go back to sign-in with an explicit notice, and failures return a generic error. The same response retains refreshed cookies when the redirect target changes.
- Clerk middleware now allows this **exact callback path only if the server explicitly selects Supabase**. Other protected website pages, admin/artist routes and desktop paths remain Clerk-protected. No global public-route exemption was introduced.
- **Not yet functional as a complete Supabase-only website:** protected-page middleware still requires Clerk and several pages preload identity using Clerk; activating the global switch now could cause sign-in loops or mixed identities. The real Supabase branch remains dormant and untested in a browser. Do not enable it on shared previews or production until the protected-page, data-security, and desktop gates are closed.
- Supabase Auth redirect URL allowlist must include the precise deployed callback URL(s), for example `http://localhost:3000/auth/supabase/callback` and the relevant production hostname callback URL (when approved); never add a wildcard for arbitrary domains.
- Test `node --experimental-strip-types --test apps/web/tests/supabase-live-auth-routing.test.mjs`, then run a complete local app build and OAuth/email confirmation/password reset tests in an isolated environment only after approved cutover gating.

## Website header and account menu (staged, Clerk default)

- `context/AccountSessionContext.tsx` now exposes a minimal display user (`firstName`, `lastName`, `fullName`, `username`, `imageUrl`, verified email) and `signOut()`, as well as the existing `isLoaded`, `userId`, `isSignedIn` and provider.
- Under the **default Clerk provider**, `useUser()` and `useClerk().signOut()` are still the source; the display fields and sign-out behavior are preserved. Supabase mode uses the existing SSR browser client and `profileFromVerifiedSupabaseUser` for **display only**, with `supabaseAccountBrowser.auth.signOut()` for its cookie session. No client display field becomes a permission or trusted legacy owner.
- `components/Header.tsx` and `components/UserMenu.tsx` now read from this shared session. Their changes are limited to import and hook replacement; comparison against the previous commit verified **no JSX, classes, styles, menu markup, links, icons, or animations changed**.
- **Still blocked:** the current `/sign-in` and `/sign-up` URLs, account/protected page middleware, root layout's pending artist-invite preload, and `ArtistInvitesContext` remain Clerk-oriented. Therefore the Supabase provider setting must **not** be enabled for live web or desktop. A proper reviewed Supabase sign-in/sign-up/account recovery flow and protected-route routing are required before cutover.
- Validation: `node --test apps/web/tests/account-session-contexts.test.mjs`. Also verify both desktop/mobile header account menus, Clerk sign-in/sign-out, avatar fallbacks, account links, playlist cache isolation and Supabase preview session behavior with the server switch **unset**.

## Music, playlists and Discover identity hooks (staged)

- `app/music/page.tsx`, `app/playlists/page.tsx` and `app/discover/DiscoverCuratedHeroCopy.tsx` now consume `useAccountSession()` instead of direct Clerk hooks. The same `userId` and `isLoaded` fields are used in each existing computation, including music filter storage keys and saved playlist selection.
- Comparison with the prior committed versions confirmed **only the auth import and hook call changed** in each page. All markup, music filters, data requests, saved-state logic and visual behavior remain otherwise identical.
- Under Clerk (default) browser storage keys stay unchanged. Under Supabase they partition by Supabase session ID for client-only storage. Server-side account access still requires the verified legacy owner mapping.
- The `/music`, `/playlists`, and Discover experience still require full signed-in/guest regression tests. **Do not enable** the Supabase provider while other protected routes and artist/admin/desktop authorization remain Clerk-only.
- Source validation: `node --test apps/web/tests/account-session-contexts.test.mjs`.

## Website shared account-data contexts (staged)

- `context/AccountSessionContext.tsx` provides `isLoaded`, `userId`, `isSignedIn` to account-data contexts, with the provider selected **on the server** in `app/layout.tsx` using the same exact `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER` setting as the account APIs. It remains **Clerk by default**.
- `FavoritesContext`, `PlaylistsContext`, `ProjectsContext`, `UserPreferencesContext` and `PlaylistFilter` now use this session source. Their JSX, CSS, icons, callback logic, localStorage key formats and mutation behavior are unchanged.
- In Clerk mode, the session identity is the existing Clerk user ID, preserving playlist cache keys. In Supabase mode the identity used to partition browser caches is the Supabase Auth user ID; it **is not the legacy database owner** and cannot authorize API access. Each migrated API still verifies the cookie via server `getUser()` and resolves the legacy ID with `auth_identity_links`.
- `POST /api/playlists/migrate-covers` is also converted to the same owner resolver and refreshed-cookie allowlist because `PlaylistsContext` invokes it automatically. The R2 conversion/upload and owner-scoped update logic are unchanged.
- `Header` and `UserMenu` now consume the Clerk-default shared session without visual changes. `ArtistInvitesContext`, protected page middleware, desktop login, artist/admin roles and other Clerk consumers are **not converted**. The application still cannot operate end-to-end under Supabase-only sign-in. The provider switch must remain unset in live environments.
- Test: `node --test apps/web/tests/account-session-contexts.test.mjs` (source contract), plus existing route/provider and account tests. Test signed-in, signed-out, account switches, pre-existing playlist localStorage, cross-account Favorites/Projects data, and desktop behavior before any provider cutover.

## Verified identity adapter validation

From the repository root:

```bash
node --experimental-strip-types --test apps/web/tests/verified-supabase-profile.test.mjs
node --test apps/web/tests/account-route-migration.test.mjs
node --experimental-strip-types --test apps/web/tests/supabase-account-session-routing.test.mjs
```

The adapter changes **no stored schema or membership entitlement logic**; nevertheless, before a cutover, verify that profile GET/PATCH, billing GET/PATCH, and membership GET preserve data for the same legacy account in both authenticated modes. Use separate test identities, check denied unlinked sessions, and confirm values are unchanged after switching providers. Never rely on client-supplied legacy IDs, editable metadata claims, or email matching to authorize account access.

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
| `GET/PATCH /api/account/profile` | Previously directly used Clerk `currentUser()` | Now uses `resolveAccountIdentity` (Clerk default, verified Supabase owner + display identity when enabled); requires runtime parity validation. |
| `GET /api/desktop/auth/token` | Clerk session plus `currentUser()` issues desktop HMAC tokens | Requires a separately reviewed desktop login/callback/token rollout; do not silently change. |

## Automated access inventory (new)

Run from the repository root:

```bash
node apps/web/scripts/audit-auth-cutover.mjs
node --test apps/web/tests/auth-cutover-audit.test.mjs
```

Use `node apps/web/scripts/audit-auth-cutover.mjs --json` for a machine-readable report. This scans web source for explicit browser Supabase imports, literal/dynamic `.from()` queries and Clerk imports in client components and API handlers. The dynamic-query heuristic now narrows results to recognizable database clients and ignores literal table names and ordinary non-database `.from()` calls; it may still miss aliases or chained clients.

**Scope/limitations:** heuristic static import scanning does not prove that a call is reachable from the browser through a transitive dependency, cover desktop code, resolve dynamic query targets, or inspect RPCs/network libraries. Review findings against the real code and Supabase Data API settings before changing grants. Run the scanner after each major migration batch to detect new dependencies. No app behavior is changed by this tool.

## Critical browser-direct dependency

`components/PlaylistFilter.tsx` currently imports the legacy browser `supabase` client and directly queries `public.playlists`, filtering with the Clerk `userId`. The owner filter is **not** a database permission barrier while RLS is disabled.

The **Clerk-default, Supabase-ready** `GET /api/playlists/filter-options` returns `[{ id, name }]` alphabetically ordered from an owner-scoped server query. `PlaylistFilter.tsx` now uses this endpoint; test signed-in lists, guests, loading/error states, and playlist selection for exact parity.

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

## Staged account security view (not yet route-enabled)

- `components/account/sections/SecuritySection.tsx` retains the original Clerk security controls and events view. The existing `useAccountSession()` server-selected provider selects an isolated `SupabaseSecuritySection` in the future Supabase branch; no existing Clerk JSX was redesigned.
- The isolated view supports requesting a password recovery email using the existing production-cookie browser client and existing auth callback path. It does not attempt to replace Clerk MFA, backup email management or authoritative Supabase security history. Those controls are explicitly unavailable rather than simulated.
- **`/account/security` remains excluded from `isMigratedAccountPage` and protected by Clerk.** This is a staged UI implementation, not a functional Supabase-only security page. Do not add the path to Supabase page guards until browser recovery flow, authorization, MFA/recovery policy and cross-account isolation have been reviewed.
- Source-level regression checks: `node --experimental-strip-types --test apps/web/tests/supabase-account-security.test.mjs`. Local test suite, browser recovery flow and production build are still unverified.

### Security-view follow-up (still not route-enabled)

- The account security wrapper now mounts either the original Clerk-only child or the staged Supabase child. Clerk's `useUser()`, `useClerk()` and security event fetch run only when the Clerk child is mounted, avoiding mixed-provider account reads.
- The staged Supabase child displays the existing account audit events using `/api/account/security-events`, which resolves the verified linked owner on the server. Client event state is keyed to the current session user ID so an identity switch does not display the prior account's events.
- MFA, backup-email controls, password-reset callback verification, browser integration, and build gates remain outstanding. The `/account/security` path still requires Clerk and `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER` must remain unset.
- Regression coverage: `node --experimental-strip-types --test apps/web/tests/supabase-account-security.test.mjs`. Source-only assertions were added; runtime/browser validation has not been performed here.

### Password update verification gate (staged)

- The Supabase sign-in/reset form now checks the existing `GET /api/account/auth-session` before calling `auth.updateUser({ password })`. This endpoint independently verifies the SSR cookie session and its one-to-one legacy owner link, denying missing or unlinked identities. It is not called for Clerk sign-in or sign-up.
- This check **does not prove that a recovery email was clicked**; the existing OAuth/PKCE callback and recovery-session behavior must still be validated in a browser. It avoids changing account credentials from a form state without a linked verified session, but is not a substitute for a recovery-token challenge or reauthentication policy.
- The global provider switch remains unset. Source regression: `node --experimental-strip-types --test apps/web/tests/supabase-live-auth-routing.test.mjs`. The runtime test and full build remain unverified here.

## Artist permission authorization foundation (staged; no artist/admin page cutover)

- `lib/auth/resolvePrivilegedActor.ts` selects the existing Clerk `requireAdmin()` logic unchanged while Clerk is active. In explicit Supabase mode it independently verifies `resolveAccountOwner()` and uses only the one-to-one mapped legacy owner for artist membership checks.
- **Supabase mode never grants admin privileges in this adapter.** Admin roles from a concurrent Clerk session, editable Supabase user metadata, and identity email are not imported into the new provider. A dedicated, server-trusted admin role model and review of remaining admin endpoints are mandatory before any admin cutover.
- `lib/artistPermissions.ts` keeps the existing artist-membership queries, role-to-permission matrix and permission-denial behavior. `GET /api/artists/access` now uses the same provider-aware linked-owner adapter, preserving the response payload and failing closed for unauthenticated/unlinked accounts.
- Only the exact `/api/artists/access` endpoint was added to the gated Supabase session-refresh allowlist. No artist or admin page paths were added to the migrated page guard; `/artists/dashboard` still uses Clerk server identity to accept invitations and display member profiles, and other artist/admin routes still need endpoint-by-endpoint review.
- Source checks: `node --experimental-strip-types --test apps/web/tests/supabase-artist-authorization.test.mjs`. Browser, build, admin-permission, invitation, artist upload, concurrent-session and database RLS checks are still release gates. Do not enable `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase` on a live deployment.

## Artist dashboard identity staging (page guard unchanged)

- `app/artists/dashboard/page.tsx` retains the existing Clerk branch unchanged: `currentUser()`, existing profile initialization, automatic pending team-invitation acceptance, artist membership/profile reads and `ArtistDashboardShell`.
- Under explicit Supabase provider selection only, the staged dashboard rendering branch calls `resolveAccountIdentity()` and refuses missing, unlinked or unavailable identities. It seeds the same legacy-ID-keyed profile and reads dashboard profiles using the independently verified one-to-one linked owner. It deliberately **does not** run `acceptPendingArtistTeamInvitations` from a Supabase email; verified invitation ownership and explicit acceptance must be separately migrated.
- **Not a live Supabase dashboard:** `/artists/dashboard` remains outside `isMigratedAccountPage` and stays Clerk-protected in middleware. Many nested artist APIs and client-side hooks still rely on Clerk. Do not enable this page for Supabase until those dependencies, account switching, and admin permission boundaries are audited and browser-tested.
- Focused source tests: `node --experimental-strip-types --test apps/web/tests/supabase-artist-dashboard-identity.test.mjs`. Build and browser tests remain outstanding.

## Coordinated website authorization pass: artist applications and admin isolation

- `lib/admin.ts` now returns `isAdmin: false` before reading Clerk credentials when the server explicitly selects Supabase. The default Clerk path continues using the existing Clerk public-metadata role and server-side `ADMIN_EMAILS` allowlist. **This is a fail-closed staging guard, not a Supabase admin-role implementation.** Existing admin features must remain Clerk-only until server-trusted Supabase authorization and end-to-end validation exist.
- Two privileged admin endpoints, `/api/admin/audio-proxy` and `/api/admin/system-health`, checked `currentUser()` directly rather than calling `requireAdmin()`. Both now also deny Supabase-selected requests before reading a concurrent Clerk session. Their existing Clerk checks and API behavior remain intact.
- `GET/POST /api/artists/apply` use `resolveAccountIdentity()`, preserving the verified one-to-one legacy owner ID and display identity for profile creation, artist record creation, membership creation and owned-application queries. Application validation, media URL rules, response shape and status handling are unchanged apart from propagating authorization failure statuses.
- `POST/DELETE /api/artists/apply/images` and `POST/DELETE /api/artists/apply/samples` now use `resolveAccountOwner()` for both upload and cleanup paths. The trusted **legacy owner ID** continues to determine the existing R2 storage prefix; no Supabase UUID storage-prefix changes were introduced.
- `GET/POST /api/artists/claim` intentionally remain Clerk-only and now return 403 when Supabase is selected, *before* reading Clerk identity. Claiming/ownership transfer uses verified Clerk email addresses and a privileged database RPC. It must not be migrated using merely a Supabase user email or metadata; email verification, invitation ownership and RPC behavior need explicit review first.
- The exact `/api/artists/apply`, `/api/artists/apply/images` and `/api/artists/apply/samples` endpoints are included in gated Supabase cookie refresh. This **does not** refresh all `/api/artists/*` routes or touch `/api/admin/*` and `/api/desktop/*`.
- Tests added at `apps/web/tests/supabase-website-authorization-batch.test.mjs`: run with `node --experimental-strip-types --test apps/web/tests/supabase-website-authorization-batch.test.mjs` from repository root.

**Outstanding website authorization blockers:** `/artists/dashboard` remains Clerk-guarded; `/artists/claim` page still embeds Clerk sign-in; existing artist-specific APIs and invitation acceptance must be audited; admin pages are still Clerk UI; Supabase admin roles are intentionally unavailable; RLS and browser/build tests are not complete. Do not enable `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase` globally.

### Artist-team provisioning boundary

- `POST /api/artists/[id]/team` still provisions existing users and invitations through Clerk. Because linked-owner authorization now applies to artist permissions, this **POST** endpoint explicitly rejects Supabase-selected requests with 403 before running Clerk user lookup or invitation provisioning. Clerk behavior is untouched.
- Team membership reads and role editing still use `requireArtistPermission` and existing database membership checks; the underlying Clerk user-directory enrichment remains a dependency to replace before a complete Supabase-only artist-team experience. No blanket artist-route refresh or dashboard guard was introduced.

- Pending artist-team invitation revocation in `DELETE /api/artists/[id]/team` also remains Clerk-only because it calls the Clerk invitation API; linked Supabase membership removals continue to require `artist:manage_members` and the existing artist/owner query predicates.

## Desktop authentication and sync bearer transition (staged, independently gated)

- `lib/auth/selectDesktopAuthProvider.ts` adds a **separate server-only desktop cutover switch**. Supabase desktop mode requires **both** `AUDIOFLUME_DESKTOP_AUTH_PROVIDER=supabase` and `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase`. With either setting unset, the existing desktop Clerk-based token issuer, token version, connection code, deep link and sync requests behave as before. **Do not enable either setting in shared or production environments yet.**
- `lib/desktopAuth.ts` retains HMAC-signed `fwdesktop_v1` bearer tokens by default and stages `fwdesktop_supabase_v1` tokens only under both server switches. Signature, expiry checks, bearer extraction, owner field and current token lifetime remain unchanged. Validation rejects a token whose version is not the selected desktop provider; an old Clerk desktop token cannot authorize a Supabase-mode sync. Tokens are not Supabase access tokens and never expose Supabase refresh tokens to the Tauri app.
- `/api/desktop/auth/token` retains its existing HTML connection screen, pasteable token, `audioflume://auth/callback` deep link and default Clerk `auth()/currentUser()` issuance. Under dual Supabase selection only, issuance uses `resolveAccountOwner()`: an independently verified Supabase cookie, required one-to-one identity link, and the **legacy owner ID**. Unlinked or missing sessions receive no desktop bearer. The website's existing `/sign-in` redirect continues unchanged.
- `/api/desktop/projects` and `/api/desktop/projects/local-readiness` preserve bearer-token handling, but disable fallback to a concurrent Clerk browser cookie in Supabase desktop mode. `/api/desktop/files` still accepts the original Clerk session/dev fallback in default mode, but **requires a provider-bound desktop bearer** in Supabase desktop mode. Other sync endpoints already authorize via `getDesktopUserIdFromRequest` or `verifyDesktopToken`, which use the same provider-bound token verification.
- No changes were made under `apps/desktop`, shared player or styles, sync payload formats, Tauri deep-link handling, project schemas, or RLS.
- Checks: `node --experimental-strip-types --test apps/web/tests/supabase-desktop-auth-cutover.test.mjs` at repo root, then verify Clerk connection and real folder sync on both modes. Full integration/build tests have **not** been run by this change.

**Remaining desktop release gates:** the `/api/desktop/me` endpoint still uses Clerk user-directory lookup for account display; browser-cookie refresh during Supabase desktop token issuance needs end-to-end verification; existing desktop tokens are long-lived signed bearer credentials and do not yet provide link-revocation checks per request; SSE streaming, cross-account project access, concurrent sessions and automatic sync need regression testing. The staged token-version switch is not a production cutover authorization to enable Supabase.

- `GET /api/desktop/me` now supports a Supabase desktop-bearer branch that reads `user_profiles` with an exact `clerk_user_id` predicate. This returns existing display name and avatar for the linked legacy owner without invoking Clerk's user directory. It deliberately returns `email: null` rather than treating editable display metadata or a billing email as an authenticated address. The default Clerk user-directory branch remains unchanged. Supabase profile display requires that the account's existing user profile record has been initialized.
- Additional regression check in `supabase-desktop-auth-cutover.test.mjs` covers this owner-scoped profile path. The full browser, desktop connection and sync integration checks are still pending.

## Live database security audit — blocking 2026-11-09 finding

Read-only inspection of the Audioflume Supabase project found **14 RLS-disabled tables in the exposed `public` schema**; all 14 currently grant anon and authenticated roles direct SELECT/INSERT/UPDATE/DELETE. These include private favorites/playlists/projects/account profiles, billing, memberships and security events, as well as songs. A publicly readable `project_folder_paths` view also lacks `security_invoker`; `project_sync_operations` policies compare a Supabase JWT UUID subject with legacy Clerk owner strings. The identity link table retains the expected one-to-one constraints and no end-user API permissions.

- Reproduce the audit with **read-only** `apps/web/scripts/audit-auth-rls.sql`. See `apps/web/docs/supabase-auth-rls-rollout.md` for the exact affected tables, staged isolation plan, breaking-change risks and browser/desktop security acceptance tests.
- The review **did not apply a database migration or change live data/grants**. Enabling RLS or revoking access requires inspection of public music and other direct Data API consumers, a generated and reviewed migration in a staging environment, and cross-account regression tests.
- The `supabase-account-session-routing` regression list was synchronized with previously migrated exact artist application APIs; previously it incorrectly asserted that `/api/artists/apply` remained Clerk-only.
- Regression source gate: `node --experimental-strip-types --test apps/web/tests/supabase-rls-cutover-readiness.test.mjs apps/web/tests/supabase-account-session-routing.test.mjs`. Also rerun Supabase Security Advisor and validate the complete staging environment.

**Do not enable either global provider switch.** This is a confirmed database access-control blocker regardless of whether the new authentication provider is active.

## Atomic RLS staging candidate (unapplied)

`apps/web/scripts/staged-auth-rls-lockdown.sql` is a **transactional, staging-only** remediation candidate for the 14 exposed tables identified in the live audit. It enables RLS and revokes direct `anon`/`authenticated` table privileges, revokes access to the exposed project-folder view, and sets the view to `security_invoker = true`. A preflight inventory and postcondition checks abort rather than silently leaving a partial lockdown. It changes no server-side `service_role` authorization and adds **no** permissive policies. Its design deliberately favors existing server APIs over direct browser-table access.

This SQL has **not** been applied to production or a hosted staging project. It **was** executed successfully against a local disposable Supabase 17 database restored from a schema-only production snapshot on 2026-11-09; the 14-table SQL gate passed, anon and authenticated database roles were denied direct table/RPC access, service_role permissions were retained, and the local REST API returned 401 for anon / 200 for service_role. It is not an official generated migration. Real web/artist/desktop workflow integration testing and a production cutover review are still required. `apps/web/tests/supabase-rls-lockdown-staging.test.mjs` is a source-level structural test only. The live 14-table exposure remains open pending approved remediation. See `supabase-auth-rls-rollout.md` for the staged application checklist.

## Supabase desktop bearer identity-binding batch (2026-11-09)

New Supabase-mode desktop tokens now carry both the verified legacy owner ID and the server-verified Supabase Auth subject UUID returned from `auth.getUser()`. `createDesktopToken` refuses to issue a Supabase-mode bearer without that UUID; `verifyDesktopToken` rejects older subject-less Supabase desktop tokens. In Clerk mode, the previous payload/version and authorization behavior remain unchanged.

`getVerifiedDesktopUserIdFromRequest` validates an HMAC-signed, provider-bound bearer and then resolves the **current exact Supabase subject → legacy owner ID** from `auth_identity_links` via the server's privileged Supabase client. Unlinked, relinked, absent or database-error cases deny access. This is applied to all desktop account, project listing/readiness, local changes/removals, sync-operation and file-delivery routes. There is no automatic fallback to a Clerk cookie when Supabase desktop mode is enabled.

Because older staged Supabase desktop tokens don't contain the subject UUID, users testing Supabase desktop mode must reconnect the desktop app after deploying this migration. Tokens do **not** become invalid merely on Supabase web sign-out; for now unlinking the identity or rotating the desktop-token secret revokes them, and the 30-day token expiration remains. The test file `apps/web/tests/supabase-desktop-auth-cutover.test.mjs` includes functional, injected-lookup checks for unlink/reassign/DB-error outcomes plus source coverage for all protected endpoints. Manual desktop E2E checks remain required before either provider switch is enabled.

## Gated trusted Supabase admin authorization (2026-11-09)

The staged migration implements Supabase admin authorization in `lib/admin.ts` and `lib/auth/resolvePrivilegedActor.ts`, with a second **server-only, disabled-by-default** switch `AUDIOFLUME_SUPABASE_ADMIN_AUTH_ENABLED=true`. Both this switch and `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase` are required; existing Clerk mode retains its publicMetadata and server `ADMIN_EMAILS` behavior unchanged.

In Supabase mode, admin evaluation first uses `resolveAccountOwner()` to establish the current authenticated Supabase subject and its one-to-one linked legacy owner. It then re-fetches **that exact Supabase subject** from `supabaseServer.auth.admin.getUserById()` and accepts only the server-controlled Auth `app_metadata.role === "admin"`. User-editable `user_metadata`, browser-provided roles, email/allowlists and concurrent Clerk sessions cannot elevate privileges. Failed identity lookups, role fetch errors and missing metadata fail closed. The legacy owner ID is retained for existing `*_clerk_user_id` audit/ownership columns.

**No user is automatically made an admin.** Before enabling the separate admin flag on a staging system, provision each intended administrator's Supabase Auth `app_metadata.role` using a privileged, audited administrative procedure, verify the subject UUID and `auth_identity_links` row, and test allow/deny for an admin, ordinary linked user, unlinked user, and stale/changed link. Do **not** commit a service-role key or run user promotion against production as part of this migration.

`/api/admin/system-health` and `/api/admin/audio-proxy` have independent legacy Clerk-only allowlist guards and **remain unavailable in Supabase mode** pending separate endpoint review. The current artist-team invitation operations also remain Clerk-only. Application E2E testing is still required before any rollout or production cutover.

Targeted tests: `node --experimental-strip-types --test apps/web/tests/supabase-trusted-admin-gate.test.mjs apps/web/tests/supabase-website-authorization-batch.test.mjs apps/web/tests/supabase-artist-authorization.test.mjs`.
