import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type CommunityPlaylistRow = {
  id: number;
  clerk_user_id: string;
  name: string;
  cover_image_url: string | null;
  published_at: string | null;
};

function getDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Filmwave member"
  );
}

export async function GET() {
  try {
    const { data: playlists, error: playlistsError } = await supabaseServer
      .from("playlists")
      .select("id, clerk_user_id, name, cover_image_url, published_at")
      .eq("is_public", true)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (playlistsError) throw playlistsError;

    const rows = (playlists ?? []) as CommunityPlaylistRow[];
    if (rows.length === 0) {
      return NextResponse.json(
        { playlists: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const playlistIds = rows.map((playlist) => playlist.id);
    const { data: playlistSongs, error: songsError } = await supabaseServer
      .from("playlist_songs")
      .select("playlist_id")
      .in("playlist_id", playlistIds);

    if (songsError) throw songsError;

    const songCounts = new Map<number, number>();
    for (const item of playlistSongs ?? []) {
      const playlistId = Number(item.playlist_id);
      songCounts.set(playlistId, (songCounts.get(playlistId) ?? 0) + 1);
    }

    const userIds = [...new Set(rows.map((playlist) => playlist.clerk_user_id))];
    const client = await clerkClient();
    const userEntries = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const user = await client.users.getUser(userId);
          return [
            userId,
            {
              name: getDisplayName(user),
              imageUrl: user.imageUrl ?? null,
            },
          ] as const;
        } catch {
          return [
            userId,
            { name: "Filmwave member", imageUrl: null },
          ] as const;
        }
      }),
    );
    const usersById = new Map(userEntries);

    return NextResponse.json(
      {
        playlists: rows.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          cover_image_url: playlist.cover_image_url,
          published_at: playlist.published_at,
          song_count: songCounts.get(playlist.id) ?? 0,
          creator: usersById.get(playlist.clerk_user_id) ?? {
            name: "Filmwave member",
            imageUrl: null,
          },
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Community playlists fetch error:", error);
    return NextResponse.json(
      { error: "Could not load community playlists" },
      { status: 500 },
    );
  }
}
