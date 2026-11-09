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
