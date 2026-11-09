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
  assert.match(src, /provider === "supabase" \? supabaseUser : null/);
  assert.match(src, /const userId = user\?\.id \?\? null/);
  assert.match(src, /profileFromVerifiedSupabaseUser\(data\.user\)/);
  assert.match(src, /profileFromVerifiedSupabaseUser\(session\.user\)/);
  assert.match(src, /await clerkSignOut\(\)/);
  assert.match(src, /await supabaseAccountBrowser\.auth\.signOut\(\)/);
  assert.doesNotMatch(src, /auth_identity_links|clerk_user_id|service_role/);
  const api = await read("lib/auth/resolveAccountOwner.ts");
  assert.match(api, /\.eq\("supabase_user_id", supabaseUserId\)/);
  assert.match(api, /supabase\.auth\.getUser\(\)/);
});

test("header and web user menu use provider-aware identity and sign-out without changing shared shells", async () => {
  const header = await read("components/Header.tsx");
  const menu = await read("components/UserMenu.tsx");
  assert.match(header, /const \{ user, isLoaded \} = useAccountSession\(\)/);
  assert.match(header, /const initials = user/);
  assert.match(header, /const avatarImage = profileImage \|\| user\?\.imageUrl \|\| null/);
  assert.match(header, /<UserMenu onClose=\{\(\) => setMenuOpen\(false\)\} \/>/);
  assert.match(menu, /const \{ signOut, user \} = useAccountSession\(\)/);
  assert.match(menu, /onClick=\{\(\) => signOut\(\)\}/);
  assert.match(menu, /<UserMenuPanel className="filmwave-web-user-menu">/);
  assert.match(menu, /imageSrc=\{user\?\.imageUrl\}/);
  assert.doesNotMatch(header, /from ["']@clerk\/nextjs["']/);
  assert.doesNotMatch(menu, /from ["']@clerk\/nextjs["']/);
});
