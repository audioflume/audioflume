import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (name) => readFile(resolve(root, name), "utf8");

test("isolated revision permissions candidate is staging-only and transactional", async () => {
  const sql = await read("scripts/staged-song-revision-rpc-revoke.sql");
  assert.match(sql, /STAGING CANDIDATE ONLY/);
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /COMMIT;/);
  assert.match(sql, /preflight failed/);
  assert.match(sql, /postcondition failed/);
  const stripped = sql.replace(/^--.*$/gm, "");
  assert.doesNotMatch(stripped, /\b(?:UPDATE|DELETE|INSERT|TRUNCATE|ALTER|CREATE|DROP)\s+(?:TABLE|FUNCTION|VIEW|POLICY|INTO|FROM|public)/i);
});

test("candidate revokes both exact signatures for public, anon and authenticated while retaining service role", async () => {
  const sql = await read("scripts/staged-song-revision-rpc-revoke.sql");
  assert.match(sql, /REVOKE ALL PRIVILEGES ON FUNCTION public\.apply_song_pending_revision\(uuid\)\s+FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /REVOKE ALL PRIVILEGES ON FUNCTION public\.sync_song_pending_revision_submission_activity\(\)\s+FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /has_function_privilege\('service_role', to_regprocedure\(function_name\), 'EXECUTE'\)/);
  assert.match(sql, /has_function_privilege\(role_name, to_regprocedure\(function_name\), 'EXECUTE'\)/);
  assert.doesNotMatch(sql, /GRANT\s+EXECUTE|SECURITY\s+DEFINER\s+AS/i);
});

test("read-only permissions check fails closed if either function is missing or browser-executable", async () => {
  const sql = await read("scripts/verify-song-revision-rpc-revoke.sql");
  const stripped = sql.replace(/^--.*$/gm, "").trim();
  assert.match(stripped, /^WITH expected\(name\) AS/);
  assert.doesNotMatch(stripped, /\b(?:REVOKE|GRANT|ALTER|DROP|CREATE|UPDATE|INSERT|DELETE|TRUNCATE)\s+(?:TABLE|FUNCTION|FROM|INTO|ON|public)/i);
  assert.match(stripped, /PASS_SONG_REVISION_RPC_SECURITY/);
  assert.match(stripped, /BLOCKED_SONG_REVISION_RPC_SECURITY/);
  assert.match(stripped, /function_oid IS NOT NULL/);
  assert.match(stripped, /NOT anon_can_execute AND NOT authenticated_can_execute AND service_can_execute/);
});
