import type {
  FilmwaveBpmFilterValue,
  FilmwaveEditPointMarker,
  FilmwaveEditPointRange,
  FilmwaveEditPoints,
  FilmwaveKeyFilterValue,
  FilmwavePlaylist,
  FilmwavePlaylistSong,
  FilmwaveSong,
} from "@filmwave/shared";

export type EditPointMarker = FilmwaveEditPointMarker;

export type EditPointRange = FilmwaveEditPointRange;

export type EditPoints = FilmwaveEditPoints;

export type Song = FilmwaveSong;

export type Playlist = FilmwavePlaylist;

export type PlaylistSong = FilmwavePlaylistSong;

export type BpmFilterValue = FilmwaveBpmFilterValue;

export type KeyFilterValue = FilmwaveKeyFilterValue;

export type SharedFilmwaveSong = FilmwaveSong;

export type PlaylistRef = {
  id: number;
  name: string;
};

export type Project = {
  id: number;
  clerk_user_id: string;
  name: string;
  description: string | null;
  position: number | null;
  created_at: string;
};

export type ProjectAssetType =
  | "song"
  | "sound-fx"
  | "visual-fx"
  | "colour-grading";

export type ProjectFolder = {
  id: number;
  project_id: number;
  clerk_user_id: string;
  name: string;
  asset_type: ProjectAssetType | null;
  parent_folder_id: number | null;
  position: number | null;
  created_at: string;
  updated_at: string;
  asset_count?: number;
  child_count?: number;
};

export type ProjectAsset = {
  id: number;
  created_at: string;
  project_id: number;
  asset_type: ProjectAssetType | string;
  asset_id: string;
  folder_id: number | null;
  position: number;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};
