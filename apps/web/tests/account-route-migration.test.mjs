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
  assert.match(endpoint, /await auth\(\)/);
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
