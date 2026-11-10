import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { isMigratedAccountPage } from "../lib/auth/isMigratedAccountPage.ts";
import { selectAccountAuthProvider } from "../lib/auth/selectAccountAuthProvider.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

test("only client-rendered account library pages are eligible", () => {
  for (const pathname of [
    "/favorites", "/projects", "/projects/3", "/projects/abc-123", "/playlists",
    "/account", "/account/profile", "/account/payment",
    "/account/membership", "/account/notifications",
    "/account/settings", "/account/support",
  ]) {
    assert.equal(isMigratedAccountPage(pathname), true, pathname);
  }
});

test("all other routes remain under existing Clerk protection", () => {
  for (const pathname of [
    "/account/security", "/account/not-a-section", "/account/profile/extra",
    "/admin", "/admin/music-library", "/artists/dashboard", "/artists/apply",
    "/artists/claim", "/projects/3/assets", "/playlists/community",
    "/playlists/123", "/music", "/discover",
    "/api/favorites", "/api/desktop/me", "/api/desktop/projects",
    "/favorites/extra", "/projects-extra", "/sign-in", "/sign-up",
  ]) {
    assert.equal(isMigratedAccountPage(pathname), false, pathname);
  }
});

test("default selection cannot bypass Clerk page protection", () => {
  assert.equal(selectAccountAuthProvider(undefined), "clerk");
  assert.equal(selectAccountAuthProvider("Clerk"), "clerk");
  assert.equal(selectAccountAuthProvider("supabase"), "supabase");
});

test("middleware enables the narrow guard only through the server switch", async () => {
  const source = await read("middleware.ts");
  assert.match(source, /isMigratedAccountPage\(request\.nextUrl\.pathname\)/);
  assert.match(source, /refreshSupabaseAccountSession\(request, \{ requireVerifiedUser: true \}\)/);
  assert.match(source, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "supabase"/);
  assert.match(source, /await auth\.protect\(\)/);
  assert.match(source, /request\.nextUrl\.pathname\.startsWith\("\/api\/desktop"\)/);
});

test("Supabase page guard checks verified user and carries cookies on redirect", async () => {
  const source = await read("lib/auth/refreshSupabaseAccountSession.ts");
  assert.match(source, /if \(options\.requireVerifiedUser\)/);
  assert.match(source, /await supabase\.auth\.getUser\(\)/);
  assert.match(source, /if \(error \|\| !user\)/);
  assert.match(source, /login\.searchParams\.set\("redirect_url", destination\)/);
  assert.match(source, /response\.cookies\.getAll\(\)\.forEach/);
  assert.match(source, /private, no-store/);
});

test("gated pages only fetch personal data through server-owner-verified routes", async () => {
  const favorites = await read("app/favorites/page.tsx");
  const projects = await read("app/projects/page.tsx");
  const playlists = await read("app/playlists/page.tsx");
  for (const source of [favorites, projects, playlists]) {
    assert.match(source, /"use client"/);
    assert.doesNotMatch(source, /from ["']@clerk\/nextjs\/server["']/);
  }
  const owner = await read("lib/auth/resolveAccountOwner.ts");
  assert.match(owner, /await supabase\.auth\.getUser\(\)/);
  assert.match(owner, /\.eq\("supabase_user_id", supabaseUserId\)/);
});

test("artist invitation refresh cannot mix an old Clerk session with a Supabase account", async () => {
  const layout = await read("app/layout.tsx");
  const invites = await read("context/ArtistInvitesContext.tsx");
  assert.match(layout, /if \(accountProvider === "clerk"\)/);
  assert.match(layout, /initialPendingArtistInviteCount = await getPendingArtistInviteCount\(user\)/);
  assert.match(invites, /const \{ provider, isLoaded: isAuthLoaded, isSignedIn \} = useAccountSession\(\)/);
  assert.match(invites, /if \(provider === "supabase"\)/);
  assert.match(invites, /setPendingInviteCount\(0\)/);
  assert.match(invites, /fetch\("\/api\/artists\/claim"/);
});

test("account page shells keep Supabase account identity scoped to converted sections", async () => {
  const sections = [
    "components/account/AccountSidebar.tsx",
    "components/account/sections/ProfileSection.tsx",
    "components/account/sections/PaymentSection.tsx",
  ];
  for (const section of sections) {
    const source = await read(section);
    assert.match(source, /useAccountSession\(\)/, section);
    assert.doesNotMatch(source, /from ["']@clerk\/nextjs["']/, section);
  }

  const security = await read("components/account/sections/SecuritySection.tsx");
  assert.match(security, /openUserProfile/);
  assert.equal(isMigratedAccountPage("/account/security"), false);
});
