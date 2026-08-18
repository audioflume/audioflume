import {
  getArtistMembershipsForUser,
  getArtistPermissions,
  type ArtistMembershipRole,
  type ArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export type ArtistDashboardProfile = {
  id: string;
  name: string;
  slug: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  bio: string | null;
  location: string | null;
  website_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  role: ArtistMembershipRole;
  permissions: ArtistPermission[];
  stats: {
    tracks: number;
    releases: number;
    playlists: number;
  };
};

function countByArtist(rows: unknown[], key: "artist_id") {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const artistId = (row as Record<string, unknown>)[key];
    if (typeof artistId !== "string") continue;
    counts.set(artistId, (counts.get(artistId) ?? 0) + 1);
  }

  return counts;
}

export async function getArtistDashboardProfiles(
  clerkUserId: string,
): Promise<ArtistDashboardProfile[]> {
  const memberships = await getArtistMembershipsForUser(clerkUserId);
  if (memberships.length === 0) return [];

  const artistIds = memberships.map((membership) => membership.artist_id);

  const [artistsResult, tracksResult, releasesResult, playlistsResult] =
    await Promise.all([
      supabaseServer
        .from("artists")
        .select(
          "id, name, slug, status, bio, location, website_url, instagram_url, spotify_url, youtube_url, profile_image_url, hero_image_url",
        )
        .in("id", artistIds),
      supabaseServer
        .from("song_artists")
        .select("artist_id, song_id")
        .in("artist_id", artistIds)
        .eq("role", "primary"),
      supabaseServer
        .from("artist_release_artists")
        .select("artist_id")
        .in("artist_id", artistIds)
        .eq("role", "primary"),
      supabaseServer
        .from("artist_playlists")
        .select("artist_id")
        .in("artist_id", artistIds),
    ]);

  if (artistsResult.error) throw artistsResult.error;
  if (tracksResult.error) throw tracksResult.error;
  if (releasesResult.error) throw releasesResult.error;
  if (playlistsResult.error) throw playlistsResult.error;

  const primaryTrackRows = tracksResult.data ?? [];
  const primaryTrackSongIds = Array.from(
    new Set(
      primaryTrackRows
        .map((row) => row.song_id)
        .filter((songId): songId is string => typeof songId === "string"),
    ),
  );

  const approvedSongIds = new Set<string>();

  if (primaryTrackSongIds.length > 0) {
    const { data: approvedSongs, error: approvedSongsError } =
      await supabaseServer
        .from("songs")
        .select("id")
        .in("id", primaryTrackSongIds)
        .in("status", ["approved", "published"]);

    if (approvedSongsError) throw approvedSongsError;

    for (const song of approvedSongs ?? []) {
      if (typeof song.id === "string") approvedSongIds.add(song.id);
    }
  }

  const approvedTrackCounts = new Map<string, number>();
  for (const row of primaryTrackRows) {
    if (!row || typeof row !== "object") continue;
    const artistId = row.artist_id;
    const songId = row.song_id;
    if (
      typeof artistId !== "string" ||
      typeof songId !== "string" ||
      !approvedSongIds.has(songId)
    ) {
      continue;
    }

    approvedTrackCounts.set(
      artistId,
      (approvedTrackCounts.get(artistId) ?? 0) + 1,
    );
  }

  const artistById = new Map(
    (artistsResult.data ?? []).map((artist) => [artist.id, artist]),
  );
  const releaseCounts = countByArtist(releasesResult.data ?? [], "artist_id");
  const playlistCounts = countByArtist(playlistsResult.data ?? [], "artist_id");

  return memberships.flatMap((membership) => {
    const artist = artistById.get(membership.artist_id);
    if (!artist) return [];

    const status = artist.status;
    if (
      status !== "pending" &&
      status !== "approved" &&
      status !== "rejected" &&
      status !== "suspended"
    ) {
      return [];
    }

    return [
      {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        status,
        bio: artist.bio,
        location: artist.location,
        website_url: artist.website_url,
        instagram_url: artist.instagram_url,
        spotify_url: artist.spotify_url,
        youtube_url: artist.youtube_url,
        profile_image_url: artist.profile_image_url,
        hero_image_url: artist.hero_image_url,
        role: membership.role,
        permissions: getArtistPermissions(membership.role),
        stats: {
          tracks: approvedTrackCounts.get(artist.id) ?? 0,
          releases: releaseCounts.get(artist.id) ?? 0,
          playlists: playlistCounts.get(artist.id) ?? 0,
        },
      },
    ];
  });
}
