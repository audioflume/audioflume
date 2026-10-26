export type ReferenceSearchMatch = {
  songId: string;
  score: number;
  audioSimilarity: number | null;
  discogsSimilarity: number | null;
  detailedRhythmSimilarity: number | null;
  harmonicSimilarity: number | null;
  meritMelodySimilarity: number | null;
  meritRhythmSimilarity: number | null;
  meritTimbreSimilarity: number | null;
  bestSegmentSimilarity: number | null;
  averageBestSegmentSimilarity: number | null;
  consistentSegmentSimilarity: number | null;
  tempoSimilarity: number | null;
  instrumentationSimilarity: number | null;
  characterSimilarity: number | null;
  rhythmSimilarity: number | null;
  energyDensitySimilarity: number | null;
};

export type ReferenceSearchHandoff = {
  referenceId: string;
  query: string;
  name: string;
  artist: string;
  imageUrl: string | null;
  songIds: string[];
  matches: ReferenceSearchMatch[];
  ranking: string | null;
};

const REFERENCE_SEARCH_HANDOFF_KEY =
  "audioflume:reference-search-handoff";

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getReferenceSearchMatches(data: unknown): ReferenceSearchMatch[] {
  if (!data || typeof data !== "object") return [];

  const matches = (data as { matches?: unknown }).matches;
  if (!Array.isArray(matches)) return [];

  return matches.flatMap((match) => {
    if (!match || typeof match !== "object") return [];

    const record = match as Record<string, unknown>;
    const songId = record.songId;
    const score = record.score;

    if (
      typeof songId !== "string" ||
      !songId ||
      typeof score !== "number" ||
      !Number.isFinite(score)
    ) {
      return [];
    }

    return [{
      songId,
      score,
      audioSimilarity: toNullableNumber(record.audioSimilarity),
      discogsSimilarity: toNullableNumber(record.discogsSimilarity),
      detailedRhythmSimilarity: toNullableNumber(record.detailedRhythmSimilarity),
      harmonicSimilarity: toNullableNumber(record.harmonicSimilarity),
      meritMelodySimilarity: toNullableNumber(record.meritMelodySimilarity),
      meritRhythmSimilarity: toNullableNumber(record.meritRhythmSimilarity),
      meritTimbreSimilarity: toNullableNumber(record.meritTimbreSimilarity),
      bestSegmentSimilarity: toNullableNumber(record.bestSegmentSimilarity),
      averageBestSegmentSimilarity: toNullableNumber(record.averageBestSegmentSimilarity),
      consistentSegmentSimilarity: toNullableNumber(record.consistentSegmentSimilarity),
      tempoSimilarity: toNullableNumber(record.tempoSimilarity),
      instrumentationSimilarity: toNullableNumber(record.instrumentationSimilarity),
      characterSimilarity: toNullableNumber(record.characterSimilarity),
      rhythmSimilarity: toNullableNumber(record.rhythmSimilarity),
      energyDensitySimilarity: toNullableNumber(record.energyDensitySimilarity),
    }];
  });
}

export function getReferenceSearchRanking(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const ranking = (data as { ranking?: unknown }).ranking;
  return typeof ranking === "string" && ranking ? ranking : null;
}

export function getReferenceSearchMatchSongIds(data: unknown) {
  return getReferenceSearchMatches(data).map((match) => match.songId);
}

export function writeReferenceSearchHandoff(
  handoff: ReferenceSearchHandoff,
) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    REFERENCE_SEARCH_HANDOFF_KEY,
    JSON.stringify(handoff),
  );
}

export function takeReferenceSearchHandoff(
  referenceId: string,
  query: string,
) {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(
      REFERENCE_SEARCH_HANDOFF_KEY,
    );
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<ReferenceSearchHandoff>;

    if (
      parsed.referenceId !== referenceId ||
      parsed.query !== query ||
      !Array.isArray(parsed.songIds)
    ) {
      return null;
    }

    window.sessionStorage.removeItem(REFERENCE_SEARCH_HANDOFF_KEY);

    const matches = Array.isArray(parsed.matches)
      ? parsed.matches.filter(
          (match): match is ReferenceSearchMatch =>
            Boolean(
              match &&
                typeof match === "object" &&
                typeof match.songId === "string" &&
                typeof match.score === "number",
            ),
        )
      : [];

    return {
      referenceId,
      query,
      name: typeof parsed.name === "string" ? parsed.name : query,
      artist: typeof parsed.artist === "string" ? parsed.artist : "",
      imageUrl:
        typeof parsed.imageUrl === "string" || parsed.imageUrl === null
          ? parsed.imageUrl
          : null,
      songIds: parsed.songIds.filter(
        (songId): songId is string =>
          typeof songId === "string" && songId.length > 0,
      ),
      matches,
      ranking:
        typeof parsed.ranking === "string" && parsed.ranking
          ? parsed.ranking
          : null,
    };
  } catch {
    return null;
  }
}
