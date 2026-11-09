import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { isMigratedAccountPage } from "../lib/auth/isMigratedAccountPage.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("security routing stays Clerk-protected during the staged Supabase security work", () => {
  assert.equal(isMigratedAccountPage("/account/security"), false);
});

test("Clerk security controls remain intact and Supabase view is provider-isolated", async () => {
  const source = await read("components/account/sections/SecuritySection.tsx");
  assert.match(source, /useAccountSession\(\)/);
  assert.match(source, /provider === "supabase"/);
  assert.match(source, /<SupabaseSecuritySection \/>/);
  assert.match(source, /openUserProfile\(\)/);
  assert.match(source, /\/api\/account\/security-events/);
});

test("Supabase security view does not re-use Clerk controls or claim MFA support", async () => {
  const source = await read("components/account/sections/SupabaseSecuritySection.tsx");
  assert.doesNotMatch(source, /@clerk\/nextjs/);
  assert.match(source, /resetPasswordForEmail\(email, \{ redirectTo \}\)/);
  assert.match(source, /!isLoaded \|\| !email \|\| sending/);
  assert.match(source, /Not available yet/);
  assert.doesNotMatch(source, /\.auth\.mfa\.enroll\(/);
  assert.doesNotMatch(source, /\.auth\.updateUser\(\{ email/);
});
