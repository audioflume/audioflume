import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("artist dashboard retains existing Clerk identity and invitation-acceptance flow", async () => {
  const source = await read("app/artists/dashboard/page.tsx");
  const clerkBranch = source.slice(
    source.indexOf('if (selectAccountAuthProvider('),
    source.indexOf("// Staged Supabase path:"),
  );
  assert.match(clerkBranch, /=== "clerk"/);
  assert.match(clerkBranch, /await currentUser\(\)/);
  assert.match(clerkBranch, /redirect\("\/sign-in"\)/);
  assert.match(clerkBranch, /await ensureUserProfile\(user\.id, user\)/);
  assert.match(clerkBranch, /await acceptPendingArtistTeamInvitations\(/);
  assert.match(clerkBranch, /user\.primaryEmailAddress\?\.emailAddress \?\? null/);
  assert.match(clerkBranch, /await getArtistDashboardProfiles\(user\.id\)/);
  assert.match(clerkBranch, /<ArtistDashboardShell profiles=\{profiles\} \/>/);
});

test("Supabase dashboard path requires linked identity and never auto-accepts email invitations", async () => {
  const source = await read("app/artists/dashboard/page.tsx");
  const supabaseBranch = source.slice(source.indexOf("// Staged Supabase path:"));
  assert.match(supabaseBranch, /await resolveAccountIdentity\(\)/);
  assert.match(supabaseBranch, /identity\.status !== 200/);
  assert.match(supabaseBranch, /await ensureUserProfile\(identity\.userId, identity\.user\)/);
  assert.match(supabaseBranch, /await getArtistDashboardProfiles\(identity\.userId\)/);
  assert.doesNotMatch(supabaseBranch, /acceptPendingArtistTeamInvitations|currentUser\(\)|user\.email/);
  const identity = await read("lib/auth/resolveAccountIdentity.ts");
  assert.match(identity, /await resolveAccountOwner\(\)/);
  assert.match(identity, /if \(!account\.profileIdentity\)/);
});

test("artist dashboard page stays Clerk-protected pending dependent API and invite migration", async () => {
  const guard = await read("lib/auth/isMigratedAccountPage.ts");
  assert.doesNotMatch(guard, /artists\/dashboard/);
  const middleware = await read("middleware.ts");
  assert.match(middleware, /await auth\.protect\(\)/);
  const artistTeam = await read("lib/artistTeam.ts");
  assert.match(artistTeam, /\.eq\("email", email\)/);
  assert.match(artistTeam, /accepted_by_clerk_user_id: clerkUserId/);
});
