import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseOptions } from "../scripts/check-auth-cutover-readiness.mjs";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("preflight accepts only explicit local smoke modes and never a remote target", () => {
  assert.deepEqual(parseOptions([]), { smoke: null });
  assert.deepEqual(parseOptions(["--smoke", "clerk"]), { smoke: "clerk" });
  assert.deepEqual(parseOptions(["--smoke", "supabase"]), { smoke: "supabase" });
  for (const args of [
    ["--smoke", "production"],
    ["--smoke", "supabase", "--base-url", "https://example.com"],
    ["--deploy"],
    ["--provider", "supabase"],
  ]) {
    assert.throws(() => parseOptions(args), /Usage:/);
  }
});

test("preflight runs full selected auth suite without switching modes or applying database changes", async () => {
  const script = await read("scripts/check-auth-cutover-readiness.mjs");
  assert.match(script, /--experimental-strip-types", "--test", \.\.\.paths/);
  assert.match(script, /auditSourceTree\(resolve\(root, "apps\/web"\)\)/);
  assert.match(script, /SOURCE_PREFLIGHT_PASS/);
  assert.match(script, /RELEASE_NOT_APPROVED/);
  assert.match(script, /smoke-supabase-auth-local\.mjs/);
  assert.doesNotMatch(script, /execSync|shell:\s*true|supabase db push|apply_migration|vercel deploy|process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\s*=/);
  assert.equal((script.match(/apps\/web\/tests\/supabase-[\w-]+\.test\.mjs/g) || []).length, 18);
});
