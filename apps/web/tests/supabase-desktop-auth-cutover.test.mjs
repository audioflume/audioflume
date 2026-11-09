import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { selectDesktopAuthProvider } from "../lib/auth/selectDesktopAuthProvider.ts";
import { verifyDesktopOwnerBinding } from "../lib/auth/verifyDesktopOwnerBinding.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("desktop stays Clerk unless BOTH server switches explicitly select Supabase", () => {
  for (const [desktop, account] of [
    [undefined, undefined],
    ["clerk", "supabase"],
    ["supabase", "clerk"],
    ["SUPABASE", "supabase"],
    ["supabase", undefined],
    [undefined, "supabase"],
  ]) {
    assert.equal(selectDesktopAuthProvider(desktop, account), "clerk");
  }
  assert.equal(selectDesktopAuthProvider("supabase", "supabase"), "supabase");
});

test("desktop token version binds to selected provider and rejects the other version", async () => {
  const src = await read("lib/desktopAuth.ts");
  assert.match(src, /const TOKEN_VERSION = "fwdesktop_v1"/);
  assert.match(src, /const SUPABASE_TOKEN_VERSION = "fwdesktop_supabase_v1"/);
  assert.match(src, /version: selectDesktopAuthProvider\(/);
  assert.match(src, /const expectedVersion = selectDesktopAuthProvider\(/);
  assert.match(src, /if \(payload\.version !== expectedVersion\) return null/);
  assert.match(src, /timingSafeEqual/);
  assert.match(src, /payload\.expiresAt <= now/);
  assert.match(src, /createHmac\("sha256"/);
});

test("desktop token issuance verifies Supabase account linkage without mixing Clerk identity", async () => {
  const src = await read("app/api/desktop/auth/token/route.ts");
  const begin = src.indexOf("async function getSignedInUserId()");
  const end = src.indexOf("function getDesktopCallbackUrl(", begin);
  const fn = src.slice(begin, end);
  assert.match(fn, /selectDesktopAuthProvider\(/);
  assert.match(fn, /await resolveAccountOwner\(\)/);
  assert.match(fn, /owner\.userId && owner\.supabaseUserId/);
  assert.match(fn, /supabaseUserId: owner\.supabaseUserId/);
  assert.ok(fn.indexOf("await resolveAccountOwner()") < fn.indexOf("await auth()"));
  assert.match(fn, /const \{ userId \} = await auth\(\)/);
  assert.match(fn, /await currentUser\(\)/);
  assert.match(src, /audioflume:\/\/auth\/callback/);
  assert.match(src, /createDesktopToken\(desktopIdentity\.userId, desktopIdentity\.supabaseUserId\)/);
});

test("desktop project routes cannot fall back to Clerk cookie under Supabase desktop mode", async () => {
  for (const file of [
    "app/api/desktop/projects/route.ts",
    "app/api/desktop/projects/local-readiness/route.ts",
  ]) {
    const src = await read(file);
    assert.match(src, /getVerifiedDesktopUserIdFromRequest\(req\)/);
    assert.match(src, /selectDesktopAuthProvider\(/);
    assert.match(src, /=== "supabase"\) return null/);
    assert.ok(src.indexOf("selectDesktopAuthProvider(") < src.indexOf("await auth()"));
  }
});

test("Supabase desktop file delivery requires provider-bound bearer, Clerk path retains behavior", async () => {
  const src = await read("app/api/desktop/files/route.ts");
  assert.match(src, /selectDesktopAuthProvider\(/);
  assert.match(src, /return getVerifiedDesktopUserIdFromRequest\(req\)/);
  assert.match(src, /await getDesktopUserId\(req\)/);
  assert.match(src, /const \{ userId \} = await auth\(\)/);
  assert.match(src, /\.eq\("clerk_user_id", userId\)/);
});

test("desktop client deep link, token storage and existing sync payload remain unchanged", async () => {
  const src = await read("app/api/desktop/auth/token/route.ts");
  assert.match(src, /connectionCode: token/);
  assert.match(src, /getDesktopCallbackUrl\(token\)/);
  const desktop = await read("../desktop/src/App.tsx");
  assert.match(desktop, /parsedUrl\.searchParams\.get\("token"\)/);
  assert.match(desktop, /await store\.set\("desktopToken", nextToken\)/);
  const api = await read("../desktop/src/lib/mockFilmwaveApi.ts");
  assert.match(api, /Authorization: `Bearer \$\{token\}`/);
});

test("desktop profile display uses owner-scoped records in Supabase mode without Clerk directory access", async () => {
  const src = await read("app/api/desktop/me/route.ts");
  assert.match(src, /getVerifiedDesktopUserIdFromRequest\(req\)/);
  const mode = src.indexOf("selectDesktopAuthProvider(");
  const clerkLookup = src.indexOf("await clerkClient()");
  assert.ok(mode >= 0 && clerkLookup > mode);
  const branch = src.slice(mode, clerkLookup);
  assert.match(branch, /\.from\("user_profiles"\)/);
  assert.match(branch, /\.eq\("clerk_user_id", userId\)/);
  assert.match(branch, /if \(!profile\)/);
  assert.match(branch, /email: null/);
  assert.match(src, /getUser\(userId\)/);
});

test("Supabase desktop token requires the verified issuing subject and rejects legacy unbound tokens", async () => {
  const token = await read("lib/desktopAuth.ts");
  const owner = await read("lib/auth/resolveAccountOwner.ts");
  const route = await read("app/api/desktop/auth/token/route.ts");
  assert.match(owner, /verifiedSupabaseUserId = user\.id/);
  assert.match(owner, /supabaseUserId: verifiedSupabaseUserId/);
  assert.match(token, /if \(isSupabase && \(!supabaseUserId/);
  assert.match(token, /supabaseUserId \}/);
  assert.match(token, /payload\.supabaseUserId/);
  assert.match(route, /createDesktopToken\(desktopIdentity\.userId, desktopIdentity\.supabaseUserId\)/);
});

test("linked Supabase desktop tokens immediately fail closed after unlink, reassignment and lookup errors", async () => {
  const subject = "7b8c6d30-09ea-41db-9f30-9814e8d4c826";
  const owner = "user_legacy_owner";
  assert.equal(await verifyDesktopOwnerBinding(owner, subject, async () => owner), owner);
  assert.equal(await verifyDesktopOwnerBinding(owner, subject, async () => null), null);
  assert.equal(await verifyDesktopOwnerBinding(owner, subject, async () => "user_other"), null);
  assert.equal(await verifyDesktopOwnerBinding(owner, subject, async () => { throw new Error("DB unavailable"); }), null);
  assert.equal(await verifyDesktopOwnerBinding("", subject, async () => owner), null);
  assert.equal(await verifyDesktopOwnerBinding(owner, "", async () => owner), null);
});

test("every desktop account, project sync and file route uses server link verification", async () => {
  for (const file of [
    "app/api/desktop/me/route.ts",
    "app/api/desktop/projects/route.ts",
    "app/api/desktop/projects/local-readiness/route.ts",
    "app/api/desktop/projects/local-changes/route.ts",
    "app/api/desktop/projects/local-removals/route.ts",
    "app/api/desktop/projects/sync-operations/route.ts",
    "app/api/desktop/files/route.ts",
  ]) {
    const src = await read(file);
    assert.match(src, /getVerifiedDesktopUserIdFromRequest\(req\)/, file);
  }

  const helper = await read("lib/auth/getVerifiedDesktopUserIdFromRequest.ts");
  assert.match(helper, /verifyDesktopToken\(getBearerTokenFromRequest\(req\)\)/);
  assert.match(helper, /verifyDesktopOwnerBinding\(payload\.userId, payload\.supabaseUserId/);
  assert.match(helper, /\.from\("auth_identity_links"\)/);
  assert.match(helper, /\.eq\("supabase_user_id", subject\)/);
  assert.match(helper, /return getDesktopUserIdFromRequest\(req\)/);
});
