import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const queryPath = fileURLToPath(new URL("../scripts/verify-supabase-legacy-relations.sql", import.meta.url));

test("legacy relation inventory stays read-only and returns aggregate counts", async () => {
  const query = (await readFile(queryPath, "utf8")).replace(/^--.*$/gm, "");
  assert.match(query, /^\s*WITH checks AS/);
  assert.doesNotMatch(query, /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i);
  for (const relation of [
    "playlist_songs_to_playlists",
    "project_assets_to_projects",
    "project_folders_to_projects",
    "song_edit_points_to_songs",
    "favorites_to_songs",
    "user_downloads_to_user_profiles",
  ]) {
    assert.ok(query.includes(relation), `Missing relationship audit: ${relation}`);
  }
  assert.match(query, /count\(\*\) FILTER/);
  assert.match(query, /REVIEW_LEGACY_RELATION/);
  assert.match(query, /SELECT relationship, total_children, matched_children, unmatched_children,/);
  assert.doesNotMatch(query, /SELECT\s+\*/i);
});
