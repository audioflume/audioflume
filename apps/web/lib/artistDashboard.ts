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
        .select("id, name, slug, status, profile_image_url, hero_image_url")
        .in("id", artistIds),
      supabaseServer.from("song_artists").select("artist_id").in("artist_id", artistIds),
      supabaseServer
        .from("artist_release_artists")
        .select("artist_id")
        .in("artist_id", artistIds),
      supabaseServer
        .from("artist_playlists")
        .select("artist_id")
        .in("artist_id", artistIds),
    ]);

  if (artistsResult.error) throw artistsResult.error;
  if (tracksResult.error) throw tracksResult.error;
  if (releasesResult.error) throw releasesResult.error;
  if (playlistsResult.error) throw playlistsResult.error;

  const artistById = new Map(
    (artistsResult.data ?? []).map((artist) => [artist.id, artist]),
  );
  const trackCounts = countByArtist(tracksResult.data ?? [], "artist_id");
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
        profile_image_url: artist.profile_image_url,
        hero_image_url: artist.hero_image_url,
        role: membership.role,
        permissions: getArtistPermissions(membership.role),
        stats: {
          tracks: trackCounts.get(artist.id) ?? 0,
          releases: releaseCounts.get(artist.id) ?? 0,
          playlists: playlistCounts.get(artist.id) ?? 0,
        },
      },
    ];
  });
}
