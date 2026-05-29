import type {
  FilmwaveBpmFilterValue,
  FilmwaveEditPointMarker,
  FilmwaveEditPointRange,
  FilmwaveEditPoints,
  FilmwaveKeyFilterValue,
  FilmwavePlaylist,
  FilmwavePlaylistSong,
  FilmwaveProject,
  FilmwaveProjectAsset,
  FilmwaveProjectAssetType,
  FilmwaveProjectFolder,
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

export type Project = FilmwaveProject;

export type ProjectAssetType = FilmwaveProjectAssetType;

export type ProjectFolder = FilmwaveProjectFolder;

export type ProjectAsset = FilmwaveProjectAsset;
