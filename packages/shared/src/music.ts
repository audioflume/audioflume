export type FilmwaveStem = {
  name: string;
  url: string;
};

export type FilmwaveEditPointMarker = {
  id: string;
  label: string;
  time: number;
  type?: string;
  confidence?: number;
  source?: string;
};

export type FilmwaveEditPointRange = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type FilmwaveEditPoints = {
  markers?: FilmwaveEditPointMarker[];
  ranges?: FilmwaveEditPointRange[];
};

export type FilmwaveSong = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  playbackUrl: string;
  hlsUrl: string;
  stems: FilmwaveStem[];
  coverArt: string | null;
  waveformPeaks: string;
  duration: number;
  key: string;
  bpm: number;
  genres: string[];
  moods: string[];
  regions: string[];
  instruments: string[];
  builds: string[];
  vocals: string[];
  instrumental: boolean;
  aiGenerated?: boolean;
  editPoints: string;
  downloadCount: number;
  sizeBytes?: number;
};

export type FilmwaveSongApiItem = {
  id: string | number;
  title?: string | null;
  artist?: string | null;
  audioUrl?: string | null;
  playbackUrl?: string | null;
  hlsUrl?: string | null;
  coverArt?: string | null;
  stems?: Array<{
    name?: string | null;
    url?: string | null;
  }>;
  waveformPeaks?: string | number[] | null;
  duration?: number | string | null;
  key?: string | null;
  bpm?: number | string | null;
  genres?: string[] | null;
  moods?: string[] | null;
  regions?: string[] | null;
  instruments?: string[] | null;
  builds?: string[] | null;
  vocals?: string[] | null;
  instrumental?: boolean | null;
  aiGenerated?: boolean | null;
  editPoints?: string | null;
  downloadCount?: number | string | null;
  sizeBytes?: number | string | null;
};

export type FilmwaveDesktopSong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  genres: string[];
  mood: string;
  moods: string[];
  region: string;
  regions: string[];
  bpm: number;
  key: string;
  duration: string;
  durationSeconds: number;
  build: string;
  builds: string[];
  vocals: string;
  vocalTags: string[];
  instrumental: boolean;
  instruments: string[];
  playlists: string[];
  cuePoints: number;
  markers: number;
  waveform: number[];
  audioUrl: string;
  playbackUrl: string;
  hlsUrl: string;
  coverArt: string | null;
  stems: FilmwaveStem[];
  editPoints: string;
  downloadCount: number;
  sizeBytes?: number;
  aiGenerated?: boolean;
  isFavorite?: boolean;
};

export type FilmwavePlaylist = {
  id: number;
  clerk_user_id: string;
  name: string;
  cover_image_url: string | null;
  position: number;
  is_public: boolean;
  published_at: string | null;
};

export type FilmwavePlaylistSong = FilmwaveSong & {
  playlist_song_id: number;
  playlist_id: number;
  song_id: string;
  position: number;
  created_at: string;
};

export type FilmwaveBpmFilterValue = {
  mode: "range" | "exact";
  low: number;
  high: number;
  exact: number;
};

export type FilmwaveKeyFilterValue = {
  note: string;
  scale: "major" | "minor" | null;
};
