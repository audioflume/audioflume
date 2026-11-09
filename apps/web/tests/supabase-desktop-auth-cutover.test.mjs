import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { selectDesktopAuthProvider } from "../lib/auth/selectDesktopAuthProvider.ts";

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
  assert.match(fn, /return owner\.userId/);
  assert.ok(fn.indexOf("await resolveAccountOwner()") < fn.indexOf("await auth()"));
  assert.match(fn, /const \{ userId \} = await auth\(\)/);
  assert.match(fn, /await currentUser\(\)/);
  assert.match(src, /audioflume:\/\/auth\/callback/);
  assert.match(src, /createDesktopToken\(userId\)/);
});

test("desktop project routes cannot fall back to Clerk cookie under Supabase desktop mode", async () => {
  for (const file of [
    "app/api/desktop/projects/route.ts",
    "app/api/desktop/projects/local-readiness/route.ts",
  ]) {
    const src = await read(file);
    assert.match(src, /getDesktopUserIdFromRequest\(req\)/);
    assert.match(src, /selectDesktopAuthProvider\(/);
    assert.match(src, /=== "supabase"\) return null/);
    assert.ok(src.indexOf("selectDesktopAuthProvider(") < src.indexOf("await auth()"));
  }
});

test("Supabase desktop file delivery requires provider-bound bearer, Clerk path retains behavior", async () => {
  const src = await read("app/api/desktop/files/route.ts");
  assert.match(src, /selectDesktopAuthProvider\(/);
  assert.match(src, /return getDesktopUserIdFromRequest\(req\)/);
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
