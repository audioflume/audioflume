import {
  attachEditPoints,
  attachPrimaryArtistProfiles,
  normalizeSongRow,
} from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Song } from "@/lib/types";

export type PublicArtistProfile = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  intro_text: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
};

export type PublicArtistRelease = {
  id: string;
  title: string;
  release_type: "single" | "ep" | "album";
  cover_image_url: string | null;
  release_date: string | null;
  track_count: number;
};

export type PublicArtistPlaylist = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  position: number;
  track_count: number;
};

export type PublicArtistPageData = {
  artist: PublicArtistProfile;
  songs: Song[];
  releases: PublicArtistRelease[];
  playlists: PublicArtistPlaylist[];
};

type PublicArtistLookup = {
  data: PublicArtistPageData | null;
  redirectSlug: string | null;
};

const ARTIST_SELECT =
  "id, name, slug, designation, intro_text, bio, location, website_url, instagram_url, spotify_url, youtube_url, profile_image_url, hero_image_url";

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

async function findApprovedArtistBySlug(slug: string) {
  const { data, error } = await supabaseServer
    .from("artists")
    .select(ARTIST_SELECT)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  return data as PublicArtistProfile | null;
}

async function findApprovedArtistFromSlugHistory(slug: string) {
  const { data: history, error: historyError } = await supabaseServer
    .from("artist_slug_history")
    .select("artist_id")
    .eq("slug", slug)
    .maybeSingle();

  if (historyError) throw historyError;
  if (!history?.artist_id) return null;

  const { data: artist, error: artistError } = await supabaseServer
    .from("artists")
    .select(ARTIST_SELECT)
    .eq("id", history.artist_id)
    .eq("status", "approved")
    .maybeSingle();

  if (artistError) throw artistError;
  return artist as PublicArtistProfile | null;
}

export async function getPublicArtistPageData(
  rawSlug: string,
): Promise<PublicArtistLookup> {
  const slug = rawSlug.trim().toLowerCase();
  if (!isValidSlug(slug)) {
    return { data: null, redirectSlug: null };
  }

  let artist = await findApprovedArtistBySlug(slug);
  let redirectSlug: string | null = null;

  if (!artist) {
    artist = await findApprovedArtistFromSlugHistory(slug);
    if (artist) redirectSlug = artist.slug;
  }

  if (!artist) {
    return { data: null, redirectSlug: null };
  }

  const [songLinksResult, releaseLinksResult, playlistsResult] = await Promise.all([
    supabaseServer
      .from("song_artists")
      .select("song_id")
      .eq("artist_id", artist.id)
      .order("position", { ascending: true }),
    supabaseServer
      .from("artist_release_artists")
      .select("release_id")
      .eq("artist_id", artist.id)
      .order("position", { ascending: true }),
    supabaseServer
      .from("artist_playlists")
      .select(
        "id, name, description, cover_image_url, position, created_at, updated_at",
      )
      .eq("artist_id", artist.id)
      .eq("is_public", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (songLinksResult.error) throw songLinksResult.error;
  if (releaseLinksResult.error) throw releaseLinksResult.error;
  if (playlistsResult.error) throw playlistsResult.error;

  const songIds = (songLinksResult.data ?? [])
    .map((link) => link.song_id)
    .filter((songId): songId is string => typeof songId === "string");
  const releaseIds = (releaseLinksResult.data ?? [])
    .map((link) => link.release_id)
    .filter((releaseId): releaseId is string => typeof releaseId === "string");
  const playlistIds = (playlistsResult.data ?? [])
    .map((playlist) => playlist.id)
    .filter((playlistId): playlistId is string => typeof playlistId === "string");

  const [songsResult, releasesResult, releaseTracksResult, playlistTracksResult] =
    await Promise.all([
      songIds.length > 0
        ? supabaseServer
            .from("songs")
            .select(
              "id, title, artist, audio_url, playback_url, hls_url, cover_url, stems, waveform_peaks, duration, key, bpm, genres, moods, regions, instruments, builds, vocals, instrumental, ai_generated, edit_points, download_count, size_bytes, created_at",
            )
            .in("id", songIds)
            .eq("status", "published")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      releaseIds.length > 0
        ? supabaseServer
            .from("artist_releases")
            .select(
              "id, title, release_type, cover_image_url, release_date, created_at",
            )
            .in("id", releaseIds)
            .eq("status", "published")
        : Promise.resolve({ data: [], error: null }),
      releaseIds.length > 0
        ? supabaseServer
            .from("artist_release_songs")
            .select("release_id, song_id")
            .in("release_id", releaseIds)
        : Promise.resolve({ data: [], error: null }),
      playlistIds.length > 0
        ? supabaseServer
            .from("artist_playlist_songs")
            .select("playlist_id, song_id, position")
            .in("playlist_id", playlistIds)
            .order("position", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (songsResult.error) throw songsResult.error;
  if (releasesResult.error) throw releasesResult.error;
  if (releaseTracksResult.error) throw releaseTracksResult.error;
  if (playlistTracksResult.error) throw playlistTracksResult.error;

  const songs = await attachPrimaryArtistProfiles(
    await attachEditPoints(
      (songsResult.data ?? []).map((row) => normalizeSongRow(row)),
    ),
  );
  const publishedSongIds = new Set(songs.map((song) => song.id));

  const releaseTrackCounts = new Map<string, number>();
  for (const track of releaseTracksResult.data ?? []) {
    if (
      typeof track.release_id !== "string" ||
      typeof track.song_id !== "string" ||
      !publishedSongIds.has(track.song_id)
    ) {
      continue;
    }

    releaseTrackCounts.set(
      track.release_id,
      (releaseTrackCounts.get(track.release_id) ?? 0) + 1,
    );
  }

  const playlistTrackCounts = new Map<string, number>();
  for (const track of playlistTracksResult.data ?? []) {
    if (
      typeof track.playlist_id !== "string" ||
      typeof track.song_id !== "string" ||
      !publishedSongIds.has(track.song_id)
    ) {
      continue;
    }

    playlistTrackCounts.set(
      track.playlist_id,
      (playlistTrackCounts.get(track.playlist_id) ?? 0) + 1,
    );
  }

  const releaseById = new Map(
    (releasesResult.data ?? []).map((release) => [String(release.id), release]),
  );
  const releases: PublicArtistRelease[] = releaseIds.flatMap((releaseId) => {
    const release = releaseById.get(releaseId);
    if (!release) return [];

    return [
      {
        id: String(release.id),
        title: String(release.title || ""),
        release_type: release.release_type as PublicArtistRelease["release_type"],
        cover_image_url: release.cover_image_url
          ? String(release.cover_image_url)
          : null,
        release_date: release.release_date ? String(release.release_date) : null,
        track_count: releaseTrackCounts.get(String(release.id)) ?? 0,
      },
    ];
  });

  const playlists: PublicArtistPlaylist[] = (playlistsResult.data ?? []).map(
    (playlist) => ({
      id: String(playlist.id),
      name: String(playlist.name || ""),
      description: playlist.description ? String(playlist.description) : null,
      cover_image_url: playlist.cover_image_url
        ? String(playlist.cover_image_url)
        : null,
      position: Number(playlist.position || 0),
      track_count: playlistTrackCounts.get(String(playlist.id)) ?? 0,
    }),
  );

  return {
    data: {
      artist,
      songs,
      releases,
      playlists,
    },
    redirectSlug,
  };
}
