export type FilmwaveSong = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  genre?: string | null;
  mood?: string | null;
  bpm?: number | null;
  key?: string | null;
  duration?: number | null;
  coverUrl?: string | null;
  audioUrl?: string | null;
  waveform?: number[] | null;
};
