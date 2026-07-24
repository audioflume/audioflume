import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCuratedPlaylistError } from "@/lib/curatedPlaylists";

export const dynamic = "force-dynamic";

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
        const groupDescription = String(row.description || "").trim();

        return {
          id: Number(row.id),
          name,
          position: Number(row.position || 0),
          description:
            groupDescription ||
            playlistDescriptions.get(normalizeGroupName(name)) ||
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
