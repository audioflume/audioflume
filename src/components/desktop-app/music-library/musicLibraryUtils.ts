import type {
  DesktopMusicFilterOptions,
  DesktopMusicFilterState,
  DesktopMusicSong,
} from "./musicLibraryTypes";

export const QUICK_GENRES = ["Ambient", "Cinematic", "Commercial", "Indie"];

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

function getDurationSeconds(duration: string) {
  const [minutes, seconds] = duration.split(":").map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0;
  return minutes * 60 + seconds;
}

function matchesDurationFilter(duration: string, selected: string[]) {
  if (!selected.length) return true;
  const seconds = getDurationSeconds(duration);

  return selected.some((value) => {
    if (value === "Under 2:00") return seconds > 0 && seconds < 120;
    if (value === "2:00–3:00") return seconds >= 120 && seconds <= 180;
    if (value === "Over 3:00") return seconds > 180;
    return true;
  });
}

export function getDesktopMusicFilterOptions(
  songs: DesktopMusicSong[],
): DesktopMusicFilterOptions {
  return {
    playlist: unique(songs.flatMap((song) => song.playlists)),
    mood: unique(songs.map((song) => song.mood)),
    genre: unique(songs.map((song) => song.genre)),
    instrument: unique(songs.flatMap((song) => song.instruments)),
    vocal: unique(songs.map((song) => song.vocals)),
    build: unique(songs.map((song) => song.build)),
    bpm: ["60–90", "90–120", "120+"],
    key: unique(songs.map((song) => song.key)),
    duration: ["Under 2:00", "2:00–3:00", "Over 3:00"],
    cuePoint: ["First Hit", "Intro End", "Drop", "Break", "Button Ending"],
  };
}

export function filterDesktopMusicSongs(
  songs: DesktopMusicSong[],
  filters: DesktopMusicFilterState,
) {
  const query = filters.search.trim().toLowerCase();

  return songs.filter((song) => {
    const searchableText = [
      song.title,
      song.artist,
      song.genre,
      song.mood,
      song.key,
      song.vocals,
      song.build,
      ...song.instruments,
      ...song.playlists,
    ]
      .join(" ")
      .toLowerCase();

    if (query && !searchableText.includes(query)) return false;
    if (
      filters.playlist.length &&
      !filters.playlist.some((value) => song.playlists.includes(value))
    ) {
      return false;
    }
    if (filters.mood.length && !filters.mood.includes(song.mood)) return false;
    if (filters.genre.length && !filters.genre.includes(song.genre)) return false;
    if (
      filters.instrument.length &&
      !filters.instrument.some((value) => song.instruments.includes(value))
    ) {
      return false;
    }
    if (filters.vocal.length && !filters.vocal.includes(song.vocals)) {
      return false;
    }
    if (filters.build.length && !filters.build.includes(song.build)) {
      return false;
    }
    if (filters.key.length && !filters.key.includes(song.key)) return false;
    if (!matchesDurationFilter(song.duration, filters.duration)) return false;
    if (
      filters.bpm.length &&
      !filters.bpm.some((value) => {
        if (value === "60–90") return song.bpm >= 60 && song.bpm <= 90;
        if (value === "90–120") return song.bpm >= 90 && song.bpm <= 120;
        if (value === "120+") return song.bpm >= 120;
        return true;
      })
    ) {
      return false;
    }
    if (filters.cuePoint.length && song.cuePoints <= 0) return false;

    return true;
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
