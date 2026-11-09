import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { isTrustedSupabaseAdmin } from "../lib/auth/isTrustedSupabaseAdmin.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("trusted Supabase admin requires BOTH explicit server configuration switches", () => {
  const metadata = { role: "admin" };
  for (const provider of [undefined, "clerk", "SUPABASE", ""]) {
    assert.equal(isTrustedSupabaseAdmin(provider, "true", metadata), false);
  }
  for (const enabled of [undefined, "false", "TRUE", "1", ""]) {
    assert.equal(isTrustedSupabaseAdmin("supabase", enabled, metadata), false);
  }
  assert.equal(isTrustedSupabaseAdmin("supabase", "true", metadata), true);
});

test("server-trusted role gate accepts only exact admin app_metadata role", () => {
  for (const metadata of [null, undefined, "", [], "admin", { role: "Admin" },
    { role: "editor" }, { role: ["admin"] }, { role: null }, {}, { isAdmin: true }]) {
    assert.equal(isTrustedSupabaseAdmin("supabase", "true", metadata), false);
  }
});

test("admin authorization cannot inherit Clerk privilege, client metadata or email in Supabase mode", async () => {
  const admin = await read("lib/admin.ts");
  const guard = admin.indexOf("=== 'supabase'");
  const clerkLookup = admin.indexOf("await currentUser()");
  assert.ok(guard >= 0 && clerkLookup > guard);
  const supabaseBranch = admin.slice(guard, clerkLookup);
  assert.match(supabaseBranch, /await resolveAccountOwner\(\)/);
  assert.match(supabaseBranch, /supabaseServer\.auth\.admin\.getUserById\(owner\.supabaseUserId\)/);
  assert.match(supabaseBranch, /data\.user\?\.id !== owner\.supabaseUserId/);
  assert.match(supabaseBranch, /data\.user\.app_metadata/);
  assert.doesNotMatch(supabaseBranch, /ADMIN_EMAILS|publicMetadata|user_metadata|owner\.profileIdentity|await currentUser\(\)/);

  const actor = await read("lib/auth/resolvePrivilegedActor.ts");
  assert.match(actor, /data\.user\?\.id === owner\.supabaseUserId/);
  assert.match(actor, /isTrustedSupabaseAdmin\(/);
  assert.match(actor, /AUDIOFLUME_SUPABASE_ADMIN_AUTH_ENABLED !== "true"/);
});

test("direct health and audio-proxy routes use gated Supabase admin or existing Clerk email allowlist", async () => {
  for (const path of [
    "app/api/admin/system-health/route.ts",
    "app/api/admin/audio-proxy/route.ts",
  ]) {
    const src = await read(path);
    const guard = src.indexOf('selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER)');
    const clerk = src.indexOf('await currentUser()');
    assert.ok(guard >= 0 && guard < clerk, path);
    const supabaseBranch = src.slice(guard, clerk);
    assert.match(supabaseBranch, /=== ["']supabase["']/);
    assert.match(supabaseBranch, /await requireAdmin\(\)/);
    assert.match(supabaseBranch, /if \(!admin\.isAdmin\)/);
    assert.match(src, /ADMIN_EMAILS\.includes\(email\)/);
  }
});
