import type {
  FilmwaveBpmFilterValue,
  FilmwaveKeyFilterValue,
} from "./music";
import {
  EDIT_POINT_FILTER_OPTIONS,
  songMatchesEditPointFilters,
} from "./editPointUtils";

export const INSTRUMENTAL_VOCAL_FILTER_OPTION = "Instrumental";

export const DURATION_FILTER_OPTIONS = [
  "0:00 - 1:00",
  "1:00 - 2:00",
  "2:00 - 3:00",
  "3:00 - 4:00",
  "4:00+",
] as const;

export const BPM_FILTER_OPTIONS = ["60–90", "90–120", "120+"] as const;

export const KEY_FILTER_OPTIONS = [
  "C Maj",
  "C Min",
  "C# Maj",
  "C# Min",
  "Db Maj",
  "Db Min",
  "D Maj",
  "D Min",
  "D# Maj",
  "D# Min",
  "Eb Maj",
  "Eb Min",
  "E Maj",
  "E Min",
  "F Maj",
  "F Min",
  "F# Maj",
  "F# Min",
  "Gb Maj",
  "Gb Min",
  "G Maj",
  "G Min",
  "G# Maj",
  "G# Min",
  "Ab Maj",
  "Ab Min",
  "A Maj",
  "A Min",
  "A# Maj",
  "A# Min",
  "Bb Maj",
  "Bb Min",
  "B Maj",
  "B Min",
] as const;

export type MusicLibraryFilterSong = {
  title?: string | null;
  artist?: string | null;
  key?: string | null;
  bpm?: number | string | null;
  duration?: number | string | null;
  durationSeconds?: number | string | null;
  genres?: string[] | null;
  genre?: string | null;
  moods?: string[] | null;
  mood?: string | null;
  regions?: string[] | null;
  region?: string | null;
  instruments?: string[] | null;
  builds?: string[] | null;
  build?: string | null;
  vocals?: string[] | string | null;
  instrumental?: boolean | null;
  playlists?: string[] | null;
  editPoints?: string | null;
};

export type MusicLibraryFilterValues = {
  search?: string;
  selectedMoods?: string[];
  selectedGenres?: string[];
  selectedRegions?: string[];
  selectedInstruments?: string[];
  selectedBuilds?: string[];
  selectedVocals?: string[];
  selectedDurations?: string[];
  selectedEditPoints?: string[];
  instrumental?: boolean;
  bpmValue?: FilmwaveBpmFilterValue | null;
  keyValue?: FilmwaveKeyFilterValue | null;
};

export type DesktopMusicLibraryFilterValues = {
  search?: string;
  mood?: string[];
  genre?: string[];
  region?: string[];
  instrument?: string[];
  vocal?: string[];
  build?: string[];
  selectedDurations?: string[];
  cuePoint?: string[];
  bpmValue?: FilmwaveBpmFilterValue | null;
  keyValue?: FilmwaveKeyFilterValue | null;
};

export function getSelectedEditPointTypesFromLabels(labels: string[] = []) {
  return EDIT_POINT_FILTER_OPTIONS.filter((option) =>
    labels.includes(option.label),
  ).map((option) => option.type);
}

export function normalizeDesktopMusicLibraryFilters(
  filters: DesktopMusicLibraryFilterValues,
): MusicLibraryFilterValues {
  const vocals = filters.vocal ?? [];

  return {
    search: filters.search ?? "",
    selectedMoods: filters.mood ?? [],
    selectedGenres: filters.genre ?? [],
    selectedRegions: filters.region ?? [],
    selectedInstruments: filters.instrument ?? [],
    selectedBuilds: filters.build ?? [],
    selectedVocals: vocals.filter(
      (value) => value !== INSTRUMENTAL_VOCAL_FILTER_OPTION,
    ),
    selectedDurations: filters.selectedDurations ?? [],
    selectedEditPoints: getSelectedEditPointTypesFromLabels(filters.cuePoint),
    instrumental: vocals.includes(INSTRUMENTAL_VOCAL_FILTER_OPTION),
    bpmValue: filters.bpmValue ?? null,
    keyValue: filters.keyValue ?? null,
  };
}

export function hasActiveMusicLibraryFilters(filters: MusicLibraryFilterValues) {
  return Boolean(
    filters.search?.trim() ||
      filters.selectedMoods?.length ||
      filters.selectedGenres?.length ||
      filters.selectedRegions?.length ||
      filters.selectedInstruments?.length ||
      filters.selectedBuilds?.length ||
      filters.selectedVocals?.length ||
      filters.selectedDurations?.length ||
      filters.selectedEditPoints?.length ||
      filters.instrumental ||
      filters.bpmValue ||
      filters.keyValue,
  );
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) return [value.trim()];

  return [];
}

function toSearchableText(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .join(" ")
      .toLowerCase();
  }

  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number") return String(value).toLowerCase();

  return "";
}

function getSongDuration(value: unknown) {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;

    const [minutes, seconds] = value.split(":").map(Number);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return minutes * 60 + seconds;
    }
  }

  if (typeof value === "object" && value !== null) {
    const record = value as { duration?: unknown; durationSeconds?: unknown };
    if (typeof record.duration === "number") return record.duration;
    if (typeof record.durationSeconds === "number") return record.durationSeconds;
    if (typeof record.duration === "string") return getSongDuration(record.duration);
    if (typeof record.durationSeconds === "string") return getSongDuration(record.durationSeconds);
  }

  return 0;
}

function getSongBpm(value: unknown) {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as { bpm?: unknown };
    return getSongBpm(record.bpm);
  }

  return 0;
}

export function includesAll(values: unknown, selected: string[]) {
  if (selected.length === 0) return true;

  const text = toSearchableText(values);

  return selected.every((selectedValue) =>
    text.includes(selectedValue.toLowerCase()),
  );
}

export function selectedValuesMatch(songValues: string[], selectedValues: string[]) {
  if (selectedValues.length === 0) return true;

  const normalizedSongValues = songValues.map((value) => value.toLowerCase());
  const searchableText = normalizedSongValues.join(" ");

  return selectedValues.every((selectedValue) => {
    const normalizedSelectedValue = selectedValue.toLowerCase();

    return (
      normalizedSongValues.includes(normalizedSelectedValue) ||
      searchableText.includes(normalizedSelectedValue)
    );
  });
}

export function matchesDurationFilter(
  durationValue: unknown,
  selectedDurations: string[],
) {
  if (selectedDurations.length === 0) return true;

  const duration = getSongDuration(durationValue);

  return selectedDurations.some((selectedDuration) => {
    if (selectedDuration === "< 1:00") return duration < 60;
    if (selectedDuration === "0:00 - 1:00") {
      return duration >= 0 && duration <= 60;
    }
    if (selectedDuration === "1:00 - 2:00") {
      return duration >= 60 && duration <= 120;
    }
    if (selectedDuration === "2:00 - 3:00") {
      return duration >= 120 && duration <= 180;
    }
    if (selectedDuration === "3:00 - 4:00") {
      return duration >= 180 && duration <= 240;
    }
    if (selectedDuration === "4:00+") return duration >= 240;

    const rangeMatch = selectedDuration.match(
      /^(\d+):(\d{2}) - (\d+):(\d{2})$/,
    );

    if (rangeMatch) {
      const [, lowMinutes, lowSeconds, highMinutes, highSeconds] = rangeMatch;
      const low = Number(lowMinutes) * 60 + Number(lowSeconds);
      const high = Number(highMinutes) * 60 + Number(highSeconds);

      return duration >= low && duration <= high;
    }

    const plusMatch = selectedDuration.match(/^(\d+):(\d{2})\+$/);

    if (plusMatch) {
      const [, minutes, seconds] = plusMatch;
      const low = Number(minutes) * 60 + Number(seconds);

      return duration >= low;
    }

    return true;
  });
}

export function matchesBpmFilter(
  bpmValueOrSong: unknown,
  bpmValue: FilmwaveBpmFilterValue | null,
) {
  if (!bpmValue) return true;

  const bpm = getSongBpm(bpmValueOrSong);

  if (bpmValue.mode === "exact") {
    return bpm === bpmValue.exact;
  }

  return bpm >= bpmValue.low && bpm <= bpmValue.high;
}

function normalizeKeyText(value: string) {
  return value.trim().replaceAll("\u266f", "#").replaceAll("\u266d", "b").toLowerCase();
}

export function matchesKeyFilter(
  songKeyValue: unknown,
  keyValue: FilmwaveKeyFilterValue | null,
) {
  // A key filter can specify a note, a scale, or both. An empty note with a
  // scale (e.g. "any Major") filters by scale alone.
  if (!keyValue || (!keyValue.note && !keyValue.scale)) return true;

  const songKey =
    typeof songKeyValue === "string"
      ? songKeyValue
      : typeof songKeyValue === "object" &&
          songKeyValue !== null &&
          typeof (songKeyValue as { key?: unknown }).key === "string"
        ? (songKeyValue as { key: string }).key
        : "";
  const normalizedSongKey = normalizeKeyText(songKey);

  if (keyValue.note) {
    const normalizedNote = normalizeKeyText(keyValue.note);
    const songNote = normalizedSongKey.match(/^([a-g](?:#|b)?)/)?.[1];

    if (songNote !== normalizedNote) return false;
  }

  if (!keyValue.scale) return true;

  const normalizedScale = keyValue.scale.toLowerCase();

  if (normalizedScale === "major") {
    return normalizedSongKey.includes("maj");
  }

  if (normalizedScale === "minor") {
    return normalizedSongKey.includes("min");
  }

  return true;
}

export function parseBpmFilterLabel(value: string): FilmwaveBpmFilterValue | null {
  const cleanValue = value.trim();
  if (!cleanValue) return null;

  const rangeMatch = cleanValue.match(/^(\d+)[–-](\d+)$/);
  if (rangeMatch) {
    const low = Number(rangeMatch[1]);
    const high = Number(rangeMatch[2]);

    if (Number.isFinite(low) && Number.isFinite(high)) {
      return { mode: "range", low, high, exact: low };
    }
  }

  const plusMatch = cleanValue.match(/^(\d+)\+$/);
  if (plusMatch) {
    const low = Number(plusMatch[1]);

    if (Number.isFinite(low)) {
      return { mode: "range", low, high: 300, exact: low };
    }
  }

  const exact = Number(cleanValue);
  if (Number.isFinite(exact)) {
    return { mode: "exact", low: exact, high: exact, exact };
  }

  return null;
}

export function parseKeyFilterLabel(value: string): FilmwaveKeyFilterValue | null {
  const [note, scaleValue] = value.trim().split(/\s+/);
  if (!note) return null;

  const scale = scaleValue?.toLowerCase().startsWith("maj")
    ? "major"
    : scaleValue?.toLowerCase().startsWith("min")
      ? "minor"
      : null;

  return { note, scale };
}

export function getSongSearchText(song: MusicLibraryFilterSong) {
  return [
    song.title,
    song.artist,
    song.key,
    String(song.bpm ?? ""),
    ...toStringArray(song.genres ?? song.genre),
    ...toStringArray(song.moods ?? song.mood),
    ...toStringArray(song.regions ?? song.region),
    ...toStringArray(song.instruments),
    ...toStringArray(song.builds ?? song.build),
    ...toStringArray(song.vocals),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterMusicLibrarySongs<T extends MusicLibraryFilterSong>(
  songs: T[],
  filters: MusicLibraryFilterValues,
) {
  const searchQuery = filters.search?.toLowerCase().trim() ?? "";
  const selectedMoods = filters.selectedMoods ?? [];
  const selectedGenres = filters.selectedGenres ?? [];
  const selectedRegions = filters.selectedRegions ?? [];
  const selectedInstruments = filters.selectedInstruments ?? [];
  const selectedBuilds = filters.selectedBuilds ?? [];
  const selectedVocals = filters.selectedVocals ?? [];
  const selectedDurations = filters.selectedDurations ?? [];
  const selectedEditPoints = filters.selectedEditPoints ?? [];
  const instrumental = filters.instrumental ?? false;
  const bpmValue = filters.bpmValue ?? null;
  const keyValue = filters.keyValue ?? null;

  return songs.filter((song) => {
    if (searchQuery && !getSongSearchText(song).includes(searchQuery)) {
      return false;
    }

    if (!selectedValuesMatch(toStringArray(song.moods ?? song.mood), selectedMoods)) return false;
    if (!selectedValuesMatch(toStringArray(song.genres ?? song.genre), selectedGenres)) return false;
    if (!selectedValuesMatch(toStringArray(song.regions ?? song.region), selectedRegions)) return false;
    if (!selectedValuesMatch(toStringArray(song.instruments), selectedInstruments)) return false;
    if (!selectedValuesMatch(toStringArray(song.builds ?? song.build), selectedBuilds)) return false;
    if (!selectedValuesMatch(toStringArray(song.vocals), selectedVocals)) return false;
    if (instrumental && !song.instrumental) return false;
    if (!matchesDurationFilter(song.durationSeconds ?? song.duration, selectedDurations)) return false;
    if (!matchesBpmFilter(song.bpm, bpmValue)) return false;
    if (!matchesKeyFilter(song.key, keyValue)) return false;
    if (!songMatchesEditPointFilters(song, selectedEditPoints)) return false;

    return true;
  });
}
