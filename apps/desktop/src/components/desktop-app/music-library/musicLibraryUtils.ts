import {
  BUILD_OPTIONS,
  EDIT_POINT_FILTER_OPTIONS,
  filterMusicLibrarySongs,
  GENRE_OPTIONS,
  INSTRUMENT_OPTIONS,
  INSTRUMENTAL_VOCAL_FILTER_OPTION,
  MOOD_OPTIONS,
  normalizeDesktopMusicLibraryFilters,
  QUICK_FILTERS,
  REGION_OPTIONS,
  VOCALS_OPTIONS,
} from "@filmwave/shared";
import type {
  DesktopMusicFilterOptions,
  DesktopMusicFilterState,
  DesktopMusicSong,
} from "./musicLibraryTypes";

export const QUICK_GENRES = [...QUICK_FILTERS];

export const FILTER_TITLES = {
  mood: "Scene",
  genre: "Genre",
  region: "Region",
  instrument: "Instruments",
  vocal: "Vocals",
  build: "Build",
  cuePoint: "Cue Points",
} as const;

export const EMPTY_FILTERS: DesktopMusicFilterState = {
  search: "",
  selectedPlaylist: null,
  mood: [],
  genre: [],
  region: [],
  instrument: [],
  vocal: [],
  build: [],
  selectedDurations: [],
  bpmValue: null,
  keyValue: null,
  cuePoint: [],
  markers: false,
  shuffle: false,
};

export const MUSIC_HERO_IMAGE =
  "https://images.unsplash.com/photo-1556139930-c23fa4a4f934?q=80&w=2070&auto=format&fit=crop";

export const DESKTOP_SYNC_IMAGE =
  "https://images.unsplash.com/photo-1686519093104-3140c6dcf284?q=80&w=2070&auto=format&fit=crop";

export function getDesktopMusicFilterOptions(): DesktopMusicFilterOptions {
  return {
    mood: [...MOOD_OPTIONS],
    genre: [...GENRE_OPTIONS],
    region: [...REGION_OPTIONS],
    instrument: [...INSTRUMENT_OPTIONS],
    vocal: [INSTRUMENTAL_VOCAL_FILTER_OPTION, ...VOCALS_OPTIONS],
    build: [...BUILD_OPTIONS],
    cuePoint: EDIT_POINT_FILTER_OPTIONS.map((option) => option.label),
  };
}

export function getDesktopPlaylistFilterOptions(songs: DesktopMusicSong[]) {
  const names = [...new Set(songs.flatMap((song) => song.playlists).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );

  return names.map((name, index) => ({ id: index + 1, name }));
}

export function filterDesktopMusicSongs(
  songs: DesktopMusicSong[],
  filters: DesktopMusicFilterState,
) {
  return songs.filter((song) => {
    if (
      filters.selectedPlaylist &&
      !song.playlists.includes(filters.selectedPlaylist.name)
    ) {
      return false;
    }

    return filterMusicLibrarySongs(
      [song],
      normalizeDesktopMusicLibraryFilters(filters),
    ).length > 0;
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
      filters.selectedPlaylist ||
      filters.mood.length ||
      filters.genre.length ||
      filters.region.length ||
      filters.instrument.length ||
      filters.vocal.length ||
      filters.build.length ||
      filters.bpmValue ||
      filters.keyValue ||
      filters.selectedDurations.length ||
      filters.cuePoint.length ||
      filters.markers ||
      filters.shuffle,
  );
}
