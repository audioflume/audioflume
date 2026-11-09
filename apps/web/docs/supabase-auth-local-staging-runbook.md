# Local Supabase security staging — Audioflume

**Status:** instructions only. Nothing in this document was executed locally or applied to the connected production Supabase project.

## Why local first

The connected production project had no development branches on 2026-11-09, and creating one requires separate approval of possible charges. Use a **disposable local Supabase database** instead, but only after confirming that its schema, roles, grants, and functions match the production snapshot. Local development does not require a paid Supabase branch.

The following scripts are already prepared and **must not be run on production**:

- `scripts/staged-auth-rls-lockdown.sql` — 14 public tables, folder view, and restricted revision functions.
- `scripts/staged-project-sync-rls-lockdown.sql` — removes stale direct browser project-sync policies and grants.
- `scripts/verify-auth-unified-security-gate.sql` — read-only consolidated postcondition.
- `scripts/verify-supabase-auth-identity-coverage.sql` and `scripts/verify-supabase-legacy-relations.sql` — read-only identity/relationship diagnostics.

## 1. Local prerequisites (no remote operations)

On the development Mac, run from `apps/web`:

```bash
cd /Users/jordanwende/audioflume/apps/web
supabase --version
supabase start --help
supabase db query --help
docker info
```

If `supabase` is not installed, follow the current [CLI installation guide](https://supabase.com/docs/guides/local-development). Do not blindly run an npm installer in the project: pin and review any new package/lockfile changes first. A Docker-compatible container runtime must be running.

Your local `apps/web/supabase/config.toml` and `.gitignore` were created outside Git and are **untracked**. Preserve them, and inspect `git status --short` before staging or committing anything. Never store production secrets in these files.

After the prerequisites pass, `supabase start` starts a **local** stack. `supabase status` shows its local URLs. Do not use `supabase link`, `--remote`, `--linked`, `db push`, or any remote-reset command in this experiment. In current CLI versions, local is the default for local-capable database commands; verify the target shown by your installed CLI before executing SQL.

## 2. Require a faithful local schema before testing

A newly started local Supabase project is **not** automatically a copy of production. In particular, its project-specific `public` tables, security-definer functions, views, existing policy names, and grants may be missing.

Read-only local baseline check (from `apps/web`):

```bash
supabase db query --read-only --file scripts/verify-auth-unified-security-gate.sql
supabase db query --read-only --file scripts/verify-supabase-auth-identity-coverage.sql
supabase db query --read-only --file scripts/verify-supabase-legacy-relations.sql
```

If these fail because objects are absent, **stop**. Do not manufacture placeholder objects, loosen preflights, or interpret a blank local project as staging success. First import a **schema-only** snapshot into the disposable local database using a reviewed, version-compatible process. That requires preserving the exact roles, grants, view options, function signatures and relevant policy definitions. Avoid importing production user rows, credentials, Auth records, or personal data. A schema-only export from the correct production project may require authorized database access and a separate review of the export contents.

Before any write, confirm the local baseline includes:
1. Exactly the 14 expected public tables with RLS disabled and the expected initial browser-role grants.
2. `project_folder_paths` with its audited view privileges.
3. Both exact song-revision function signatures with the audited EXECUTE grants.
4. `project_sync_operations` with RLS enabled, the **three expected named policies**, and service-role privileges.
5. The local test data consists of synthetic owner-linked accounts, a second independent account, public catalog rows, private playlists/projects, and an unlinked user.

Do not copy identifiable production rows just to reproduce observed orphaned playlist/edit-point records. Use synthetic examples if relevant.

## 3. Apply candidate scripts **only to the verified disposable local DB**

After all baseline checks, test setup, and target confirmation, use the installed CLI's help to verify how it targets local databases and executes SQL files. Run the two prepared candidate SQL files **one at a time on local only**. They include their own transactions and postcondition checks and must abort if assumptions have changed.

Then execute the **read-only** unified security gate against the local database. Expected: `PASS_STAGING_SECURITY_GATE`, with 14 secured tables, one secured folder view, two restricted functions, no remaining direct project-sync policies, and intact service-role access.

A passing SQL gate does **not** prove application behavior. Test anon denial, both linked accounts' private read/write isolation, public music discovery, account profile/entitlements, artist revision workflow/trigger, and full project sync and desktop file paths. Confirm service-role APIs work while direct browser Data API access remains denied. Verify a reviewed rollback strategy on the disposable instance.

If anything fails, leave production untouched and capture the exact local error without weakening authorization rules.

## 4. Existing regression checks

```bash
node scripts/check-auth-cutover-readiness.mjs
node --test tests/supabase-auth-release-gate.test.mjs tests/supabase-auth-identity-coverage.test.mjs tests/supabase-legacy-relations.test.mjs
```

These are **source-level tests**, not substitutes for a populated local schema or signed-in browser/desktop tests. They do not change account auth provider flags.

## 5. Release prohibition

Until staging validates **all** security candidates, identity coverage and real cross-account behavior, leave `AUDIOFLUME_ACCOUNT_AUTH_PROVIDER` and `AUDIOFLUME_DESKTOP_AUTH_PROVIDER` in their existing Clerk-default production configuration. Never run candidate DDL against production merely because the website builds or the source tests pass.

References: [Supabase local CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows), [running commands on local and hosted targets](https://supabase.com/docs/guides/local-development/local-and-hosted-projects).
