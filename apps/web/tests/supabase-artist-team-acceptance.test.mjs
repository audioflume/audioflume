import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifiedSupabaseClaimEmails } from "../lib/auth/verifiedSupabaseClaimEmails.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = path => readFile(resolve(root, path), "utf8");

test("Supabase artist dashboard accepts existing team invitations only for confirmed linked email", async () => {
  const dashboard = await read("app/artists/dashboard/page.tsx");
  const clerk = dashboard.slice(dashboard.indexOf('=== "clerk"'), dashboard.indexOf("// Resolve the Supabase subject"));
  const supabase = dashboard.slice(dashboard.indexOf("// Resolve the Supabase subject"));
  assert.match(clerk, /await currentUser\(\)/);
  assert.match(clerk, /acceptPendingArtistTeamInvitations\(\s*user\.id,/);
  assert.match(supabase, /await resolveAccountOwner\(\)/);
  assert.match(supabase, /!owner\.userId \|\| !owner\.supabaseUserId \|\| !owner\.profileIdentity/);
  assert.match(supabase, /supabaseServer\.auth\.admin\.getUserById\(owner\.supabaseUserId\)/);
  assert.match(supabase, /data\.user\?\.id !== owner\.supabaseUserId/);
  assert.match(supabase, /verifiedSupabaseClaimEmails\(owner\.supabaseUserId, data\.user\)/);
  assert.match(supabase, /if \(verifiedEmails\.length > 0\)/);
  assert.match(supabase, /acceptPendingArtistTeamInvitations\(owner\.userId, verifiedEmails\[0\]\)/);
  assert.doesNotMatch(supabase, /await currentUser\(\)|user\.metadata|ADMIN_EMAILS/);
});

test("Supabase email verification fails closed for invitation acceptance", () => {
  const subject = "9d0b49cd-4854-40a1-9cd0-89840de79194";
  const confirmed = { id: subject, email: "ARTIST@EXAMPLE.COM", email_confirmed_at: "2026-11-09T00:00:00Z" };
  assert.deepEqual(verifiedSupabaseClaimEmails(subject, confirmed), ["artist@example.com"]);
  assert.deepEqual(verifiedSupabaseClaimEmails("different-subject", confirmed), []);
  assert.deepEqual(verifiedSupabaseClaimEmails(subject, { ...confirmed, email_confirmed_at: null }), []);
  assert.deepEqual(verifiedSupabaseClaimEmails(subject, { ...confirmed, email: null }), []);
});

test("artist team invitation acceptance still writes a membership for the verified legacy owner only", async () => {
  const team = await read("lib/artistTeam.ts");
  assert.match(team, /acceptPendingArtistTeamInvitations\(/);
  assert.match(team, /\.eq\("email", email\)/);
  assert.match(team, /\.eq\("status", "pending"\)/);
  assert.match(team, /clerk_user_id: clerkUserId/);
  assert.match(team, /accepted_by_clerk_user_id: clerkUserId/);
  assert.match(team, /ACCEPTABLE_INVITE_ROLES\.has/);
});
