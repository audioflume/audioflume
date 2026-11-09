import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const auditPath = fileURLToPath(new URL("../scripts/verify-supabase-auth-release-gate.sql", import.meta.url));

test("auth cutover release gate is read-only and fails closed on known blockers", async () => {
  const sql = await readFile(auditPath, "utf8");
  const executable = sql.replace(/^--.*$/gm, "").trim();

  assert.match(executable, /^WITH public_tables AS/i);
  assert.doesNotMatch(executable, /\b(?:REVOKE|GRANT|ALTER|DROP|CREATE|UPDATE|INSERT|DELETE|TRUNCATE|CALL|DO)\b/i);
  assert.match(executable, /NOT c\.relrowsecurity/);
  assert.match(executable, /c\.relkind IN \('r', 'p'\)/);
  assert.match(executable, /public\.apply_song_pending_revision\(uuid\)/);
  assert.match(executable, /public\.sync_song_pending_revision_submission_activity\(\)/);
  assert.match(executable, /has_function_privilege\('anon'/);
  assert.match(executable, /has_function_privilege\('authenticated'/);
  assert.match(executable, /has_function_privilege\('service_role'/);
  assert.match(executable, /project_folder_paths/);
  assert.match(executable, /security_invoker=true/);
  assert.match(executable, /BLOCKED_SUPABASE_AUTH_SECURITY/);
  assert.match(executable, /PASS_SUPABASE_AUTH_SECURITY/);
});
