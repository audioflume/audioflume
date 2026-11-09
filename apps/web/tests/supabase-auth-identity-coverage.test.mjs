import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sqlPath = fileURLToPath(new URL("../scripts/verify-supabase-auth-identity-coverage.sql", import.meta.url));

test("identity coverage gate is read-only, aggregate-only and fails closed on unmapped owners", async () => {
  const sql = (await readFile(sqlPath, "utf8")).replace(/^--.*$/gm, "");
  assert.match(sql, /^\s*WITH legacy_owners AS/);
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i);
  assert.match(sql, /public\.auth_identity_links/);
  assert.match(sql, /legacy_owners_without_verified_link = 0/);
  assert.match(sql, /duplicate_legacy_identity_links = 0/);
  assert.match(sql, /duplicate_supabase_identity_links = 0/);
  assert.match(sql, /BLOCKED_IDENTITY_COVERAGE/);
  assert.match(sql, /PASS_IDENTITY_COVERAGE/);
  assert.doesNotMatch(sql, /\b(?:email|user_metadata|raw_user_meta_data)\b/i);
  assert.match(sql, /SELECT CASE[\s\S]+FROM counts;/);
});
