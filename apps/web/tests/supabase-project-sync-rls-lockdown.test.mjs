import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = path => readFile(resolve(root, path), "utf8");

test("project sync SQL is staging-only and atomic, never a production migration", async () => {
  const src = await read("scripts/staged-project-sync-rls-lockdown.sql");
  assert.match(src, /STAGING CANDIDATE ONLY/);
  assert.match(src, /NOT a generated Supabase migration/);
  assert.match(src, /BEGIN;/);
  assert.match(src, /COMMIT;/);
  assert.match(src, /RAISE EXCEPTION 'Project sync lockdown aborted/);
  assert.match(src, /RAISE EXCEPTION 'Project sync lockdown failed postcondition/);
});

test("project sync browser access is revoked without creating permissive role policies", async () => {
  const src = await read("scripts/staged-project-sync-rls-lockdown.sql");
  assert.match(src, /REVOKE ALL PRIVILEGES ON TABLE public\.project_sync_operations FROM PUBLIC, anon, authenticated;/);
  assert.equal((src.match(/DROP POLICY "/g) ?? []).length, 3);
  assert.doesNotMatch(src, /CREATE\s+POLICY|GRANT\s+\w+\s+ON|SECURITY\s+DEFINER|DISABLE\s+ROW\s+LEVEL/i);
  for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.match(src, new RegExp("has_table_privilege\\('service_role', 'public\\.project_sync_operations', '" + privilege + "'\\)"));
  }
  for (const role of ["anon", "authenticated"]) {
    assert.ok(src.includes("'" + role + "'"));
  }
});

test("read-only verification reports actual browser and service-role privileges", async () => {
  const src = await read("scripts/verify-project-sync-rls-lockdown.sql");
  const sql = src.replace(/^--.*$/gm, "");
  assert.match(sql, /^\s*WITH relation_state AS \(/);
  assert.doesNotMatch(sql, /\b(?:DROP|CREATE|ALTER|REVOKE|GRANT|INSERT|UPDATE|DELETE|TRUNCATE)\s+(?:TABLE|POLICY|VIEW|FROM|INTO|ON|ALL)/i);
  assert.match(src, /PASS_PROJECT_SYNC_STAGING_LOCKDOWN/);
  assert.match(src, /BLOCKED_PROJECT_SYNC_STAGING_LOCKDOWN/);
  assert.match(src, /remaining_policies/);
  assert.match(src, /service_role_access_preserved/);
});

test("project sync application calls stay behind service-role server helpers", async () => {
  for (const path of [
    "lib/projectSyncOperations.ts",
    "app/api/projects/[projectId]/sync-operations/route.ts",
    "app/api/desktop/projects/sync-operations/route.ts",
  ]) {
    const src = await read(path);
    assert.match(src, /supabaseServer/);
    assert.match(src, /\.from\("project_sync_operations"\)/);
  }
});
