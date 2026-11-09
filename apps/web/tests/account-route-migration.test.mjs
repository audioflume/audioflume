import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const converted = [
  "favorites/route.ts",
  "favorites/[songId]/route.ts",
  "playlists/route.ts",
  "playlists/filter-options/route.ts",
  "playlists/[playlistId]/route.ts",
  "playlists/[playlistId]/songs/route.ts",
  "playlists/[playlistId]/songs/[songId]/route.ts",
  "playlists/[playlistId]/songs/reorder/route.ts",
  "playlists/reorder/route.ts",
  "playlists/stats/route.ts",
  "projects/route.ts",
  "projects/[projectId]/route.ts",
  "projects/[projectId]/assets/route.ts",
  "projects/[projectId]/folders/route.ts",
  "projects/[projectId]/folders/[folderId]/route.ts",
  "projects/[projectId]/events/route.ts",
  "projects/[projectId]/sync-operations/route.ts",
  "projects/[projectId]/sync-size/route.ts",
  "songs/[songId]/playlists/route.ts",
  "songs/[songId]/projects/route.ts",
  "account/notifications/route.ts",
  "account/usage/route.ts",
  "account/security-events/route.ts",
  "community-playlist-favorites/route.ts",
  "playlist-recommendations/route.ts",
  "curated-playlists/[playlistId]/save/route.ts",
  "user-preferences/route.ts",
];

test("account API handlers use the shared Clerk-default account resolver", async () => {
  for (const route of converted) {
    const src = await readFile(resolve(root, "app/api", route), "utf8");
    assert.match(src, /from ["']@\/lib\/auth\/resolveAccountOwner["']/, route);
    assert.match(src, /await resolveAccountOwner\(\)/, route);
    assert.doesNotMatch(src, /await auth\(\)/, route);
  }
});

test("playlist filter uses authorized API without direct browser Supabase access", async () => {
  const source = await readFile(resolve(root, "components/PlaylistFilter.tsx"), "utf8");
  const endpoint = await readFile(resolve(root, "app/api/playlists/filter-options/route.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']@\/lib\/supabase["']/);
  assert.match(source, /fetch\("\/api\/playlists\/filter-options"/);
  assert.match(endpoint, /await resolveAccountOwner\(\)/);
  assert.match(endpoint, /\.select\("id, name"\)/);
  assert.match(endpoint, /\.eq\("clerk_user_id", userId\)/);
  assert.match(endpoint, /\.order\("name"\)/);
});

test("Supabase provider is dormant unless server selects it explicitly", async () => {
  const source = await readFile(resolve(root, "lib/auth/resolveAccountOwner.ts"), "utf8");
  const provider = await readFile(resolve(root, "lib/auth/selectAccountAuthProvider.ts"), "utf8");
  assert.match(source, /process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /\.eq\("supabase_user_id", supabaseUserId\)/);
  assert.match(provider, /value === "supabase" \? "supabase" : "clerk"/);
});

test("profile, billing and membership routes use verified identity and legacy record ownership", async () => {
  for (const route of [
    "account/profile/route.ts",
    "account/billing-profile/route.ts",
    "account/membership/route.ts",
  ]) {
    const source = await readFile(resolve(root, "app/api", route), "utf8");
    assert.match(source, /from ["']@\/lib\/auth\/resolveAccountIdentity["']/, route);
    assert.match(source, /await resolveAccountIdentity\(\)/, route);
    assert.doesNotMatch(source, /await currentUser\(\)/, route);
    assert.match(source, /if \(!userId\)/, route);
  }

  const identity = await readFile(resolve(root, "lib/auth/resolveAccountIdentity.ts"), "utf8");
  assert.match(identity, /await currentUser\(\)/);
  assert.match(identity, /await resolveAccountOwner\(\)/);
  assert.match(identity, /user: \{ id: account.userId, \.\.\.account.profileIdentity \}/);
  assert.match(identity, /if \(!account.profileIdentity\)/);
});
