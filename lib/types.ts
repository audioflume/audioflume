export type Song = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  stems: {
    name: string;
    url: string;
  }[];
  coverArt: string | null;
  waveformPeaks: string;
  duration: number;
  key: string;
  bpm: number;
  genres: string[];
  moods: string[];
  instruments: string[];
  builds: string[];
  vocals: string[];
  instrumental: boolean;
  editPoints: string;
};

export type Playlist = {
  id: number;
  clerk_user_id: string;
  name: string;
  cover_image_url: string | null;
  position: number;
};

export type PlaylistSong = Song & {
  playlist_song_id: number;
  playlist_id: number;
  song_id: string;
  position: number;
  created_at: string;
};

export type BpmFilterValue = {
  mode: "range" | "exact";
  low: number;
  high: number;
  exact: number;
};

export type KeyFilterValue = {
  note: string;
  scale: "major" | "minor" | null;
};

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

export type EditPointMarker = {
  id: string;
  label: string;
  time: number;
};

export type EditPointRange = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type EditPoints = {
  markers?: EditPointMarker[];
  ranges?: EditPointRange[];
};
