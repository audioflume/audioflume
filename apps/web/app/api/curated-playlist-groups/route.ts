import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCuratedPlaylistError } from "@/lib/curatedPlaylists";

export const dynamic = "force-dynamic";

const DEFAULT_GROUP_DESCRIPTIONS: Record<string, string> = {
  "editor picks":
    "Handpicked playlists selected for strong storytelling, pacing, and cinematic range.",
  "featured playlists":
    "A rotating selection of standout playlists chosen by the Filmwave team.",
  "newly added":
    "Freshly published playlists and recent additions to the Filmwave library.",
  "popular right now":
    "The playlists filmmakers are exploring, saving, and using most right now.",
  tension:
    "Slow pressure, uneasy textures, rising suspense, and restrained cinematic builds.",
  ambient:
    "Spacious tones, subtle movement, soft textures, and atmospheric sound beds.",
};

function normalizeGroupName(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export async function GET() {
  try {
    const { data: groups, error: groupsError } = await supabaseServer
      .from("curated_playlist_groups")
      .select("*")
      .order("position", { ascending: true });

    if (groupsError) throw groupsError;

    const playlistDescriptions = new Map<string, string>();
    const { data: playlists, error: playlistsError } = await supabaseServer
      .from("curated_playlists")
      .select("playlist_group, description")
      .order("position", { ascending: true });

    if (playlistsError) {
      console.warn(
        "Curated playlist description fallback fetch failed:",
        playlistsError,
      );
    } else {
      for (const playlist of playlists ?? []) {
        const groupKey = normalizeGroupName(playlist.playlist_group);
        const description = String(playlist.description || "").trim();

        if (groupKey && description && !playlistDescriptions.has(groupKey)) {
          playlistDescriptions.set(groupKey, description);
        }
      }
    }

    return NextResponse.json(
      (groups ?? []).map((row) => {
        const name = String(row.name || "");
        const groupKey = normalizeGroupName(name);
        const groupDescription = String(row.description || "").trim();

        return {
          id: Number(row.id),
          name,
          position: Number(row.position || 0),
          description:
            groupDescription ||
            playlistDescriptions.get(groupKey) ||
            DEFAULT_GROUP_DESCRIPTIONS[groupKey] ||
            null,
        };
      }),
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (err) {
    console.error("Curated playlist groups fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load playlist groups"),
      { status: 500 },
    );
  }
}
