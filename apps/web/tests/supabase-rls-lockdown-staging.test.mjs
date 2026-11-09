import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditSourceTree } from "../scripts/audit-auth-cutover.mjs";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

const lockedTables = [
  "favorites", "playlist_songs", "playlists", "project_assets",
  "project_folders", "projects", "song_edit_points", "song_shorten_jobs",
  "songs", "user_billing_profiles", "user_downloads", "user_memberships",
  "user_profiles", "user_security_events",
];

test("staging RLS lockdown includes exact 14 exposed tables and atomic rollback on errors", async () => {
  const source = await read("scripts/staged-auth-rls-lockdown.sql");
  assert.match(source, /BEGIN;/);
  assert.match(source, /COMMIT;/);
  assert.match(source, /RAISE EXCEPTION 'RLS lockdown aborted/);
  assert.match(source, /RAISE EXCEPTION 'RLS lockdown failed postcondition/);
  assert.match(source, /RAISE EXCEPTION 'Project folder view still exposed/);
  for (const name of lockedTables) {
    assert.equal((source.match(new RegExp(`ALTER TABLE public\\.${name} ENABLE ROW LEVEL SECURITY;`, "g")) || []).length, 1, name);
    assert.equal((source.match(new RegExp(`REVOKE ALL PRIVILEGES ON TABLE public\\.${name} FROM anon, authenticated;`, "g")) || []).length, 1, name);
  }
  assert.equal((source.match(/ALTER TABLE public\.[a-z_]+ ENABLE ROW LEVEL SECURITY;/g) || []).length, lockedTables.length);
  assert.equal((source.match(/REVOKE ALL PRIVILEGES ON TABLE public\.[a-z_]+ FROM anon, authenticated;/g) || []).length, lockedTables.length + 1);
});

test("lockdown grants no new browser write or broad authenticated role policy", async () => {
  const source = await read("scripts/staged-auth-rls-lockdown.sql");
  const sql = source.replace(/^--.*$/gm, "");
  assert.doesNotMatch(sql, /\bGRANT\s+\w+\s+ON\s+/i);
  assert.doesNotMatch(sql, /\bCREATE\s+POLICY\b/i);
  assert.doesNotMatch(sql, /\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
  assert.doesNotMatch(sql, /\bSECURITY\s+DEFINER\b/i);
  assert.match(sql, /has_table_privilege\('anon'/);
  assert.match(sql, /has_table_privilege\('authenticated'/);
  assert.match(sql, /NOT c\.relrowsecurity/);
  assert.match(sql, /AS missing\(name\)/);
});

test("exposed folder view is revoked and changed to security invoker", async () => {
  const source = await read("scripts/staged-auth-rls-lockdown.sql");
  assert.match(source, /REVOKE ALL PRIVILEGES ON TABLE public\.project_folder_paths FROM anon, authenticated;/);
  assert.match(source, /ALTER VIEW public\.project_folder_paths SET \(security_invoker = true\);/);
  assert.match(source, /has_table_privilege\('anon', 'public\.project_folder_paths', 'SELECT'\)/);
  assert.match(source, /has_table_privilege\('authenticated', 'public\.project_folder_paths', 'SELECT'\)/);
});

test("staging plan never asserts these database changes were applied to production", async () => {
  const sql = await read("scripts/staged-auth-rls-lockdown.sql");
  const plan = await read("docs/supabase-auth-rls-rollout.md");
  assert.match(sql, /STAGING CANDIDATE ONLY/);
  assert.match(sql, /NOT a generated Supabase migration/);
  assert.match(plan, /staged-auth-rls-lockdown\.sql/);
  assert.match(plan, /staging/i);
  assert.match(plan, /Do not run this file directly in production/i);
});

test("lockdown inventory has no direct browser Supabase query dependency in the web source audit", async () => {
  const audit = await auditSourceTree(root);
  const targets = new Set(lockedTables);
  const directReads = audit.directBrowserSupabase
    .filter((entry) => entry.tables.some((table) => targets.has(table)))
    .map((entry) => entry.file);
  assert.deepEqual(directReads, [], "Move direct browser table access to owner-verified server APIs before applying RLS lockdown.");
  // This heuristic cannot detect transitive imports or every dynamic RPC.
  assert.deepEqual(
    audit.dynamicQueries.filter((entry) => entry.isClient).map((entry) => entry.file),
    [],
    "Review dynamic browser DB queries before approving RLS lockdown.",
  );
});

test("privileged revision RPC and trigger function lose browser EXECUTE while server role stays authorized", async () => {
  const sql = await read("scripts/staged-auth-rls-lockdown.sql");
  assert.doesNotMatch(sql, /^DO \$(?!\$)/m, "All procedural preflight blocks require valid dollar-quote delimiters.");
  assert.match(sql, /DO \$\$\s+BEGIN\s+IF to_regprocedure/);
  assert.match(sql, /END\s+\$\$;/);
  assert.match(sql, /to_regprocedure\('public\.apply_song_pending_revision\(uuid\)'\)/);
  assert.match(sql, /to_regprocedure\('public\.sync_song_pending_revision_submission_activity\(\)'\)/);
  assert.match(sql, /REVOKE ALL PRIVILEGES ON FUNCTION public\.apply_song_pending_revision\(uuid\)\s+FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /REVOKE ALL PRIVILEGES ON FUNCTION public\.sync_song_pending_revision_submission_activity\(\)\s+FROM PUBLIC, anon, authenticated;/);
  for (const func of [
    "public.apply_song_pending_revision(uuid)",
    "public.sync_song_pending_revision_submission_activity()",
  ]) {
    for (const role of ["anon", "authenticated"]) {
      assert.ok(sql.includes(`has_function_privilege('${role}', '${func}', 'EXECUTE')`), func + " " + role);
    }
  }
  assert.match(sql, /NOT has_function_privilege\('service_role', 'public\.apply_song_pending_revision\(uuid\)', 'EXECUTE'\)/);
  const serverCaller = await read("lib/songPendingRevisions.ts");
  assert.match(serverCaller, /supabaseServer\.rpc\("apply_song_pending_revision"/);
});

test("post-lockdown staging verification is read-only and checks privileges", async () => {
  const sql = await read("scripts/verify-auth-rls-lockdown.sql");
  const statements = sql.replace(/^--.*$/gm, "").split(";").map((part) => part.trim()).filter(Boolean);
  assert.ok(statements.every((part) => /^(?:SELECT|WITH)\s/i.test(part)), "Staging verification must contain only SELECT queries.");
  assert.match(sql, /has_function_privilege\('anon'/);
  assert.match(sql, /has_function_privilege\('authenticated'/);
  assert.match(sql, /has_function_privilege\('service_role'/);
  assert.match(sql, /project_folder_paths/);
  assert.match(sql, /relrowsecurity/);
  assert.match(sql, /present_tables = 14 AND t\.secured_tables = 14/);
  assert.match(sql, /present_views = 1 AND v\.secured_views = 1/);
  assert.match(sql, /f\.functions_secured/);
  assert.match(sql, /BLOCKED_STAGING_SQL_GATE/);
  assert.match(sql, /PASS_STAGING_SQL_GATE/);
});

