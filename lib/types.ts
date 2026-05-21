export type EditPointMarker = {
  id: string;
  label: string;
  time: number;
  type?: string;
  confidence?: number;
  source?: string;
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

export type ProjectAssetType = "song" | "sound-fx" | "visual-fx" | "colour-grading";

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
