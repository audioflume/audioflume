import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifiedSupabaseClaimEmails } from "../lib/auth/verifiedSupabaseClaimEmails.ts";
import { shouldRefreshAccountSession } from "../lib/auth/shouldRefreshAccountSession.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = path => readFile(resolve(root, path), "utf8");
const subject = "7330c6ed-0555-493a-965e-b8a64e2c03d1";

test("confirmed Supabase email permits only exact subject match", () => {
  assert.deepEqual(verifiedSupabaseClaimEmails(subject, {
    id: subject,
    email: "  Artist@Example.COM  ",
    email_confirmed_at: "2026-11-09T00:00:00Z",
  }), ["artist@example.com"]);
  assert.deepEqual(verifiedSupabaseClaimEmails(subject, {
    id: "89b05272-643e-4954-b387-502b5547e39f",
    email: "artist@example.com",
    email_confirmed_at: "2026-11-09T00:00:00Z",
  }), []);
});

test("unconfirmed, missing or malformed emails never select claim invitations", () => {
  for (const user of [
    null, undefined, { id: subject, email: "artist@example.com" },
    { id: subject, email: "artist@example.com", email_confirmed_at: null },
    { id: subject, email: "", email_confirmed_at: "now" },
    { id: subject, email: "not-an-email", email_confirmed_at: "now" },
    { id: subject, email: "artist@example.com", email_confirmed_at: "" },
  ]) {
    assert.deepEqual(verifiedSupabaseClaimEmails(subject, user), []);
  }
  assert.deepEqual(verifiedSupabaseClaimEmails("", {
    id: subject, email: "artist@example.com", email_confirmed_at: "now",
  }), []);
});

test("claim GET and POST require verified identity and use existing exact-email RPC", async () => {
  const route = await read("app/api/artists/claim/route.ts");
  const get = route.slice(route.indexOf("export async function GET()"), route.indexOf("export async function POST("));
  const post = route.slice(route.indexOf("export async function POST("));
  for (const body of [get, post]) {
    assert.match(body, /await getClaimIdentity\(\)/);
    assert.match(body, /if \(!identity\)/);
    assert.doesNotMatch(body, /await currentUser\(\)/);
  }
  assert.match(route, /supabaseServer\.auth\.admin\.getUserById\(owner\.supabaseUserId\)/);
  assert.match(route, /verifiedSupabaseClaimEmails\(owner\.supabaseUserId, data\.user\)/);
  assert.match(post, /\.eq\("id", invitationId\)/);
  assert.match(post, /\.eq\("status", "pending"\)/);
  assert.match(post, /if \(!emails\.includes\(invitationEmail\)\)/);
  assert.match(post, /supabaseServer\.rpc\(\s*"claim_artist_invitation"/);
  assert.match(post, /p_clerk_user_id: identity\.userId/);
  assert.match(post, /p_email: invitationEmail/);
});

test("only the exact artist claim API refreshes Supabase session", () => {
  assert.equal(shouldRefreshAccountSession("/api/artists/claim"), true);
  assert.equal(shouldRefreshAccountSession("/api/artists/claim/"), false);
  assert.equal(shouldRefreshAccountSession("/api/artists/claim/other"), false);
  assert.equal(shouldRefreshAccountSession("/api/artists/team"), false);
  assert.equal(shouldRefreshAccountSession("/api/admin/system-health"), false);
});
