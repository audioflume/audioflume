import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { safeAuthRedirect } from "../lib/auth/safeAuthRedirect.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = path => readFile(resolve(root, path), "utf8");

test("website sign-in and sign-up select Supabase only via server provider flag", async () => {
  const signIn = await read("app/sign-in/[[...sign-in]]/page.tsx");
  const signUp = await read("app/sign-up/[[...sign-up]]/page.tsx");
  for (const source of [signIn, signUp]) {
    assert.match(source, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "supabase"/);
    assert.match(source, /<SupabaseAccountAuthForm /);
  }
  assert.match(signIn, /<SignIn\s/);
  assert.match(signUp, /<SignUp\s*\/>/);
});

test("OAuth callback verifies subject and owner link before redirecting to a private page", async () => {
  const callback = await read("app/auth/supabase/callback/route.ts");
  assert.match(callback, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) !== "supabase"/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /supabase\.auth\.getUser\(\)/);
  assert.match(callback, /\.from\("auth_identity_links"\)/);
  assert.match(callback, /\.eq\("supabase_user_id", user\.id\)/);
  assert.match(callback, /owner\?\.clerk_user_id \? next : "\/sign-in\?auth_status=unlinked"/);
  assert.match(callback, /safeAuthRedirect\(/);
});

test("redirect helper does not permit cross-origin or callback-loop redirects", () => {
  for (const value of [
    null, undefined, "", "https://evil.example/path", "//evil.example",
    "/\\evil.example", "/%5cevil.example", "/auth/supabase/callback?code=abc",
    "/\r\nLocation: https://evil.example",
  ]) {
    const redirected = safeAuthRedirect(value);
    assert.ok(redirected.startsWith("/"), String(value));
    assert.ok(!redirected.startsWith("//"), String(value));
    assert.ok(!redirected.startsWith("/auth/supabase/callback"), String(value));
    assert.equal(new URL(redirected, "https://audioflume.invalid").origin, "https://audioflume.invalid", String(value));
  }
  assert.equal(safeAuthRedirect("/artists/claim?source=invitation"), "/artists/claim?source=invitation");
});

test("artist claim page uses linked owner in Supabase mode and keeps Clerk branch intact", async () => {
  const page = await read("app/artists/claim/page.tsx");
  assert.match(page, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\)/);
  assert.match(page, /provider === "clerk"/);
  assert.match(page, /currentUser\(\)/);
  assert.match(page, /resolveAccountOwner\(\)/);
  assert.match(page, /<ArtistClaimPanel \/>/);
  assert.match(page, /<SignIn/);
  assert.match(page, /\/sign-in\?redirect_url=%2Fartists%2Fclaim/);

  const middleware = await read("middleware.ts");
  assert.match(middleware, /request\.nextUrl\.pathname === "\/artists\/claim"/);
  assert.match(middleware, /refreshSupabaseAccountSession\(request\)/);
});
