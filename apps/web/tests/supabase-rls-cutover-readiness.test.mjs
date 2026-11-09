import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shouldRefreshAccountSession } from "../lib/auth/shouldRefreshAccountSession.ts";
import { selectAccountAuthProvider } from "../lib/auth/selectAccountAuthProvider.ts";
import { selectDesktopAuthProvider } from "../lib/auth/selectDesktopAuthProvider.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

const unprotectedAtAudit = [
  "favorites", "playlist_songs", "playlists", "project_assets",
  "project_folders", "projects", "song_edit_points", "song_shorten_jobs",
  "songs", "user_billing_profiles", "user_downloads", "user_memberships",
  "user_profiles", "user_security_events",
];

test("the RLS audit is read-only and explicitly checks privilege types and missing RLS", async () => {
  const sql = await read("scripts/audit-auth-rls.sql");
  assert.match(sql, /FROM pg_class c/);
  assert.match(sql, /c\.relrowsecurity AS rls_enabled/);
  for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.ok(sql.includes(`has_table_privilege('anon', c.oid, '${privilege}')`));
    assert.ok(sql.includes(`has_table_privilege('authenticated', c.oid, '${privilege}')`));
  }
  // No changes to real database data or privileges from an audit script.
  const sqlWithoutComments = sql.replace(/^--.*$/gm, "");
  assert.doesNotMatch(sqlWithoutComments, /\b(?:ALTER|CREATE|DROP|REVOKE|GRANT|TRUNCATE|DELETE|UPDATE|INSERT)\s+(?:TABLE|POLICY|VIEW|FROM|INTO|ON|ALL|SELECT|public)/i);
  assert.equal((sqlWithoutComments.match(/\bSELECT\b/g) ?? []).length >= 5, true);
});

test("audit covers sensitive identity links, policies, views and privileged functions", async () => {
  const sql = await read("scripts/audit-auth-rls.sql");
  assert.match(sql, /FROM pg_policies/);
  assert.match(sql, /conrelid = 'public\.auth_identity_links'::regclass/);
  assert.match(sql, /has_table_privilege\('anon', 'public\.auth_identity_links', 'INSERT'\)/);
  assert.match(sql, /c\.relkind IN \('v', 'm'\)/);
  assert.match(sql, /project_sync_operations/);
  assert.match(sql, /p\.prosecdef AS security_definer/);
});

test("rollout plan records every known unsafe exposed table rather than defaulting to permissive policies", async () => {
  const plan = await read("docs/supabase-auth-rls-rollout.md");
  for (const table of unprotectedAtAudit) assert.ok(plan.includes(`\`${table}\``), table);
  assert.match(plan, /14 tables/);
  assert.match(plan, /service.role|service_role/);
  assert.match(plan, /auth\.uid\(\)/);
  assert.match(plan, /security_invoker/);
  assert.match(plan, /project_sync_operations/);
  assert.match(plan, /do not apply|do not execute|not apply/i);
});

test("auth remains disabled by default and desktop requires independent operator selection", () => {
  assert.equal(selectAccountAuthProvider(undefined), "clerk");
  assert.equal(selectDesktopAuthProvider(undefined, "supabase"), "clerk");
  assert.equal(selectDesktopAuthProvider("supabase", undefined), "clerk");
});

test("artist session routes are exact while admin, claim, desktop and unknown routes stay excluded", () => {
  for (const path of [
    "/api/artists/access",
    "/api/artists/apply",
    "/api/artists/apply/images",
    "/api/artists/apply/samples",
  ]) {
    assert.equal(shouldRefreshAccountSession(path), true, path);
  }
  for (const path of [
    "/api/artists/claim",
    "/api/artists/apply/images/extra",
    "/api/artists/42/team",
    "/api/admin/system-health",
    "/api/desktop/projects",
  ]) {
    assert.equal(shouldRefreshAccountSession(path), false, path);
  }
});
