import test from "node:test";
import assert from "node:assert/strict";
import { shouldRefreshAccountSession } from "../lib/auth/shouldRefreshAccountSession.ts";
import { selectAccountAuthProvider } from "../lib/auth/selectAccountAuthProvider.ts";

test("only explicit server provider choice enables Supabase", () => {
  assert.equal(selectAccountAuthProvider(undefined), "clerk");
  assert.equal(selectAccountAuthProvider("clerk"), "clerk");
  assert.equal(selectAccountAuthProvider("supabase"), "supabase");
  assert.equal(selectAccountAuthProvider("SUPABASE"), "clerk");
});

test("migrated account APIs are allowlisted for cookie refresh", () => {
  for (const pathname of [
    "/api/favorites", "/api/favorites/song-1",
    "/api/playlists", "/api/playlists/filter-options",
    "/api/playlists/migrate-covers",
    "/api/playlists/reorder", "/api/playlists/stats",
    "/api/playlists/123", "/api/playlists/123/songs",
    "/api/playlists/123/songs/reorder",
    "/api/playlists/123/songs/song-2",
    "/api/projects", "/api/projects/45",
    "/api/projects/45/assets", "/api/projects/45/folders",
    "/api/projects/45/folders/2",
    "/api/projects/45/events", "/api/projects/45/sync-operations",
    "/api/projects/45/sync-size",
    "/api/songs/song-1/playlists", "/api/songs/song-1/projects",
    "/api/account/auth-session", "/api/account/profile", "/api/account/billing-profile",
    "/api/account/membership",
    "/api/account/notifications", "/api/account/usage",
    "/api/account/security-events",
    "/api/community-playlist-favorites", "/api/playlist-recommendations",
    "/api/curated-playlists/123/save",
    "/api/user-preferences",
    "/api/artists/access", "/api/artists/apply",
    "/api/artists/apply/images", "/api/artists/apply/samples",
  ]) {
    assert.equal(shouldRefreshAccountSession(pathname), true, pathname);
  }
});

test("Clerk-only, admin, artist and desktop endpoints never refresh the new cookie", () => {
  for (const pathname of [
    "/api/desktop/me", "/api/desktop/auth/token",
    "/api/desktop/projects", "/api/admin/songs", "/api/artists/claim",
    "/api/account/profile", "/api/playlists/images/upload",
    "/api/community-playlists", "/api/songs",

    "/api/curated-playlists/123", "/api/curated-playlists",
    "/api/curated-playlists/123/songs",
    "/api/songs/id/download", "/api/auth-preview/ssr-session",
    "/auth-preview/ssr", "/music", "/discover", "/playlists",
    "/api/projects-extra", "/api/favorites-legacy",
  ]) {
    assert.equal(shouldRefreshAccountSession(pathname), false, pathname);
  }
});
