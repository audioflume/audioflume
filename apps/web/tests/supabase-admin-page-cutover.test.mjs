import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isTrustedSupabaseAdmin } from "../lib/auth/isTrustedSupabaseAdmin.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = path => readFile(resolve(root, path), "utf8");

test("server-side admin layout prevents non-admin Supabase sessions from rendering admin routes", async () => {
  const src = await read("app/admin/layout.tsx");
  assert.match(src, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "supabase"/);
  assert.match(src, /await requireAdmin\(\)/);
  assert.match(src, /if \(!admin\.isAdmin\)/);
  assert.match(src, /redirect\("\/discover"\)/);
  assert.match(src, /return children/);
  assert.doesNotMatch(src, /currentUser\(\)|ADMIN_EMAILS|publicMetadata/);
});

test("middleware routes only explicitly selected Supabase admin pages to verified session gate", async () => {
  const src = await read("middleware.ts");
  const start = src.indexOf("// Supabase admin pages are guarded twice");
  const end = src.indexOf("// Only account-data-backed", start);
  assert.ok(start >= 0 && end > start);
  const block = src.slice(start, end);
  assert.match(block, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "supabase"/);
  assert.match(block, /pathname === "\/admin"/);
  assert.match(block, /pathname\.startsWith\("\/admin\/"\)/);
  assert.match(block, /refreshSupabaseAccountSession\(request, \{ requireVerifiedUser: true \}\)/);
});

test("admin access endpoint denies by default and sends no sensitive owner or role data", async () => {
  const src = await read("app/api/admin/access/route.ts");
  assert.match(src, /await requireAdmin\(\)/);
  assert.match(src, /\{ isAdmin: admin\.isAdmin \}/);
  assert.match(src, /status: admin\.isAdmin \? 200 : 403/);
  assert.match(src, /"Cache-Control": "private, no-store"/);
  assert.doesNotMatch(src, /clerk_user_id|supabaseUserId|auth_identity_links|publicMetadata/);
});

test("Supabase admin dashboard uses trusted server role and rechecks when account changes", async () => {
  const src = await read("app/admin/page.tsx");
  assert.match(src, /useAccountSession\(\)/);
  assert.match(src, /session\.provider === "supabase"/);
  assert.match(src, /fetch\("\/api\/admin\/access"/);
  assert.match(src, /response\.ok && body\?\.isAdmin === true/);
  assert.match(src, /supabaseMode \? trustedAdmin : getIsAdmin/);
  assert.match(src, /supabaseMode \? session\.isLoaded && adminChecked : clerkLoaded/);
  assert.match(src, /session\.isSignedIn, session\.userId\]/);
});

test("trusted Supabase role gate fails closed without both explicit operator flags", () => {
  assert.equal(isTrustedSupabaseAdmin("supabase", "true", { role: "admin" }), true);
  assert.equal(isTrustedSupabaseAdmin("supabase", undefined, { role: "admin" }), false);
  assert.equal(isTrustedSupabaseAdmin("clerk", "true", { role: "admin" }), false);
  assert.equal(isTrustedSupabaseAdmin("supabase", "true", { role: "editor" }), false);
  assert.equal(isTrustedSupabaseAdmin("supabase", "true", { user_metadata: { role: "admin" } }), false);
});
