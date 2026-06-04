import type { MusicLibraryFilterSong, MusicLibraryFilterValues } from "./musicLibraryFiltering";

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) return [value.trim()];

  return [];
}

function getFieldText(values: unknown) {
  return toStringArray(values).map(normalizeText);
}

function getSongSearchText(song: MusicLibraryFilterSong) {
  return [
    song.title,
    song.artist,
    song.key,
    String(song.bpm ?? ""),
    ...toStringArray(song.genres ?? song.genre),
    ...toStringArray(song.moods ?? song.mood),
    ...toStringArray(song.instruments),
    ...toStringArray(song.builds ?? song.build),
    ...toStringArray(song.vocals),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreTextField(value: unknown, query: string, weight: number) {
  const normalizedValue = normalizeText(value);
  if (!query || !normalizedValue) return 0;

  if (normalizedValue === query) return weight * 4;
  if (normalizedValue.startsWith(query)) return weight * 3;
  if (normalizedValue.includes(query)) return weight * 2;

  return 0;
}

function scoreSelectedValues(songValues: unknown, selectedValues: string[], weight: number) {
  if (selectedValues.length === 0) return 0;

  const normalizedSongValues = getFieldText(songValues);
  const searchableText = normalizedSongValues.join(" ");

  return selectedValues.reduce((score, selectedValue) => {
    const normalizedSelectedValue = normalizeText(selectedValue);
    if (!normalizedSelectedValue) return score;

    if (normalizedSongValues.includes(normalizedSelectedValue)) return score + weight * 2;
    if (searchableText.includes(normalizedSelectedValue)) return score + weight;

    return score;
  }, 0);
}

function scoreBpm(songBpm: unknown, filterBpm: MusicLibraryFilterValues["bpmValue"]) {
  if (!filterBpm) return 0;

  const bpm = Number(songBpm || 0);
  if (!Number.isFinite(bpm) || bpm <= 0) return 0;

  if (filterBpm.mode === "exact") return bpm === filterBpm.exact ? 14 : 0;

  const midpoint = (filterBpm.low + filterBpm.high) / 2;
  const distance = Math.abs(bpm - midpoint);
  const range = Math.max(1, filterBpm.high - filterBpm.low);

  return Math.max(0, 10 - (distance / range) * 5);
}

function scoreKey(songKey: unknown, keyValue: MusicLibraryFilterValues["keyValue"]) {
  if (!keyValue?.note) return 0;

  const normalizedSongKey = normalizeText(songKey).replaceAll("♯", "#").replaceAll("♭", "b");
  const normalizedNote = normalizeText(keyValue.note).replaceAll("♯", "#").replaceAll("♭", "b");

  if (!normalizedSongKey || !normalizedSongKey.startsWith(normalizedNote)) return 0;

  if (!keyValue.scale) return 8;

  const scaleMatch =
    keyValue.scale === "major"
      ? normalizedSongKey.includes("maj")
      : normalizedSongKey.includes("min");

  return scaleMatch ? 12 : 8;
}

export function scoreMusicLibrarySongRelevance(
  song: MusicLibraryFilterSong,
  filters: MusicLibraryFilterValues,
) {
  const query = normalizeText(filters.search);
  let score = 0;

  if (query) {
    score += scoreTextField(song.title, query, 24);
    score += scoreTextField(song.artist, query, 14);
    score += scoreTextField(song.key, query, 4);

    score += scoreSelectedValues(song.genres ?? song.genre, [query], 12);
    score += scoreSelectedValues(song.moods ?? song.mood, [query], 12);
    score += scoreSelectedValues(song.instruments, [query], 10);
    score += scoreSelectedValues(song.builds ?? song.build, [query], 8);
    score += scoreSelectedValues(song.vocals, [query], 6);

    if (getSongSearchText(song).includes(query)) score += 5;
  }

  score += scoreSelectedValues(song.moods ?? song.mood, filters.selectedMoods ?? [], 10);
  score += scoreSelectedValues(song.genres ?? song.genre, filters.selectedGenres ?? [], 10);
  score += scoreSelectedValues(song.instruments, filters.selectedInstruments ?? [], 8);
  score += scoreSelectedValues(song.builds ?? song.build, filters.selectedBuilds ?? [], 6);
  score += scoreSelectedValues(song.vocals, filters.selectedVocals ?? [], 6);

  if (filters.instrumental && song.instrumental) score += 6;
  score += scoreBpm(song.bpm, filters.bpmValue);
  score += scoreKey(song.key, filters.keyValue);

  return score;
}

export function sortMusicLibrarySongsByRelevance<T extends MusicLibraryFilterSong>(
  songs: T[],
  filters: MusicLibraryFilterValues,
) {
  return [...songs].sort((a, b) => {
    const scoreDifference =
      scoreMusicLibrarySongRelevance(b, filters) -
      scoreMusicLibrarySongRelevance(a, filters);

    if (scoreDifference !== 0) return scoreDifference;

    return 0;
  });
}
