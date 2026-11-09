import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { shouldRefreshAccountSession } from "../lib/auth/shouldRefreshAccountSession.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

// Every route was independently inspected for requireArtistPermission or the
// owner/manager-only financial wrapper before inclusion in the refresh list.
const memberRoutes = [
  "page-preview", "hero-position", "notifications", "analyze-beats",
  "playlist-track-picker", "playlists", "team", "release-track-picker",
  "songs/[songId]/license", "images", "releases", "songs", "agreements",
  "collaborators", "songs/[songId]/edit-files", "earnings",
  "songs/[songId]/artwork", "profile", "playlists/[playlistId]",
  "songs/[songId]", "songs/[songId]/stems", "earnings/statement",
  "analytics", "releases/[releaseId]", "releases/[releaseId]/artwork",
  "songs/[songId]/catalog", "playlists/[playlistId]/artwork",
  "songs/[songId]/release", "songs/[songId]/audio",
];

test("Supabase cookie refresh includes each audited owner-authorized artist endpoint", async () => {
  for (const suffix of memberRoutes) {
    const path = `/api/artists/artist-1/${suffix.replaceAll("[songId]", "song-2").replaceAll("[playlistId]", "playlist-3").replaceAll("[releaseId]", "release-4")}`;
    assert.equal(shouldRefreshAccountSession(path), true, path);

    const src = await read(`app/api/artists/[id]/${suffix}/route.ts`);
    const handlers = [...src.matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)\(/g)];
    assert.ok(handlers.length > 0, suffix);
    handlers.forEach((handler, i) => {
      const body = src.slice(handler.index, handlers[i + 1]?.index);
      assert.ok(
        body.includes("requireArtistPermission(") || body.includes("requireFinancialAccess("),
        `Missing auth guard on ${suffix} ${handler[1]}`,
      );
    });
  }
});

test("artist refresh allowlist excludes unknown and adjacent privileged paths", () => {
  for (const path of [
    "/api/artists/artist-1/unknown",
    "/api/artists/artist-1/songs/song-2/unknown",
    "/api/artists/artist-1/earnings/extra",
    "/api/artists/artist-1/release-track-picker/extra",
    "/api/artists/artist-1/playlists/playlist-3/unknown",
    "/api/artists/artist-1/team/extra",
    "/api/artists/artist-1/songs/song-2/license/extra",
    "/api/artists/artist-1/analytics/extra",
    "/api/artists/artist-1/profile/extra",
    "/api/artists/artist-1",
    "/api/artists/claim/extra",
    "/api/admin/songs",
    "/api/desktop/projects",
    "/api/artist-extra/id/songs",
  ]) {
    assert.equal(shouldRefreshAccountSession(path), false, path);
  }
});
