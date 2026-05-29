import type { FilmwaveDesktopSong, FilmwaveSongApiItem } from "@filmwave/shared";
import { normalizeFilmwaveApiBaseUrl } from "./mockFilmwaveApi";

export type DesktopSong = FilmwaveDesktopSong;

type DesktopSongsApiResponse = {
  songs?: FilmwaveSongApiItem[];
  error?: string;
};

function formatDuration(secondsValue: number) {
  if (!Number.isFinite(secondsValue) || secondsValue <= 0) return "0:00";

  const minutes = Math.floor(secondsValue / 60);
  const seconds = Math.round(secondsValue % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function normalizeArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];
}

function normalizeBuild(builds: string[]) {
  return builds[0] || "Medium";
}

function normalizeVocals(song: FilmwaveSongApiItem, vocals: string[]) {
  if (song.instrumental) return "Instrumental";
  return vocals[0] || "Instrumental";
}

function parseEditPointCount(editPoints: string | null | undefined) {
  if (!editPoints) return 0;

  try {
    const parsed = JSON.parse(editPoints) as {
      markers?: unknown[];
      ranges?: unknown[];
    };

    return (Array.isArray(parsed.markers) ? parsed.markers.length : 0) +
      (Array.isArray(parsed.ranges) ? parsed.ranges.length : 0);
  } catch {
    return 0;
  }
}

function normalizeWaveform(value: FilmwaveSongApiItem["waveformPeaks"]) {
  let peaks: number[] = [];

  if (Array.isArray(value)) {
    peaks = value.map(Number).filter(Number.isFinite);
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        peaks = parsed.map(Number).filter(Number.isFinite);
      }
    } catch {
      peaks = [];
    }
  }

  if (!peaks.length) {
    return [22, 36, 48, 62, 50, 72, 58, 80, 64, 44, 52, 38];
  }

  const sampled = peaks.length > 80
    ? peaks.filter((_, index) => index % Math.ceil(peaks.length / 80) === 0)
    : peaks;
  const maxPeak = Math.max(...sampled.map((peak) => Math.abs(peak)), 1);

  return sampled.slice(0, 80).map((peak) => {
    const normalized = Math.abs(peak) / maxPeak;
    return Math.max(12, Math.round(normalized * 100));
  });
}

export function normalizeFilmwaveSong(song: FilmwaveSongApiItem): DesktopSong {
  const genres = normalizeArray(song.genres);
  const moods = normalizeArray(song.moods);
  const instruments = normalizeArray(song.instruments);
  const builds = normalizeArray(song.builds);
  const vocals = normalizeArray(song.vocals);
  const durationSeconds = Number(song.duration || 0);
  const editPointCount = parseEditPointCount(song.editPoints);
  const audioUrl = String(song.audioUrl || "");
  const playbackUrl = String(song.playbackUrl || audioUrl);
  const hlsUrl = String(song.hlsUrl || "");

  return {
    id: String(song.id),
    title: String(song.title || "Untitled Song"),
    artist: String(song.artist || "Unknown Artist"),
    genre: genres[0] || "Uncategorized",
    mood: moods[0] || "Uncategorized",
    bpm: Number(song.bpm || 0),
    key: String(song.key || ""),
    duration: formatDuration(durationSeconds),
    durationSeconds,
    build: normalizeBuild(builds),
    vocals: normalizeVocals(song, vocals),
    instruments,
    playlists: [],
    cuePoints: editPointCount,
    markers: Array.isArray(song.stems) ? song.stems.length : 0,
    waveform: normalizeWaveform(song.waveformPeaks),
    audioUrl,
    playbackUrl,
    hlsUrl,
    coverArt: song.coverArt ? String(song.coverArt) : null,
    stems: Array.isArray(song.stems)
      ? song.stems.flatMap((stem) => {
          const url = String(stem.url || "").trim();
          if (!url) return [];
          return [{ name: String(stem.name || "Stem"), url }];
        })
      : [],
    editPoints: String(song.editPoints || ""),
  };
}

export async function getFilmwaveSongs(apiBaseUrl?: string | null) {
  const response = await fetch(
    `${normalizeFilmwaveApiBaseUrl(apiBaseUrl)}/api/desktop/songs`,
    { credentials: "include" },
  );

  const data = (await response.json()) as DesktopSongsApiResponse;

  if (!response.ok) {
    throw new Error(data.error || "Failed to load Filmwave songs");
  }

  return (data.songs ?? []).map((item) => normalizeFilmwaveSong(item));
}

export const desktopSongs: DesktopSong[] = [
  { id: "s1", title: "Quiet Motion", artist: "North Harbor", genre: "Ambient", mood: "Calm", bpm: 92, key: "A min", duration: "2:41", durationSeconds: 161, build: "Low", vocals: "Instrumental", instruments: ["Piano", "Pad"], playlists: ["Documentary"], cuePoints: 2, markers: 3, waveform: [20, 50, 35, 65, 40, 70, 55, 76, 44, 65], audioUrl: "", playbackUrl: "", hlsUrl: "", coverArt: null, stems: [], editPoints: "", isFavorite: true },
  { id: "s2", title: "Soft Horizon", artist: "Lumen Valley", genre: "Cinematic", mood: "Warm", bpm: 78, key: "C maj", duration: "3:18", durationSeconds: 198, build: "Low", vocals: "Vocal", instruments: ["Guitar", "Strings"], playlists: ["Travel"], cuePoints: 1, markers: 2, waveform: [18, 24, 29, 44, 53, 47, 40, 62, 56, 31], audioUrl: "", playbackUrl: "", hlsUrl: "", coverArt: null, stems: [], editPoints: "" },
  { id: "s3", title: "Clean Pulse", artist: "Vector Bloom", genre: "Commercial", mood: "Uplifting", bpm: 118, key: "D min", duration: "2:08", durationSeconds: 128, build: "High", vocals: "Instrumental", instruments: ["Synth", "Drums"], playlists: ["Brand"], cuePoints: 3, markers: 5, waveform: [30, 60, 75, 55, 42, 69, 86, 64, 58, 70], audioUrl: "", playbackUrl: "", hlsUrl: "", coverArt: null, stems: [], editPoints: "" },
  { id: "s4", title: "Northline", artist: "Atlas Frame", genre: "Tension", mood: "Focused", bpm: 104, key: "F min", duration: "1:56", durationSeconds: 116, build: "Medium", vocals: "Instrumental", instruments: ["Bass", "Percussion"], playlists: ["Trailer"], cuePoints: 2, markers: 4, waveform: [16, 22, 39, 61, 67, 71, 59, 53, 42, 44], audioUrl: "", playbackUrl: "", hlsUrl: "", coverArt: null, stems: [], editPoints: "" },
  { id: "s5", title: "Lighthouse Run", artist: "Polaris Echo", genre: "Indie", mood: "Hopeful", bpm: 112, key: "G maj", duration: "2:52", durationSeconds: 172, build: "Medium", vocals: "Vocal", instruments: ["Guitar", "Drums"], playlists: ["Indie Picks"], cuePoints: 2, markers: 3, waveform: [27, 36, 44, 49, 61, 72, 65, 57, 48, 41], audioUrl: "", playbackUrl: "", hlsUrl: "", coverArt: null, stems: [], editPoints: "" },
];
