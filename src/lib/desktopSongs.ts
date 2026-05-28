export type DesktopSong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  duration: string;
  build: "Low" | "Medium" | "High";
  vocals: "Instrumental" | "Vocal";
  instruments: string[];
  playlists: string[];
  cuePoints: number;
  markers: number;
  waveform: number[];
  isFavorite?: boolean;
};

export const desktopSongs: DesktopSong[] = [
  { id: 's1', title: 'Quiet Motion', artist: 'North Harbor', genre: 'Ambient', mood: 'Calm', bpm: 92, key: 'A min', duration: '2:41', build: 'Low', vocals: 'Instrumental', instruments: ['Piano', 'Pad'], playlists: ['Documentary'], cuePoints: 2, markers: 3, waveform: [20,50,35,65,40,70,55,76,44,65], isFavorite: true },
  { id: 's2', title: 'Soft Horizon', artist: 'Lumen Valley', genre: 'Cinematic', mood: 'Warm', bpm: 78, key: 'C maj', duration: '3:18', build: 'Low', vocals: 'Vocal', instruments: ['Guitar', 'Strings'], playlists: ['Travel'], cuePoints: 1, markers: 2, waveform: [18,24,29,44,53,47,40,62,56,31] },
  { id: 's3', title: 'Clean Pulse', artist: 'Vector Bloom', genre: 'Commercial', mood: 'Uplifting', bpm: 118, key: 'D min', duration: '2:08', build: 'High', vocals: 'Instrumental', instruments: ['Synth', 'Drums'], playlists: ['Brand'], cuePoints: 3, markers: 5, waveform: [30,60,75,55,42,69,86,64,58,70] },
  { id: 's4', title: 'Northline', artist: 'Atlas Frame', genre: 'Tension', mood: 'Focused', bpm: 104, key: 'F min', duration: '1:56', build: 'Medium', vocals: 'Instrumental', instruments: ['Bass', 'Percussion'], playlists: ['Trailer'], cuePoints: 2, markers: 4, waveform: [16,22,39,61,67,71,59,53,42,44] },
  { id: 's5', title: 'Lighthouse Run', artist: 'Polaris Echo', genre: 'Indie', mood: 'Hopeful', bpm: 112, key: 'G maj', duration: '2:52', build: 'Medium', vocals: 'Vocal', instruments: ['Guitar', 'Drums'], playlists: ['Indie Picks'], cuePoints: 2, markers: 3, waveform: [27,36,44,49,61,72,65,57,48,41] },
];
