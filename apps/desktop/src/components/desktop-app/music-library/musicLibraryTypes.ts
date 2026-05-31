import type {
  FilmwaveBpmFilterValue,
  FilmwaveKeyFilterValue,
  MusicPlaylistFilterRef,
} from "@filmwave/shared";
import type { DesktopSong } from "../../../lib/desktopSongs";

export type DesktopMusicFilterKey =
  | "mood"
  | "genre"
  | "instrument"
  | "vocal"
  | "build"
  | "cuePoint";

export type DesktopMusicFilterState = Record<DesktopMusicFilterKey, string[]> & {
  search: string;
  selectedPlaylist: MusicPlaylistFilterRef | null;
  selectedDurations: string[];
  bpmValue: FilmwaveBpmFilterValue | null;
  keyValue: FilmwaveKeyFilterValue | null;
  markers: boolean;
  shuffle: boolean;
};

export type DesktopMusicFilterOptions = Record<DesktopMusicFilterKey, string[]>;

export type DesktopMusicSong = DesktopSong;
