import type { EditPoints, Song } from "@/lib/types";
import { supabaseServer } from "@/lib/supabaseServer";

type StemItem = {
  name: string;
  url: string;
};

type SongEditPointRow = {
  id: string;
  song_id: string;
  type: string;
  time_seconds: number | string;
  label: string | null;
  confidence: number | string | null;
  source: string | null;
};

function getStemNameFromUrl(url: string, index: number) {
  const decodedUrl = decodeURIComponent(url);
  const filename =
    decodedUrl
      .split("/")
      .pop()
      ?.replace(/\.[^/.]+$/, "") || "";

  if (filename) {
    return filename
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return `Stem ${index + 1}`;
}

function parseStems(value: string | null): StemItem[] {
  if (!value) return [];

  return value
    .split("\n")
    .map((url, index) => {
      const cleanUrl = url.trim();
      if (!cleanUrl) return null;
      return {
        name: getStemNameFromUrl(cleanUrl, index),
        url: cleanUrl,
      };
    })
    .filter((item): item is StemItem => Boolean(item));
}

function emptyEditPoints() {
  return JSON.stringify({ markers: [], ranges: [] });
}

function editPointRowsToJson(rows: SongEditPointRow[] = []) {
  const markers = rows.flatMap((row) => {
    const time = Number(row.time_seconds);

    if (!Number.isFinite(time)) return [];

    return [
      {
        id: row.id,
        label: row.label || row.type,
        time,
        type: row.type,
        confidence: row.confidence == null ? undefined : Number(row.confidence),
        source: row.source || undefined,
      },
    ];
  });

  const editPoints: EditPoints = {
    markers,
    ranges: [],
  };

  return JSON.stringify(editPoints);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSongRow(row: any): Song {
  const audioUrl = String(row.audio_url || "");
  const sizeBytes = Number(row.size_bytes || 0) || undefined;

  return {
    id: String(row.id),
    title: String(row.title || ""),
    artist: String(row.artist || ""),
    audioUrl,
    playbackUrl: String(row.playback_url || audioUrl),
    hlsUrl: String(row.hls_url || ""),
    coverArt: row.cover_url ? String(row.cover_url) : null,
    stems: parseStems(row.stems),
    waveformPeaks: String(row.waveform_peaks || "[]"),
    duration: Number(row.duration || 0),
    key: String(row.key || ""),
    bpm: Number(row.bpm || 0),
    genres: Array.isArray(row.genres) ? row.genres : [],
    moods: Array.isArray(row.moods) ? row.moods : [],
    regions: Array.isArray(row.regions) ? row.regions : [],
    instruments: Array.isArray(row.instruments) ? row.instruments : [],
    builds: Array.isArray(row.builds) ? row.builds : [],
    vocals: Array.isArray(row.vocals) ? row.vocals : [],
    instrumental: Boolean(row.instrumental),
    editPoints: String(row.edit_points || emptyEditPoints()),
    downloadCount: Number(row.download_count || 0),
    sizeBytes,
  };
}

export async function attachEditPoints(songs: Song[]) {
  const songIds = songs.map((song) => song.id);

  if (songIds.length === 0) return songs;

  const { data, error } = await supabaseServer
    .from("song_edit_points")
    .select("id, song_id, type, time_seconds, label, confidence, source")
    .in("song_id", songIds)
    .order("time_seconds", { ascending: true });

  if (error) {
    return songs;
  }

  const editPointsBySongId = new Map<string, SongEditPointRow[]>();

  for (const row of (data ?? []) as SongEditPointRow[]) {
    const current = editPointsBySongId.get(row.song_id) ?? [];
    current.push(row);
    editPointsBySongId.set(row.song_id, current);
  }

  return songs.map((song) => {
    const rows = editPointsBySongId.get(song.id) ?? [];

    return {
      ...song,
      editPoints: rows.length > 0 ? editPointRowsToJson(rows) : song.editPoints,
    };
  });
}

export async function getSongs(): Promise<Song[]> {
  const { data, error } = await supabaseServer
    .from("songs")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return attachEditPoints((data ?? []).map(normalizeSongRow));
}

export async function getSongById(id: string): Promise<Song | null> {
  const { data, error } = await supabaseServer
    .from("songs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const [song] = await attachEditPoints([normalizeSongRow(data)]);

  return song;
}