# Supabase Auth cutover — live RLS audit and remediation sequence

**Audit date:** 2026-11-09. **Project:** Audioflume. **Status:** release-blocking findings; review only. **No live SQL changes made.**

This document describes the observed database state, not a completed migration. Use the read-only `apps/web/scripts/audit-auth-rls.sql` against the **correct project** to reproduce the inventory before making decisions. Run the Supabase Security Advisor again after each approved change.

## Blocking live findings

At audit time, **14 tables** in exposed `public` had RLS disabled. All 14 also granted **anon** and **authenticated** roles SELECT, INSERT, UPDATE and DELETE (and the other common privileges observed), so direct Data API clients can bypass application-level ownership checks. Server-side owner verification does **not** protect these grants.

| Table | Intended access after migration |
| --- | --- |
| `favorites` | Owner-only account data |
| `playlist_songs` | Owner through parent playlist; separately review any public-playlist visibility requirements |
| `playlists` | Owner-only writes; separately preserve approved public/community playlist reads |
| `project_assets` | Owner through parent project |
| `project_folders` | Owner through parent project; do not trust potentially null or mismatched child `clerk_user_id` |
| `projects` | Owner-only account data |
| `song_edit_points` | Catalog metadata: preserve published reads only if explicitly required; server-administered writes |
| `song_shorten_jobs` | Internal processing / owner-specific jobs; no generic browser writes |
| `songs` | Public published catalog only via reviewed API or restricted view; unpublished/private data and writes remain privileged |
| `user_billing_profiles` | Owner-only billing data, server-controlled Stripe fields |
| `user_downloads` | Owner-only usage/license records, server-controlled writes |
| `user_memberships` | Owner-only read; server-controlled entitlements and writes |
| `user_profiles` | Owner-only account profile; separately review deliberately public artist/member display fields |
| `user_security_events` | Owner-only audit event reads; server-controlled event creation |

**Immediate implication:** Public Data API grants on these tables are a current exposure, independent of when the Supabase Auth feature flag is activated. Prioritize containment with the database operator and verify public site dependencies before revoking access. This review did **not** change production.

Additional observations:

- `auth_identity_links` already has RLS enabled, no user-facing policies, no anon/authenticated table privileges, primary key on `supabase_user_id`, unique constraint on `clerk_user_id`, and a foreign key to `auth.users`. Preserve that boundary. All identity mapping must continue to use server-authenticated `auth.getUser()` and a server-privileged lookup.
- `public.project_folder_paths` is an exposed view with no `security_invoker` option, and SELECT is granted to anon and authenticated. Its recursive definition traverses `project_folders`, an owner-private table. Review all callers, then apply `security_invoker = true` and appropriate view grants **only together with** correctly scoped base-table RLS. A standalone view change may break reads or leave an unintended path.
- `project_sync_operations` has RLS enabled, but its policies compare `projects.clerk_user_id` to `auth.jwt() ->> 'sub'`. Supabase Auth's JWT `sub` is a Supabase UUID, not the legacy Clerk ID. The referenced `projects` table also currently has no RLS. Replace this comparison with an independently verified owner-link mapping in an approved migration. Check UPDATE policies include both `USING` and `WITH CHECK`; avoid `auth.role()`.
- Security Advisor also reported 37 tables with RLS enabled and no policies (often intentional service-role-only access), one security-definer view, and four functions whose search path was mutable. Review function signatures and permissions before changing them.
- Most application API routes use server-side `supabaseServer` with a service-role key. Service-role queries bypass ordinary RLS. Keep the key server-only and preserve server-side authorization: enabling RLS is **defense in depth**, not a replacement for API ownership checks.

## Remediation order — do not apply blindly

1. **Inventory and isolate current access paths.** Run `node apps/web/scripts/audit-auth-cutover.mjs --json` and the read-only SQL audit. Search the website, desktop, edge functions, and any external apps for direct Data API and database clients. Preserve approved public song, playlist and discover reads through server APIs or explicitly restricted published-content views. Avoid copying privileged `songs` columns into public APIs.
2. **Prove owner identity across providers.** Use the Supabase Auth UUID from server-verified `auth.getUser()`, mapped through `auth_identity_links` to `clerk_user_id`. For browser database policies if truly needed, use an ownership predicate based on `(select auth.uid())` and the locked-down mapping, or prefer server-only APIs. Never use email, `user_metadata`, client-provided owner IDs or JWT `sub` string equality to a legacy ID.
3. **Design and review per-table RLS and grants.** Private account data must be inaccessible to anon and other users. Child records (`playlist_songs`, `project_folders`, `project_assets`) require ownership through their parent. If direct browser writes are unnecessary, revoke those privileges and keep writes in owner-checked server APIs. For policies on UPDATE, require both original owner in `USING` and new owner in `WITH CHECK`; SELECT policy is needed for UPDATE. Do not grant generic `TO authenticated USING (true)` policies.
4. **Deploy in a staging database first.** Use the Supabase CLI to create a uniquely named migration with `supabase migration new`, review the generated changes, run advisor checks, compare required grants, test rollback, and commit the migration and tests together. **Do not execute this document or apply schema changes in production as part of the auth branch.**
5. **Test actual role behavior before deployment.** As anon: attempts to read/write another user's favorites, playlists, projects, billing, membership and security events must fail; published songs and deliberately public playlists must still work through their supported API. As two independently linked Supabase users: verify both read and write isolation, child ownership, rejection of owner reassignment and unlinked-user access. Test all sync-operation statuses, SSE, and desktop file paths. Test the service-role-only server path without exposing its credential to clients.
6. **After database gating, validate end-to-end web and desktop.** Clerk baseline, OAuth/email/reset, account pages, artist/admin boundaries, claims and invitations, desktop login/deep link, realtime/automatic sync, subscription/entitlement continuity, cross-provider session isolation, and token revocation. Run full tests and production-like build, verify rollback, then approve cutover separately.

## Release gate

**Do not enable** `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER=supabase` or `AUDIOFLUME_DESKTOP_AUTH_PROVIDER=supabase` until:

- All 14 unprotected tables have reviewed RLS/grants or have been removed from exposed API access, with documented public-content allowances.
- `project_folder_paths`, `project_sync_operations` and identity-link permissions pass targeted access tests.
- Desktop bearer revocation / account unlinking strategy is implemented and validated. A signed 30-day token is not automatically invalidated when a linked identity or session is removed.
- Artist/admin identity and permission migration is complete, including claims/invitations or explicit user-facing restrictions.
- Integration tests and builds run in a staging environment; feature-flag and rollback tests pass.

Reference: [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [security advisor / database linter](https://supabase.com/docs/guides/database/database-linter), and [API security](https://supabase.com/docs/guides/api/securing-your-api).

## Implemented staging candidate (not applied)

`apps/web/scripts/staged-auth-rls-lockdown.sql` is an **unapplied staging candidate** covering all 14 RLS-disabled tables recorded above. In one transaction, it validates the expected table inventory, enables RLS, revokes every table privilege from `anon` and `authenticated`, revokes direct access to `project_folder_paths`, and sets the view to `security_invoker = true`. A postcondition aborts the transaction if any selected table still lacks RLS or retains browser privileges. Existing server-side `service_role` privileges are intentionally unchanged; no permissive or user-editable-claim policies are created.

**Do not run this file directly in production.** Validate it against a disposable/staging database first. It is *not* a generated Supabase migration; after successful tests, use the current Supabase CLI's `supabase migration new` to prepare a reviewed migration under the repository's actual migration directory. Do not invent or apply a production migration before the public catalog, member profile, account, desktop sync, and RPC consumers pass acceptance tests. The rollout is reversible by a separate **reviewed** grant/policy restoration plan; do not blanket-regrant access as an automatic rollback.

The staging test `apps/web/tests/supabase-rls-lockdown-staging.test.mjs` verifies the exact table list, atomic structure, fail-closed postconditions, no new broad grants, and view restrictions. It is a source-level check, **not** proof that PostgreSQL executed the script or that an application build passed. Run it alongside `supabase-rls-cutover-readiness.test.mjs`, then conduct real anonymous/linked-account query tests in staging.

**RPC review before staging application:** The database includes a security-definer `save_curated_playlist_to_user` function (its role grants should remain restricted). Confirm each server-used RPC runs under a trusted role after revoking client table grants. Separately audit any `SECURITY INVOKER` functions and views for direct client access; a successful owner-scoped API request is not sufficient proof of full compatibility.

## Additional live privilege finding: song revision functions (2026-11-09)

Read-only role/ACL inspection found `public.apply_song_pending_revision(uuid)` to be a `SECURITY DEFINER` function executable by both `anon` and `authenticated`. Its body applies a submitted revision to the live `songs` record and related credits/rights, then deletes the pending revision. The website uses `supabaseServer.rpc("apply_song_pending_revision", ...)` from `lib/songPendingRevisions.ts`, so it should be callable only through the existing server-authorized review action. **This is a separate potential unauthorized-publication path that table RLS alone does not close.** The live function ACL specifically granted EXECUTE to both client roles.

The trigger companion `public.sync_song_pending_revision_submission_activity()` also had client-role EXECUTE grants (including an inherited `PUBLIC` grant), despite being a trigger function. The staged lockdown now checks both exact function signatures, revokes their EXECUTE permissions from `PUBLIC`, `anon` and `authenticated`, and verifies that `service_role` still has EXECUTE on the revision RPC. This leaves function definitions, server RPC usage and trigger behavior untouched. Confirm the existing trigger still fires under the application's normal server-managed revision workflow in staging.

After applying the staged candidate to a **staging** project, run the **read-only** `apps/web/scripts/verify-auth-rls-lockdown.sql`. Its output must show zero RLS-disabled or directly exposed tables among the 14, an invoker-secured and non-public folder view, both function permissions false for client roles, and true EXECUTE for `service_role` on the revision RPC. Then run the server-side song revision approval flow and the full website/desktop regression tests. These checks are complementary to (not substitutes for) role-based database and application tests.

Only the production project is currently available through the connected Supabase integration; **no isolated staging Supabase environment was available for executing the candidate**. No production SQL mutations were made. Because the direct public function permission is a confirmed live finding, have the database operator prioritize revoking those grants in an approved, tested emergency security change if exposure cannot be immediately mitigated through other controls.

## Staging-branch creation and fail-closed verification (2026-11-09)

The connected project has **no existing Supabase development branches**. A request to create the isolated `auth-rls-staging-20261109` branch was rejected because Supabase requires an explicit cost confirmation ID. **No branch was created and no charge was authorized.** The operator must agree to Supabase's quoted hourly branching cost before one can be created. A local disposable Supabase/Postgres environment is another option, provided its schema and grants accurately match production and it contains no production secrets.

The prepared `staged-auth-rls-lockdown.sql` had a malformed dollar-quoted function-preflight block; its `DO $$ ... $$;` delimiter has now been corrected. The read-only `verify-auth-rls-lockdown.sql` includes a final `staging_release_gate` row, which returns `PASS_STAGING_SQL_GATE` **only when** all 14 expected tables exist and have RLS and no browser privileges, the invoker-secured folder view exists without browser read grants, both restricted functions exist with no browser EXECUTE, and the server role retains permission on the song-revision RPC. Missing objects return `BLOCKED_STAGING_SQL_GATE`, rather than appearing as zero vulnerabilities.

**A passing SQL gate is not production approval.** After creating a paid/approved development branch or faithful disposable local DB, first verify the baseline schema matches the audited production inventory. Execute the lockdown against that isolated database, inspect the read-only release-gate output, then test public music, artist revision approval, project syncing, browser anon cross-account access, and linked authenticated users. If the staging branch doesn't have the same schema/functions, stop rather than patching it with guessed changes.

## Project sync operations: separately staged table privilege lockdown (2026-11-09)

A **read-only inspection** of the connected Audioflume Supabase project confirmed that `public.project_sync_operations` currently has RLS enabled but its three `{public}` policies still compare `projects.clerk_user_id` (legacy user ID) with `auth.jwt()->>'sub'` (Supabase UUID). `anon` and `authenticated` retain broad direct table grants, and `service_role` has its own required privileges. The `projects` table still lacks enabled RLS at the inspection point. **No database changes were executed.**

The web and desktop API routes and `lib/projectSyncOperations.ts` use `supabaseServer` for operations on this table, behind independently checked owner/desktop access. Accordingly, the conservative staging approach is to deny **all direct browser Data API access** to `project_sync_operations` rather than invent a new JWT/legacy-owner policy or create a SECURITY DEFINER identity lookup. This leaves privileged server calls operational while eliminating the outdated browser-facing policies.

New **independent staging candidate**, not a generated or executed migration:
- `scripts/staged-project-sync-rls-lockdown.sql` — transactional preflight checking the RLS-enabled table, exactly three known policies, and service-role access; drops only those three policies; revokes all table privileges from PUBLIC/anon/authenticated; verifies they lost access while the service role retained SELECT/INSERT/UPDATE/DELETE; aborts atomically on any mismatch.
- `scripts/verify-project-sync-rls-lockdown.sql` — read-only post-deployment check reporting `PASS_PROJECT_SYNC_STAGING_LOCKDOWN` only when policies are absent, browser table privileges are absent, RLS remains enabled, and service-role privileges remain intact.
- `tests/supabase-project-sync-rls-lockdown.test.mjs` — source-level candidate and server-only caller regressions.

**Rollout order:** First verify the separate 14-table staging RLS lockdown and external browser/direct Data API dependencies; then apply the project-sync candidate on an isolated copy of the database, run the read-only verification and authenticated web/desktop sync integration tests; only then generate/review a proper migration for a separately approved production deployment. Do not run either staging SQL candidate directly against production. Do not turn on provider flags as part of this RLS work.

## Unified read-only staging security gate (2026-11-09)

`scripts/verify-auth-unified-security-gate.sql` combines the prepared 14-table lockdown, protected folder view, privileged revision RPC, and project-sync grants/policies into one **SELECT-only**, fail-closed release check. It reports `PASS_STAGING_SECURITY_GATE` only after all four security groups meet their expected conditions and all required objects exist. Separate application, browser, cross-account, desktop, and build verification are still mandatory.

The query was executed **read-only** against the connected Audioflume database on 2026-11-09 and returned:

- `BLOCKED_STAGING_SECURITY_GATE`
- `expected_tables_found=14`, `expected_tables_secured=0`
- `folder_views_found=1`, `folder_views_secured=0`
- `privileged_functions_secured=false`
- `project_sync_tables_found=1`, `project_sync_privileges_secured=false`, `project_sync_policies_remaining=3`

This verifies the actual baseline and query syntax, **not** that a migration was applied or that the connected database is suitable as an isolated staging environment. No privileges, rows, policies, functions or identity links were modified. Do not enable either production Supabase provider until the security rollout is separately approved and validated in staging.
