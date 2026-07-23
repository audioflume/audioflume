import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  isCommunityPlaylistCategory,
  normalizeCommunityPlaylistCategories,
} from "@/lib/communityPlaylistCategories";

export const dynamic = "force-dynamic";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type CommunityPlaylistRow = {
  id: number;
  clerk_user_id: string;
  name: string;
  cover_image_url: string | null;
  published_at: string | null;
  primary_category: string | null;
  secondary_categories: string[] | null;
  play_count: number | string | null;
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
      .select(
        "id, clerk_user_id, name, cover_image_url, published_at, primary_category, secondary_categories, play_count",
      )
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
    const [playlistSongsResult, favoritesResult] = await Promise.all([
      supabaseServer
        .from("playlist_songs")
        .select("playlist_id")
        .in("playlist_id", playlistIds),
      supabaseServer
        .from("community_playlist_favorites")
        .select("playlist_id, created_at")
        .in("playlist_id", playlistIds),
    ]);

    if (playlistSongsResult.error) throw playlistSongsResult.error;
    if (favoritesResult.error) throw favoritesResult.error;

    const songCounts = new Map<number, number>();
    for (const item of playlistSongsResult.data ?? []) {
      const playlistId = Number(item.playlist_id);
      songCounts.set(playlistId, (songCounts.get(playlistId) ?? 0) + 1);
    }

    const likeCounts = new Map<number, number>();
    const sevenDayLikeCounts = new Map<number, number>();
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;

    for (const item of favoritesResult.data ?? []) {
      const playlistId = Number(item.playlist_id);
      likeCounts.set(playlistId, (likeCounts.get(playlistId) ?? 0) + 1);

      const createdAt = new Date(String(item.created_at ?? "")).getTime();
      if (Number.isFinite(createdAt) && createdAt >= sevenDaysAgo) {
        sevenDayLikeCounts.set(
          playlistId,
          (sevenDayLikeCounts.get(playlistId) ?? 0) + 1,
        );
      }
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
          primary_category: isCommunityPlaylistCategory(
            playlist.primary_category,
          )
            ? playlist.primary_category
            : null,
          secondary_categories: normalizeCommunityPlaylistCategories(
            playlist.secondary_categories,
          ),
          song_count: songCounts.get(playlist.id) ?? 0,
          play_count: Math.max(0, Number(playlist.play_count) || 0),
          like_count: likeCounts.get(playlist.id) ?? 0,
          seven_day_like_count: sevenDayLikeCounts.get(playlist.id) ?? 0,
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
