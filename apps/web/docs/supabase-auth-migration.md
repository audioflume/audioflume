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
- Supabase Auth currently has no existing user accounts. Legacy ownership data must be retained.

## Prototype (this branch only)

- `/auth-preview` provides a custom Google/email-password interface plus sign-up, recovery and sign-out.
- Google OAuth explicitly requests `prompt=select_account`; **Google decides which account appears first**. The app cannot reliably reorder Google's native account list.
- The prototype uses the existing browser Supabase client and **must not be used as production SSR authorization**.
- Sign-in to the prototype does **not** establish access to any legacy Clerk-owned records.
- Production `/sign-in`, `/sign-up`, middleware protection, web APIs and desktop sync remain on Clerk.

## Security prerequisite — do not skip

Supabase's connected-project advisory reported 14 public tables with RLS disabled, including user data. The project also has tables with RLS enabled and no policies, plus a `security_definer` view. The legacy app currently uses a server-side service-role client.

Before any cutover:
1. Map required public vs private data access per table. Inspect existing grants, RLS, views and RPCs.
2. Apply ownership-checked RLS policies and restrict browser-facing grants. **Never** fix access by granting unrestricted access to `authenticated`.
3. Keep server-side service-role credentials server-only. Use cookie-aware SSR clients for user sessions, and call `auth.getUser()` or `auth.getClaims()` as appropriate.
4. Test public browsing, authenticated account reads, creation, updates, admin endpoints, artist permissions and desktop requests. Do not enable RLS in production blindly.

Reference: https://supabase.com/docs/guides/database/postgres/row-level-security

## Identity preservation

The Clerk ID is currently the application-facing ownership key. Supabase Auth uses new UUID identities.

1. Establish a **server-only** identity mapping table, keyed by Supabase `auth.users.id`, unique on `clerk_user_id`. Require RLS and revoke `anon` / `authenticated` access.
2. Link users only after independently verifying both the existing Clerk session and the Supabase session, or through an equivalent authenticated administrative migration process. Do **not** link solely because email addresses match.
3. Migrate administrative role claims to trusted server-managed authorization data, **not** Supabase `user_metadata`.
4. Use a trusted resolver to map each verified Supabase UUID to the correct existing owner key in API routes before converting user-owned queries.
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
- [ ] Set up Google and SMTP for a test environment.
- [ ] Implement and test trusted UUID-to-legacy-ID linking.
- [ ] Establish SSR cookie-based Supabase sessions (`@supabase/ssr`), including refresh handling. Update package and lockfile together.
- [ ] Convert server API authorization and data-ownership lookups.
- [ ] Convert web auth provider/hooks and all dependent components.
- [ ] Replace Clerk account security, profiles, invitations and admin identity lookup.
- [ ] Migrate desktop sign-in and HMAC-token issuance/verification while preserving desktop project access.
- [ ] Add data access policies; verify affected tables and views.
- [ ] Test sign-in/out, Google multiple-account chooser, Apple, email/password, recovery, reload persistence, new/existing users, identity switching, every account area and desktop synchronization.
- [ ] Compare ownership records before/after migration and verify rollback.
- [ ] Cut over sign-in routes and middleware in a controlled release.
- [ ] Remove Clerk only after successful validation and an agreed rollback window.

## Acceptance criteria

No existing user's songs, favorites, playlists, projects, licenses, artist ownership, subscriptions, desktop projects or admin permissions are reassigned or lost. A user who signs in with a different social identity cannot gain access to an existing account unless ownership has been verified. Social sign-in uses provider-owned OAuth, and Google shows its account chooser.

## Rollback

Clerk production paths stay intact until final cutover. Keep a documented database backup, identity mapping export and tested rollback release. Do not delete existing Clerk identities or columns during the transition.
