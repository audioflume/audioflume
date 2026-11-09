import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("Server Component read-only cookie errors do not invalidate a verified Supabase owner", async () => {
  const source = await read("lib/auth/resolveAccountOwner.ts");
  assert.match(source, /setAll\(cookiesToSet\) \{/);
  assert.match(source, /try \{\s*cookiesToSet\.forEach/);
  assert.match(source, /cookieStore\.set\(name, value, options\)/);
  assert.match(source, /cookies can only be modified/);
  assert.match(source, /throw error/);
});

test("owner identity still requires verified Supabase auth and a one-to-one database link", async () => {
  const source = await read("lib/auth/resolveAccountOwner.ts");
  assert.match(source, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "clerk"/);
  assert.match(source, /await auth\(\)/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /await resolveVerifiedLegacyOwner\(/);
  assert.match(source, /\.from\("auth_identity_links"\)/);
  assert.match(source, /\.eq\("supabase_user_id", supabaseUserId\)/);
  assert.match(source, /userId: ownership\.legacyUserId, status: 200/);
});

test("middleware remains responsible for refreshing the same production account cookie", async () => {
  const middleware = await read("middleware.ts");
  const refresh = await read("lib/auth/refreshSupabaseAccountSession.ts");
  const owner = await read("lib/auth/resolveAccountOwner.ts");
  assert.match(middleware, /refreshSupabaseAccountSession\(request/);
  assert.match(refresh, /request\.cookies\.set\(name, value\)/);
  assert.match(refresh, /response\.cookies\.set\(name, value, options\)/);
  assert.match(refresh, /getClaims\(\)/);
  assert.match(owner, /cookieOptions: \{ name: "sb-audioflume-auth" \}/);
  assert.match(refresh, /cookieOptions: \{ name: "sb-audioflume-auth" \}/);
});
