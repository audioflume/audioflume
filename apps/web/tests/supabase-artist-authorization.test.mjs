import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");

test("privileged actor uses Clerk admin evaluation unchanged by default", async () => {
  const source = await read("lib/auth/resolvePrivilegedActor.ts");
  assert.match(source, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "clerk"/);
  assert.match(source, /await requireAdmin\(\)/);
  assert.match(source, /user\?\.id/);
  assert.match(source, /\{ userId: user\.id, isAdmin, status: 200 \}/);
});

test("Supabase artist identity is owner-linked and never elevates admin from client-controlled fields", async () => {
  const source = await read("lib/auth/resolvePrivilegedActor.ts");
  assert.match(source, /await resolveAccountOwner\(\)/);
  assert.match(source, /userId: owner\.userId, isAdmin: false, status: 200/);
  assert.match(source, /userId: null, isAdmin: false, status: owner\.status/);
  assert.doesNotMatch(source, /user_metadata|app_metadata|ADMIN_EMAILS|primaryEmailAddress/);
  const resolver = await read("lib/auth/resolveAccountOwner.ts");
  assert.match(resolver, /supabase\.auth\.getUser\(\)/);
  assert.match(resolver, /\.eq\("supabase_user_id", supabaseUserId\)/);
});

test("artist permission evaluation preserves existing membership ownership and role matrix", async () => {
  const source = await read("lib/artistPermissions.ts");
  assert.match(source, /await resolvePrivilegedActor\(\)/);
  assert.match(source, /getArtistMembershipForUser\(artistId, userId\)/);
  assert.match(source, /\.eq\("artist_id", artistId\)/);
  assert.match(source, /\.eq\("clerk_user_id", clerkUserId\)/);
  assert.match(source, /membership \? getArtistPermissions\(membership\.role\) : \[\]/);
  assert.match(source, /if \(!access\.permissions\.includes\(permission\)\)/);
  assert.match(source, /new ArtistAccessError\("Forbidden", 403\)/);
});

test("read-only artist access endpoint scopes memberships and propagates auth failures", async () => {
  const source = await read("app/api/artists/access/route.ts");
  assert.match(source, /await resolvePrivilegedActor\(\)/);
  assert.match(source, /getArtistMembershipsForUser\(userId\)/);
  assert.match(source, /return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status \}\)/);
  assert.match(source, /isAdmin,/);
  assert.doesNotMatch(source, /currentUser\(|await auth\(|requireAdmin\(/);
});

test("only the explicitly converted artist access API is added to cookie refresh", async () => {
  const routes = await read("lib/auth/shouldRefreshAccountSession.ts");
  assert.match(routes, /pathname === "\/api\/artists\/access"/);
  assert.doesNotMatch(routes, /pathname\.startsWith\("\/api\/artists"/);
  const guard = await read("lib/auth/isMigratedAccountPage.ts");
  assert.doesNotMatch(guard, /artists\/dashboard/);
});
