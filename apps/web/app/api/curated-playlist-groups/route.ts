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
    const [{ data: groups, error: groupsError }, { data: playlists, error: playlistsError }] =
      await Promise.all([
        supabaseServer
          .from("curated_playlist_groups")
          .select("*")
          .order("position", { ascending: true }),
        supabaseServer.from("curated_playlists").select("playlist_group"),
      ]);

    if (groupsError) throw groupsError;
    if (playlistsError) throw playlistsError;

    const playlistGroupNames = new Map<string, string>();

    for (const playlist of playlists ?? []) {
      const exactName = String(playlist.playlist_group || "").trim();
      const normalizedName = normalizeGroupName(exactName);

      if (exactName && normalizedName && !playlistGroupNames.has(normalizedName)) {
        playlistGroupNames.set(normalizedName, exactName);
      }
    }

    return NextResponse.json(
      (groups ?? []).map((row) => {
        const storedName = String(row.name || "").trim();
        const matchedPlaylistName =
          playlistGroupNames.get(normalizeGroupName(storedName)) || storedName;

        return {
          id: Number(row.id),
          name: matchedPlaylistName,
          position: Number(row.position || 0),
          description: row.description ? String(row.description) : null,
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
