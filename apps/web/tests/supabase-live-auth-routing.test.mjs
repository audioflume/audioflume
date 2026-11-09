import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { safeAuthRedirect } from "../lib/auth/safeAuthRedirect.ts";
import { selectAccountAuthProvider } from "../lib/auth/selectAccountAuthProvider.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("post-login destination permits only same-origin application paths", () => {
  assert.equal(safeAuthRedirect("/projects?tab=recent"), "/projects?tab=recent");
  assert.equal(safeAuthRedirect("/discover"), "/discover");
  assert.equal(safeAuthRedirect(null), "/discover");
  for (const attempt of [
    "https://evil.example/path", "http://evil.example", "//evil.example",
    "/\\evil.example", "\\evil.example", "javascript:alert(1)",
    "/auth/supabase/callback?code=abc", "/projects\nLocation: https://evil.example",
  ]) {
    assert.equal(safeAuthRedirect(attempt), "/discover", attempt);
  }
});

test("Clerk remains the default unless explicitly selected on the server", () => {
  for (const value of [undefined, "", "clerk", "SUPABASE", "true"]) {
    assert.equal(selectAccountAuthProvider(value), "clerk");
  }
  assert.equal(selectAccountAuthProvider("supabase"), "supabase");
});

test("real sign-in and sign-up retain Clerk component branches", async () => {
  const signIn = await read("app/sign-in/[[...sign-in]]/page.tsx");
  const signUp = await read("app/sign-up/[[...sign-up]]/page.tsx");
  for (const page of [signIn, signUp]) {
    assert.match(page, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\)/);
    assert.match(page, /SupabaseAccountAuthForm/);
  }
  assert.match(signIn, /<SignIn/);
  assert.match(signUp, /<SignUp/);
});

test("live Supabase form supports Google, password, sign-up, and recovery", async () => {
  const source = await read("components/auth/SupabaseAccountAuthForm.tsx");
  assert.match(source, /supabaseAccountBrowser\.auth\.signInWithOAuth/);
  assert.match(source, /supabaseAccountBrowser\.auth\.signInWithPassword/);
  assert.match(source, /supabaseAccountBrowser\.auth\.signUp/);
  assert.match(source, /supabaseAccountBrowser\.auth\.resetPasswordForEmail/);
  assert.match(source, /supabaseAccountBrowser\.auth\.updateUser/);
  assert.match(source, /\/api\/account\/auth-session/);
  assert.match(source, /if \(!response\.ok\) throw new Error/);
});

test("OAuth callback retains response cookies and requires trusted legacy link", async () => {
  const source = await read("app/auth/supabase/callback/route.ts");
  assert.match(source, /auth\.exchangeCodeForSession\(code\)/);
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /\.eq\("supabase_user_id", user\.id\)/);
  assert.match(source, /owner\?\.clerk_user_id \? next : "\/sign-in\?auth_status=unlinked"/);
  assert.match(source, /result\.cookies\.set\(name, value, options\)/);
  assert.match(source, /result\.headers\.set\("Location"/);
  assert.match(source, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\)/);
});

test("middleware exposes only exact Supabase callback while Clerk guards remain", async () => {
  const source = await read("middleware.ts");
  assert.match(source, /request\.nextUrl\.pathname === "\/auth\/supabase\/callback"/);
  assert.match(source, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "supabase"/);
  assert.match(source, /await auth\.protect\(\)/);
  assert.match(source, /request\.nextUrl\.pathname\.startsWith\("\/api\/desktop"\)/);
});

test("production account session endpoint is gated and reveals no legacy owner ID", async () => {
  const route = await read("app/api/account/auth-session/route.ts");
  assert.match(route, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\)/);
  assert.match(route, /createSupabaseAccountRequest\(request\)/);
  assert.match(route, /await resolveOwner\(\)/);
  assert.match(route, /respond\(\{ authorized: true \}\)/);
  assert.doesNotMatch(route, /clerk_user_id|legacyUserId/);
  const form = await read("components/auth/SupabaseAccountAuthForm.tsx");
  assert.match(form, /fetch\("\/api\/account\/auth-session"/);
  assert.doesNotMatch(form, /auth-preview\/cutover-session/);
});
