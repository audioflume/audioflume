import type { Song } from "@/lib/types";
import { supabaseServer } from "@/lib/supabaseServer";

type StemItem = {
  name: string;
  url: string;
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

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSongRow(row: any): Song {
  return {
    id: String(row.id),
    title: String(row.title || ""),
    artist: String(row.artist || ""),
    audioUrl: String(row.audio_url || ""),
    coverArt: row.cover_url ? String(row.cover_url) : null,
    stems: parseStems(row.stems),
    waveformPeaks: String(row.waveform_peaks || "[]"),
    duration: Number(row.duration || 0),
    key: String(row.key || ""),
    bpm: Number(row.bpm || 0),
    genres: Array.isArray(row.genres) ? row.genres : [],
    moods: Array.isArray(row.moods) ? row.moods : [],
    instruments: Array.isArray(row.instruments) ? row.instruments : [],
    builds: Array.isArray(row.builds) ? row.builds : [],
    vocals: Array.isArray(row.vocals) ? row.vocals : [],
    instrumental: Boolean(row.instrumental),
    editPoints: String(row.edit_points || '{"markers":[],"ranges":[]}'),
  };
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

  return (data ?? []).map(normalizeSongRow);
}

export async function getSongById(id: string): Promise<Song | null> {
  const { data, error } = await supabaseServer
    .from("songs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return normalizeSongRow(data);
}
