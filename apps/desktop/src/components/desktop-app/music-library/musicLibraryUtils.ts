import {
  BPM_FILTER_OPTIONS,
  BUILD_OPTIONS,
  DURATION_FILTER_OPTIONS,
  EDIT_POINT_FILTER_OPTIONS,
  filterMusicLibrarySongs,
  GENRE_OPTIONS,
  INSTRUMENT_OPTIONS,
  INSTRUMENTAL_VOCAL_FILTER_OPTION,
  KEY_FILTER_OPTIONS,
  MOOD_OPTIONS,
  parseBpmFilterLabel,
  parseKeyFilterLabel,
  QUICK_FILTERS,
  VOCALS_OPTIONS,
} from "@filmwave/shared";
import type {
  DesktopMusicFilterOptions,
  DesktopMusicFilterState,
  DesktopMusicSong,
} from "./musicLibraryTypes";

export const QUICK_GENRES = [...QUICK_FILTERS];

export const FILTER_TITLES = {
  playlist: "Playlists",
  mood: "Mood",
  genre: "Genre",
  instrument: "Instruments",
  vocal: "Vocals",
  build: "Build",
  bpm: "BPM",
  key: "Key",
  duration: "Duration",
  cuePoint: "Cue Points",
} as const;

export const EMPTY_FILTERS: DesktopMusicFilterState = {
  search: "",
  playlist: [],
  mood: [],
  genre: [],
  instrument: [],
  vocal: [],
  build: [],
  bpm: [],
  key: [],
  duration: [],
  cuePoint: [],
  markers: false,
  shuffle: false,
};

export const MUSIC_HERO_IMAGE =
  "https://images.unsplash.com/photo-1556139930-c23fa4a4f934?q=80&w=2070&auto=format&fit=crop";

export const DESKTOP_SYNC_IMAGE =
  "https://images.unsplash.com/photo-1686519093104-3140c6dcf284?q=80&w=2070&auto=format&fit=crop";

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getDesktopMusicFilterOptions(
  songs: DesktopMusicSong[],
): DesktopMusicFilterOptions {
  return {
    playlist: unique(songs.flatMap((song) => song.playlists)),
    mood: [...MOOD_OPTIONS],
    genre: [...GENRE_OPTIONS],
    instrument: [...INSTRUMENT_OPTIONS],
    vocal: [INSTRUMENTAL_VOCAL_FILTER_OPTION, ...VOCALS_OPTIONS],
    build: [...BUILD_OPTIONS],
    bpm: [...BPM_FILTER_OPTIONS],
    key: [...KEY_FILTER_OPTIONS],
    duration: [...DURATION_FILTER_OPTIONS],
    cuePoint: EDIT_POINT_FILTER_OPTIONS.map((option) => option.label),
  };
}

export function filterDesktopMusicSongs(
  songs: DesktopMusicSong[],
  filters: DesktopMusicFilterState,
) {
  const selectedEditPoints = EDIT_POINT_FILTER_OPTIONS.filter((option) =>
    filters.cuePoint.includes(option.label),
  ).map((option) => option.type);
  const selectedBpmFilters = filters.bpm.flatMap((value) => {
    const parsed = parseBpmFilterLabel(value);
    return parsed ? [parsed] : [];
  });
  const selectedKeyFilters = filters.key.flatMap((value) => {
    const parsed = parseKeyFilterLabel(value);
    return parsed ? [parsed] : [];
  });

  return songs.filter((song) => {
    if (
      filters.playlist.length &&
      !filters.playlist.some((value) => song.playlists.includes(value))
    ) {
      return false;
    }

    if (selectedBpmFilters.length > 0) {
      const matchesAnyBpm = selectedBpmFilters.some((bpmValue) =>
        filterMusicLibrarySongs([song], { bpmValue }).length > 0,
      );

      if (!matchesAnyBpm) return false;
    }

    if (selectedKeyFilters.length > 0) {
      const matchesAnyKey = selectedKeyFilters.some((keyValue) =>
        filterMusicLibrarySongs([song], { keyValue }).length > 0,
      );

      if (!matchesAnyKey) return false;
    }

    return filterMusicLibrarySongs([song], {
      search: filters.search,
      selectedMoods: filters.mood,
      selectedGenres: filters.genre,
      selectedInstruments: filters.instrument,
      selectedBuilds: filters.build,
      selectedVocals: filters.vocal.filter(
        (value) => value !== INSTRUMENTAL_VOCAL_FILTER_OPTION,
      ),
      selectedDurations: filters.duration,
      selectedEditPoints,
      instrumental: filters.vocal.includes(INSTRUMENTAL_VOCAL_FILTER_OPTION),
    }).length > 0;
  });
}

export function shuffleDesktopMusicSongs(songs: DesktopMusicSong[]) {
  const nextSongs = [...songs];

  for (let i = nextSongs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [nextSongs[i], nextSongs[j]] = [nextSongs[j], nextSongs[i]];
  }

  return nextSongs;
}

export function hasActiveDesktopMusicFilters(filters: DesktopMusicFilterState) {
  return Boolean(
    filters.search.trim() ||
      filters.playlist.length ||
      filters.mood.length ||
      filters.genre.length ||
      filters.instrument.length ||
      filters.vocal.length ||
      filters.build.length ||
      filters.bpm.length ||
      filters.key.length ||
      filters.duration.length ||
      filters.cuePoint.length ||
      filters.markers ||
      filters.shuffle,
  );
}
