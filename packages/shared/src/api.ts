import type { FilmwaveDesktopSong, FilmwaveSong, FilmwaveSongApiItem } from "./music";
import type {
  FilmwaveDesktopAccount,
  FilmwaveDesktopLocalChangesResult,
  FilmwaveDesktopLocalRemovalResult,
  FilmwaveDesktopProject,
  FilmwaveDesktopProjectApiItem,
  FilmwaveDesktopProjectSyncOperation,
  FilmwaveProject,
  FilmwaveProjectAsset,
  FilmwaveProjectFolder,
} from "./projects";

export type FilmwaveApiErrorResponse = {
  error?: string;
};

export type FilmwaveSongsApiResponse = FilmwaveApiErrorResponse & {
  songs?: FilmwaveSong[];
};

export type FilmwaveDesktopSongsApiResponse = FilmwaveApiErrorResponse & {
  songs?: FilmwaveSongApiItem[];
};

export type FilmwaveDesktopNormalizedSongsApiResponse = FilmwaveApiErrorResponse & {
  songs?: FilmwaveDesktopSong[];
};

export type FilmwaveProjectsApiResponse = FilmwaveApiErrorResponse & {
  projects?: FilmwaveProject[];
};

export type FilmwaveProjectFoldersApiResponse = FilmwaveApiErrorResponse & {
  folders?: FilmwaveProjectFolder[];
};

export type FilmwaveProjectAssetsApiResponse = FilmwaveApiErrorResponse & {
  assets?: FilmwaveProjectAsset[];
};

export type FilmwaveDesktopProjectsApiResponse = FilmwaveApiErrorResponse & {
  projects?: FilmwaveDesktopProjectApiItem[];
};

export type FilmwaveDesktopNormalizedProjectsApiResponse = FilmwaveApiErrorResponse & {
  projects?: FilmwaveDesktopProject[];
};

export type FilmwaveDesktopAccountApiResponse = FilmwaveApiErrorResponse & {
  user?: FilmwaveDesktopAccount;
};

export type FilmwaveDesktopProjectSyncOperationsApiResponse = FilmwaveApiErrorResponse & {
  operations?: FilmwaveDesktopProjectSyncOperation[];
};

export type FilmwaveDesktopLocalRemovalApiResponse = FilmwaveApiErrorResponse &
  FilmwaveDesktopLocalRemovalResult;

export type FilmwaveDesktopLocalChangesApiResponse = FilmwaveApiErrorResponse &
  FilmwaveDesktopLocalChangesResult;
