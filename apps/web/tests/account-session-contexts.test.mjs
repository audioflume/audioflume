import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("root layout provides server-selected account sessions to the existing shared context tree", async () => {
  const source = await read("app/layout.tsx");
  assert.match(source, /<AccountSessionProvider provider=\{selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\)\}>/);
  assert.match(source, /<ClerkProvider>/);
  assert.ok(source.indexOf("<AccountSessionProvider") < source.indexOf("<FavoritesProvider>"));
  assert.ok(source.indexOf("<AccountSessionProvider") < source.indexOf("<PlaylistsProvider>"));
  assert.ok(source.indexOf("<AccountSessionProvider") < source.indexOf("<ProjectsProvider>"));
  assert.ok(source.indexOf("<AccountSessionProvider") < source.indexOf("<UserPreferencesProvider>"));
});

test("shared data contexts and playlist filter consume one account session without markup changes", async () => {
  const paths = [
    "context/FavoritesContext.tsx",
    "context/PlaylistsContext.tsx",
    "context/ProjectsContext.tsx",
    "context/UserPreferencesContext.tsx",
    "components/PlaylistFilter.tsx",
  ];
  for (const path of paths) {
    const src = await read(path);
    assert.match(src, /from ["']@\/context\/AccountSessionContext["']/, path);
    assert.match(src, /useAccountSession\(\)/, path);
    assert.doesNotMatch(src, /from ["']@clerk\/nextjs["']/, path);
  }
  const playlists = await read("context/PlaylistsContext.tsx");
  assert.match(playlists, /const \{ userId, isLoaded \} = useAccountSession\(\)/);
  assert.match(playlists, /getPlaylistsStorageKey\(userId\)/);
  assert.match(playlists, /getPlaylistCoverMigrationStorageKey\(userId\)/);
});

test("Supabase client cache session does not claim legacy ownership or grant server authorization", async () => {
  const src = await read("context/AccountSessionContext.tsx");
  assert.match(src, /supabaseAccountBrowser\.auth\.getUser\(\)/);
  assert.match(src, /supabaseAccountBrowser\.auth\.onAuthStateChange/);
  assert.match(src, /provider === "supabase" \? supabaseUserId : \(clerkUser\?\.id \?\? null\)/);
  assert.doesNotMatch(src, /auth_identity_links|clerk_user_id|service_role/);
  const api = await read("lib/auth/resolveAccountOwner.ts");
  assert.match(api, /\.eq\("supabase_user_id", supabaseUserId\)/);
  assert.match(api, /supabase\.auth\.getUser\(\)/);
});
