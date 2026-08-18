import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type TrackMetrics = {
  downloads: number;
  saves: number;
  playlist_adds: number;
  project_adds: number;
};

type TimelinePoint = {
  date: string;
  saves: number;
  playlist_adds: number;
  project_adds: number;
  total: number;
};

const RANGE_OPTIONS = new Set([7, 30, 90]);

function getRangeDays(request: Request) {
  const value = Number(new URL(request.url).searchParams.get("days") || 30);
  return RANGE_OPTIONS.has(value) ? value : 30;
}

function getRangeStart(days: number) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

function getDateKey(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isWithinRange(value: string | null | undefined, rangeStart: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= rangeStart;
}

function createTimeline(days: number, rangeStart: Date) {
  const points = new Map<string, TimelinePoint>();

  for (let index = 0; index < days; index += 1) {
    const date = new Date(rangeStart);
    date.setUTCDate(rangeStart.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    points.set(key, {
      date: key,
      saves: 0,
      playlist_adds: 0,
      project_adds: 0,
      total: 0,
    });
  }

  return points;
}

function createTrackMetrics() {
  return {
    downloads: 0,
    saves: 0,
    playlist_adds: 0,
    project_adds: 0,
  } satisfies TrackMetrics;
}

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const artistId = params.id;

  try {
    await requireArtistPermission(artistId, "analytics:view");

    const rangeDays = getRangeDays(request);
    const rangeStart = getRangeStart(rangeDays);
    const timeline = createTimeline(rangeDays, rangeStart);

    const { data: songLinks, error: songLinksError } = await supabaseServer
      .from("song_artists")
      .select("song_id")
      .eq("artist_id", artistId);

    if (songLinksError) throw songLinksError;

    const songIds = Array.from(
      new Set(
        (songLinks ?? [])
          .map((row) => row.song_id)
          .filter((songId): songId is string => typeof songId === "string"),
      ),
    );

    if (songIds.length === 0) {
      return NextResponse.json({
        range_days: rangeDays,
        totals: {
          downloads: 0,
          saves: 0,
          playlist_adds: 0,
          project_adds: 0,
        },
        period: {
          saves: 0,
          playlist_adds: 0,
          project_adds: 0,
          total: 0,
        },
        timeline: Array.from(timeline.values()),
        tracks: [],
      });
    }

    const [songsResult, favoritesResult, playlistAddsResult, projectAddsResult] =
      await Promise.all([
        supabaseServer
          .from("songs")
          .select("id, title, cover_url, status, download_count")
          .in("id", songIds),
        supabaseServer
          .from("favorites")
          .select("song_id, created_at")
          .in("song_id", songIds),
        supabaseServer
          .from("playlist_songs")
          .select("song_id, added_at, created_at")
          .in("song_id", songIds),
        supabaseServer
          .from("project_assets")
          .select("asset_id, created_at")
          .eq("asset_type", "song")
          .in("asset_id", songIds),
      ]);

    if (songsResult.error) throw songsResult.error;
    if (favoritesResult.error) throw favoritesResult.error;
    if (playlistAddsResult.error) throw playlistAddsResult.error;
    if (projectAddsResult.error) throw projectAddsResult.error;

    const metricsBySong = new Map<string, TrackMetrics>();
    for (const songId of songIds) metricsBySong.set(songId, createTrackMetrics());

    let downloads = 0;
    for (const song of songsResult.data ?? []) {
      const songId = String(song.id);
      const count = Math.max(0, Number(song.download_count || 0));
      downloads += count;
      const metrics = metricsBySong.get(songId) ?? createTrackMetrics();
      metrics.downloads = count;
      metricsBySong.set(songId, metrics);
    }

    let periodSaves = 0;
    for (const favorite of favoritesResult.data ?? []) {
      const songId = String(favorite.song_id || "");
      const metrics = metricsBySong.get(songId);
      if (metrics) metrics.saves += 1;

      if (!isWithinRange(favorite.created_at, rangeStart)) continue;
      periodSaves += 1;
      const point = timeline.get(getDateKey(favorite.created_at) || "");
      if (point) {
        point.saves += 1;
        point.total += 1;
      }
    }

    let periodPlaylistAdds = 0;
    for (const addition of playlistAddsResult.data ?? []) {
      const songId = String(addition.song_id || "");
      const metrics = metricsBySong.get(songId);
      if (metrics) metrics.playlist_adds += 1;

      const eventDate = addition.added_at || addition.created_at;
      if (!isWithinRange(eventDate, rangeStart)) continue;
      periodPlaylistAdds += 1;
      const point = timeline.get(getDateKey(eventDate) || "");
      if (point) {
        point.playlist_adds += 1;
        point.total += 1;
      }
    }

    let periodProjectAdds = 0;
    for (const addition of projectAddsResult.data ?? []) {
      const songId = String(addition.asset_id || "");
      const metrics = metricsBySong.get(songId);
      if (metrics) metrics.project_adds += 1;

      if (!isWithinRange(addition.created_at, rangeStart)) continue;
      periodProjectAdds += 1;
      const point = timeline.get(getDateKey(addition.created_at) || "");
      if (point) {
        point.project_adds += 1;
        point.total += 1;
      }
    }

    const tracks = (songsResult.data ?? [])
      .map((song) => {
        const id = String(song.id);
        const metrics = metricsBySong.get(id) ?? createTrackMetrics();
        return {
          id,
          title: String(song.title || "Untitled"),
          cover_url: song.cover_url ? String(song.cover_url) : null,
          status: String(song.status || ""),
          ...metrics,
        };
      })
      .sort((a, b) => {
        const aTotal =
          a.downloads + a.saves + a.playlist_adds + a.project_adds;
        const bTotal =
          b.downloads + b.saves + b.playlist_adds + b.project_adds;
        if (bTotal !== aTotal) return bTotal - aTotal;
        if (b.downloads !== a.downloads) return b.downloads - a.downloads;
        return a.title.localeCompare(b.title);
      });

    return NextResponse.json({
      range_days: rangeDays,
      totals: {
        downloads,
        saves: favoritesResult.data?.length ?? 0,
        playlist_adds: playlistAddsResult.data?.length ?? 0,
        project_adds: projectAddsResult.data?.length ?? 0,
      },
      period: {
        saves: periodSaves,
        playlist_adds: periodPlaylistAdds,
        project_adds: periodProjectAdds,
        total: periodSaves + periodPlaylistAdds + periodProjectAdds,
      },
      timeline: Array.from(timeline.values()),
      tracks,
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist analytics error:", error);
    return NextResponse.json(
      { error: "Failed to load artist analytics" },
      { status: 500 },
    );
  }
}
