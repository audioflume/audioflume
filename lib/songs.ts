import type { Song } from "@/lib/types";
import base from "./airtable";

type AirtableRecord = {
  id: string;
  get: (fieldName: string) => unknown;
};

type StemItem = {
  name: string;
  url: string;
};

export function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function getBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return ["true", "yes", "1", "instrumental"].includes(
      value.trim().toLowerCase(),
    );
  }

  return false;
}

export function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item: unknown) => getStringArray(item))
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function getStems(value: unknown): StemItem[] {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return getStems(JSON.parse(value));
    } catch {
      return value
        .split("\n")
        .map((url, index) => {
          const cleanUrl = url.trim();

          if (!cleanUrl) return null;

          return {
            name: `Stem ${index + 1}`,
            url: cleanUrl,
          };
        })
        .filter((item): item is StemItem => Boolean(item));
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();

        if (!url) return null;

        return {
          name: `Stem ${index + 1}`,
          url,
        };
      }

      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;

      const name =
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : `Stem ${index + 1}`;

      const url =
        typeof record.url === "string" && record.url.trim()
          ? record.url.trim()
          : "";

      if (!url) return null;

      return { name, url };
    })
    .filter((item): item is StemItem => Boolean(item));
}

export function getDurationSeconds(value: unknown) {
  if (!value) return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value).trim();

  if (!raw) return 0;

  if (!raw.includes(":")) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parts = raw.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) {
    return 0;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

export function getCoverArt(record: AirtableRecord) {
  const coverUrl = record.get("Cover URL");

  if (typeof coverUrl === "string" && coverUrl.trim()) {
    return coverUrl;
  }

  const coverArt = record.get("Cover Art");

  if (Array.isArray(coverArt)) {
    return (coverArt[0] as { url?: string })?.url ?? null;
  }

  if (typeof coverArt === "string" && coverArt.trim()) {
    return coverArt;
  }

  return null;
}

export function normalizeSongRecord(record: AirtableRecord): Song {
  return {
    id: record.id,
    title: getString(record.get("Song Title")),
    artist: getString(record.get("Artist")),
    audioUrl: getString(record.get("Audio URL") || record.get("R2 Audio URL")),
    stems: getStems(record.get("Stems")),
    coverArt: getCoverArt(record),
    waveformPeaks: getString(record.get("Waveform Peaks")) || "[]",
    duration: getDurationSeconds(record.get("Duration")),
    key: getString(record.get("Key")),
    bpm: getNumber(record.get("BPM")),
    genres: getStringArray(record.get("Genre") || record.get("Genres")),
    moods: getStringArray(record.get("Mood") || record.get("Moods")),
    instruments: getStringArray(
      record.get("Instrument") || record.get("Instruments"),
    ),
    builds: getStringArray(record.get("Build") || record.get("Builds")),
    vocals: getStringArray(record.get("Vocals")),
    instrumental: getBoolean(record.get("Instrumental")),
    editPoints:
      getString(record.get("Edit Points")) || '{"markers":[],"ranges":[]}',
  };
}

export async function getSongs(): Promise<Song[]> {
  const tableId = process.env.AIRTABLE_SONGS_TABLE_ID || "Music Library";

  const records = await base(tableId)
    .select({
      view: "Grid view",
    })
    .all();

  return records.map(normalizeSongRecord);
}
