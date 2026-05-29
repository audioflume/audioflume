import type { DesktopSong } from "../../../lib/desktopSongs";

export type DesktopMusicFilterKey =
  | "playlist"
  | "mood"
  | "genre"
  | "instrument"
  | "vocal"
  | "build"
  | "bpm"
  | "key"
  | "duration"
  | "cuePoint";

export type DesktopMusicFilterState = Record<DesktopMusicFilterKey, string[]> & {
  search: string;
  markers: boolean;
  shuffle: boolean;
};

export type DesktopMusicFilterOptions = Record<DesktopMusicFilterKey, string[]>;

export type DesktopMusicSong = DesktopSong;
