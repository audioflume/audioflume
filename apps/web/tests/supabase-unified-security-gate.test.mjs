import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = path => readFile(resolve(root, path), "utf8");

test("unified staging security verification is read-only and fails closed on missing objects", async () => {
  const sql = await read("scripts/verify-auth-unified-security-gate.sql");
  const uncommented = sql.replace(/^--.*$/gm, "");
  assert.match(uncommented, /^\s*WITH expected_tables\(name\) AS \(/);
  assert.doesNotMatch(uncommented, /\b(?:ALTER|CREATE|DROP|REVOKE|GRANT|TRUNCATE|DELETE|UPDATE|INSERT|DO)\s+(?:TABLE|POLICY|FUNCTION|VIEW|FROM|INTO|ON|ALL|\$\$)/i);
  assert.match(sql, /PASS_STAGING_SECURITY_GATE/);
  assert.match(sql, /BLOCKED_STAGING_SECURITY_GATE/);
  assert.match(sql, /t\.found = 14 AND t\.secured = 14/);
  assert.match(sql, /v\.found = 1 AND v\.secured = 1/);
  assert.match(sql, /s\.found = 1/);
  assert.match(sql, /p\.policy_count = 0/);
});

test("unified gate checks all approved browser privilege, view, function, and project-sync controls", async () => {
  const sql = await read("scripts/verify-auth-unified-security-gate.sql");
  for (const name of [
    "favorites", "playlist_songs", "playlists", "project_assets", "project_folders",
    "projects", "song_edit_points", "song_shorten_jobs", "songs", "user_billing_profiles",
    "user_downloads", "user_memberships", "user_profiles", "user_security_events",
  ]) assert.ok(sql.includes("'" + name + "'"), name);
  for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.ok(sql.includes("has_table_privilege('anon', c.oid, '" + privilege + "')"));
    assert.ok(sql.includes("has_table_privilege('authenticated', c.oid, '" + privilege + "')"));
    assert.ok(sql.includes("has_table_privilege('service_role', c.oid, '" + privilege + "')"));
  }
  assert.match(sql, /security_invoker=true/);
  assert.match(sql, /apply_song_pending_revision\(uuid\)/);
  assert.match(sql, /sync_song_pending_revision_submission_activity\(\)/);
  assert.match(sql, /project_sync_operations/);
});
