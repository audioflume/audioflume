import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("shared admin authorization requires a linked Supabase identity and an explicit trusted-role gate", async () => {
  const src = await read("lib/admin.ts");
  const guard = src.indexOf("selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === 'supabase'");
  const clerkUser = src.indexOf("await currentUser()");
  assert.ok(guard >= 0 && clerkUser > guard);
  const supabase = src.slice(guard, clerkUser);
  assert.match(supabase, /await resolveAccountOwner\(\)/);
  assert.match(supabase, /AUDIOFLUME_SUPABASE_ADMIN_AUTH_ENABLED !== 'true'/);
  assert.match(supabase, /getUserById\(owner\.supabaseUserId\)/);
  assert.match(supabase, /data\.user\?\.id !== owner\.supabaseUserId/);
  assert.match(supabase, /isTrustedSupabaseAdmin\(/);
  assert.match(supabase, /isAdmin: false, user: null/);
  assert.doesNotMatch(supabase, /currentUser\(\)|ADMIN_EMAILS/);
  assert.match(src, /publicMetadata/);
  assert.match(src, /ADMIN_EMAILS/);
});

test("direct admin health and audio proxy routes authorize Supabase only via shared trusted role", async () => {
  for (const route of ["admin/audio-proxy/route.ts", "admin/system-health/route.ts"]) {
    const src = await read(`app/api/${route}`);
    const guard = src.indexOf("selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER)");
    const clerkUser = src.indexOf("await currentUser()");
    assert.ok(guard >= 0 && clerkUser > guard, route);
    const privilegedBranch = src.slice(guard, clerkUser);
    assert.match(privilegedBranch, /=== ["']supabase["']/);
    assert.match(privilegedBranch, /await requireAdmin\(\)/);
    assert.match(privilegedBranch, /if \(!admin\.isAdmin\)/);
    assert.match(privilegedBranch, /status: 401/);
    assert.match(src, /ADMIN_EMAILS\.includes\(email\)/);
  }
});

test("artist application GET and POST use verified linked account identity", async () => {
  const src = await read("app/api/artists/apply/route.ts");
  assert.equal((src.match(/await resolveAccountIdentity\(\)/g) ?? []).length, 2);
  assert.equal((src.match(/if \(identity\.status !== 200\)/g) ?? []).length, 2);
  assert.match(src, /const \{ userId, user \} = identity/);
  assert.match(src, /ensureUserProfile\(userId, user\)/);
  assert.match(src, /getOwnedArtistApplications\(userId\)/);
  assert.match(src, /created_by_clerk_user_id: userId/);
  assert.match(src, /clerk_user_id: userId/);
  assert.match(src, /cleanApplicationImageUrl\(/);
  assert.match(src, /cleanApplicationSamples\(/);
  assert.doesNotMatch(src, /await currentUser\(\)|user\.id/);
});

test("image and sample upload and cleanup use verified legacy owner for storage prefixes", async () => {
  for (const route of ["artists/apply/images/route.ts", "artists/apply/samples/route.ts"]) {
    const src = await read(`app/api/${route}`);
    assert.equal((src.match(/await resolveAccountOwner\(\)/g) ?? []).length, 2, route);
    assert.equal((src.match(/const userId = account\.userId/g) ?? []).length, 2, route);
    assert.match(src, /if \(!account\.userId\)/);
    assert.match(src, /status: account\.status/);
    assert.match(src, /getUserKey\(userId\)/);
    assert.match(src, /key\.startsWith\(prefix\)/);
    assert.doesNotMatch(src, /await currentUser\(\)|user\.id/);
  }
});

test("Supabase artist claims use verified linked owner and server-confirmed email, never concurrent Clerk identity", async () => {
  const src = await read("app/api/artists/claim/route.ts");
  const identity = src.slice(src.indexOf("async function getClaimIdentity()"), src.indexOf("function getVerifiedUserEmails("));
  assert.match(identity, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "clerk"/);
  assert.match(identity, /await currentUser\(\)/);
  assert.match(identity, /await resolveAccountOwner\(\)/);
  assert.match(identity, /owner\.userId && !owner\.supabaseUserId|!owner\.userId \|\| !owner\.supabaseUserId/);
  assert.match(identity, /supabaseServer\.auth\.admin\.getUserById\(owner\.supabaseUserId\)/);
  assert.match(identity, /data\.user\?\.id !== owner\.supabaseUserId/);
  assert.match(identity, /verifiedSupabaseClaimEmails\(owner\.supabaseUserId, data\.user\)/);

  const get = src.slice(src.indexOf("export async function GET()"), src.indexOf("export async function POST("));
  const post = src.slice(src.indexOf("export async function POST("));
  for (const body of [get, post]) {
    assert.match(body, /await getClaimIdentity\(\)/);
    assert.match(body, /ensureUserProfile\(identity\.userId, identity\.profile\)/);
    assert.match(body, /identity\.emails/);
    assert.doesNotMatch(body, /await currentUser\(\)|user\.id/);
  }
  assert.match(post, /p_clerk_user_id: identity\.userId/);
  assert.match(post, /normalizeArtistClaimEmail\(invitation\.email\)/);
  assert.match(post, /if \(!emails\.includes\(invitationEmail\)\)/);
});

test("Supabase session refresh is limited to converted artist APIs and never desktop or admin", async () => {
  const src = await read("lib/auth/shouldRefreshAccountSession.ts");
  for (const route of ["access", "claim", "apply", "apply/images", "apply/samples"]) {
    assert.ok(src.includes(`pathname === "/api/artists/${route}"`), route);
  }
  assert.doesNotMatch(src, /pathname\.startsWith\("\/api\/artists"/);
  assert.doesNotMatch(src, /pathname\.startsWith\("\/api\/admin"/);
  assert.doesNotMatch(src, /pathname\.startsWith\("\/api\/desktop"/);
});

test("team creation cannot use Clerk invitations under the Supabase provider", async () => {
  const src = await read("app/api/artists/[id]/team/route.ts");
  const create = src.slice(src.indexOf("export async function POST("), src.indexOf("export async function PATCH("));
  assert.ok(create.indexOf("selectAccountAuthProvider(") >= 0);
  assert.ok(create.indexOf("selectAccountAuthProvider(") < create.indexOf("await requireArtistPermission("));
  assert.ok(create.indexOf("selectAccountAuthProvider(") < create.indexOf("clerkClient()"));
  assert.match(create, /status: 403/);
  assert.match(create, /await requireArtistPermission\(id, "artist:manage_members"\)/);
  assert.match(create, /client\.invitations\.createInvitation\(/);
});

test("Supabase-linked team members cannot revoke pending Clerk invitations", async () => {
  const src = await read("app/api/artists/[id]/team/route.ts");
  const deletion = src.slice(src.indexOf("export async function DELETE("));
  const invitationBlock = deletion.slice(deletion.indexOf("if (invitationId) {"));
  const guard = invitationBlock.indexOf("selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER)");
  const revoke = invitationBlock.indexOf("client.invitations.revokeInvitation(");
  assert.ok(guard >= 0 && revoke > guard);
  assert.match(invitationBlock.slice(guard, revoke), /status: 403/);
  assert.match(deletion, /await requireArtistPermission\(id, "artist:manage_members"\)/);
});
