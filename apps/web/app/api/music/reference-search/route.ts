import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  compareClapConceptProfiles,
  getSongClapEmbeddingStats,
  scorePublishedSongsByClapSimilarity,
  searchPublishedSongsByClapSimilarity,
} from "@/lib/audioClapEmbeddings";
import {
  getSongDiscogsEmbeddingStats,
  searchPublishedSongsByDiscogsSimilarity,
} from "@/lib/audioDiscogsEmbeddings";
import {
  analyzeAudioUrl,
  compareAudioFeatures,
} from "@/lib/audioSimilarity";
import {
  compareRhythmProfiles,
  createRhythmProfile,
  getPublishedSongRhythmProfiles,
  getSongRhythmProfileStats,
} from "@/lib/audioRhythmFeatures";
import {
  compareHarmonicProfiles,
  createHarmonicProfile,
  getPublishedSongHarmonicProfiles,
  getSongHarmonicProfileStats,
} from "@/lib/audioHarmonicFeatures";
import {
  compareMeritEmbeddings,
  createMeritAudioEmbeddings,
  getPublishedSongMeritEmbeddings,
  getSongMeritEmbeddingStats,
  isMeritAnalyzerConfigured,
} from "@/lib/audioMeritEmbeddings";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_RESULT_COUNT = 200;
const RETRIEVAL_MATCH_COUNT = 100;
const MIN_REFERENCE_MATCH_SCORE = 0.5;
const MAX_REFERENCE_SCORE_DROP = 0.07;

type DeezerArtist = {
  id?: number;
  name?: string;
};

type DeezerAlbumSummary = {
  id?: number;
  title?: string;
};

type DeezerTrack = {
  id?: number;
  title?: string;
  title_short?: string;
  duration?: number;
  bpm?: number;
  preview?: string;
  artist?: DeezerArtist;
  album?: DeezerAlbumSummary;
};

type DeezerGenre = {
  name?: string;
};

type DeezerAlbum = {
  id?: number;
  title?: string;
  genres?: {
    data?: DeezerGenre[];
  };
};

type RankedSongRow = {
  id: string;
  bpm: number | null;
  genres: string[] | null;
};

type LegacyCandidateSong = RankedSongRow & {
  playback_url: string | null;
  audio_url: string | null;
};

const LEGACY_ANALYSIS_CONCURRENCY = 4;

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTrackName(track: DeezerTrack) {
  return track.title_short?.trim() || track.title?.trim() || "";
}

// Match alternate releases of the same named recording without treating
// unrelated songs or every title with a similar word as equivalent.
const VERSION_SUFFIX = /(?:\\s*\\((?:reverb|slowed(?:\\s*\\+\\s*reverb)?|sped\\s*up|speed\\s*up|nightcore|remaster(?:ed)?(?:\\s*\\d{4})?|radio\\s*edit|extended(?:\\s*mix)?|acoustic|instrumental|live(?:\\s*version)?|(?:[\\w\\s-]+\\s+)?remix|(?:[\\w\\s-]+\\s+)?mix|version)\\)|\\s*[-–—]\\s*(?:reverb|slowed(?:\\s*\\+\\s*reverb)?|sped\\s*up|remaster(?:ed)?(?:\\s*\\d{4})?|radio\\s*edit|instrumental|acoustic|live(?:\\s*version)?|[\\w\\s-]+\\s+remix))\\s*$/i;

function canonicalTrackTitle(title: string) {
  let cleaned = title.trim();
  // Allow more than one trailing edition label, e.g. "(Slowed) (Reverb)".
  for (let i = 0; i < 3; i += 1) {
    const next = cleaned.replace(VERSION_SUFFIX, "").trim();
    if (next === cleaned || !next) break;
    cleaned = next;
  }
  return normalize(cleaned);
}

async function fetchDeezerJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Deezer request failed with ${response.status}`);
  }

  const data = (await response.json()) as T & {
    error?: {
      message?: string;
    };
  };

  if (data?.error) {
    throw new Error(data.error.message || "Deezer returned an error");
  }

  return data;
}

async function getReferenceProfile(trackId: number) {
  const track = await fetchDeezerJson<DeezerTrack>(
    `https://api.deezer.com/track/${trackId}`,
  );

  const previewUrl = track.preview?.trim() ?? "";
  if (!previewUrl) {
    throw new Error("The selected reference track does not have an audio preview");
  }

  const albumId = Number(track.album?.id ?? 0);
  const album = albumId
    ? await fetchDeezerJson<DeezerAlbum>(
        `https://api.deezer.com/album/${albumId}`,
      ).catch(() => null)
    : null;

  const genres = (album?.genres?.data ?? [])
    .map((genre) => genre.name?.trim() ?? "")
    .filter(Boolean);

  return {
    track,
    previewUrl,
    genres,
  };
}

function getGenreSimilarity(
  referenceGenres: string[],
  candidateGenres: string[] | null,
) {
  if (referenceGenres.length === 0 || !candidateGenres?.length) return null;

  const reference = referenceGenres.map(normalize).filter(Boolean);
  const candidate = candidateGenres.map(normalize).filter(Boolean);

  if (reference.length === 0 || candidate.length === 0) return null;

  return reference.some((referenceGenre) =>
    candidate.some(
      (candidateGenre) =>
        candidateGenre === referenceGenre ||
        candidateGenre.includes(referenceGenre) ||
        referenceGenre.includes(candidateGenre),
    ),
  )
    ? 1
    : 0;
}

function getTempoSimilarity(
  referenceBpm: number | null,
  candidateBpm: number | null,
) {
  if (!referenceBpm || !candidateBpm) return null;

  const distances = [
    Math.abs(referenceBpm - candidateBpm),
    Math.abs(referenceBpm * 2 - candidateBpm),
    Math.abs(referenceBpm - candidateBpm * 2),
  ];

  return Math.max(0, 1 - Math.min(...distances) / 24);
}

function scoreMatch({
  audioSimilarity,
  bestSegmentSimilarity,
  averageBestSegmentSimilarity,
  consistentSegmentSimilarity,
  instrumentationSimilarity,
  characterSimilarity,
  rhythmSimilarity,
  energyDensitySimilarity,
  tempoSimilarity,
  discogsSimilarity,
  detailedRhythmSimilarity,
  harmonicSimilarity,
  meritMelodySimilarity,
  meritRhythmSimilarity,
  meritTimbreSimilarity,
}: {
  audioSimilarity: number;
  bestSegmentSimilarity: number;
  averageBestSegmentSimilarity: number;
  consistentSegmentSimilarity: number;
  instrumentationSimilarity: number;
  characterSimilarity: number;
  rhythmSimilarity: number;
  energyDensitySimilarity: number;
  tempoSimilarity: number | null;
  discogsSimilarity: number | null;
  detailedRhythmSimilarity: number | null;
  harmonicSimilarity: number | null;
  meritMelodySimilarity: number | null;
  meritRhythmSimilarity: number | null;
  meritTimbreSimilarity: number | null;
}) {
  const meritAvailable =
    meritMelodySimilarity !== null &&
    meritRhythmSimilarity !== null &&
    meritTimbreSimilarity !== null;
  const signals = [
    { score: audioSimilarity, weight: meritAvailable ? 0.044 : 0.18 },
    { score: consistentSegmentSimilarity, weight: 0.161 },
    { score: averageBestSegmentSimilarity, weight: 0.094 },
    { score: bestSegmentSimilarity, weight: 0.047 },
    { score: instrumentationSimilarity, weight: 0.134 },
    { score: characterSimilarity, weight: 0.079 },
    { score: rhythmSimilarity, weight: 0.054 },
    { score: energyDensitySimilarity, weight: 0.05 },
    ...(discogsSimilarity === null
      ? []
      : [{ score: discogsSimilarity, weight: 0.088 }]),
    ...(detailedRhythmSimilarity === null
      ? []
      : [{ score: detailedRhythmSimilarity, weight: 0.032 }]),
    ...(harmonicSimilarity === null
      ? []
      : [{ score: harmonicSimilarity, weight: 0.042 }]),
    ...(meritMelodySimilarity === null
      ? []
      : [{ score: meritMelodySimilarity, weight: 0.056 }]),
    ...(meritRhythmSimilarity === null
      ? []
      : [{ score: meritRhythmSimilarity, weight: 0.051 }]),
    ...(meritTimbreSimilarity === null
      ? []
      : [{ score: meritTimbreSimilarity, weight: 0.052 }]),
    ...(tempoSimilarity === null
      ? []
      : [{ score: tempoSimilarity, weight: 0.019 }]),
  ];

  const totalWeight = signals.reduce(
    (sum, signal) => sum + signal.weight,
    0,
  );
  const score = signals.reduce(
    (sum, signal) => sum + signal.score * signal.weight,
    0,
  );

  return totalWeight > 0 ? score / totalWeight : audioSimilarity;
}


async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      () => worker(),
    ),
  );

  return results;
}

async function getLegacyAudioMatches({
  previewUrl,
  referenceBpm,
  referenceGenres,
}: {
  previewUrl: string;
  referenceBpm: number | null;
  referenceGenres: string[];
}) {
  const referenceFeatures = await analyzeAudioUrl(previewUrl);

  const { data, error } = await supabaseServer
    .from("songs")
    .select("id, playback_url, audio_url, bpm, genres")
    .eq("status", "published");

  if (error) throw error;

  const candidateSongs = ((data ?? []) as LegacyCandidateSong[]).filter(
    (song) => Boolean(song.playback_url?.trim() || song.audio_url?.trim()),
  );

  const analyzed = await mapWithConcurrency(
    candidateSongs,
    LEGACY_ANALYSIS_CONCURRENCY,
    async (song) => {
      const sourceUrl =
        song.playback_url?.trim() || song.audio_url?.trim() || "";

      try {
        const candidateFeatures = await analyzeAudioUrl(sourceUrl);
        const audioSimilarity = compareAudioFeatures(
          referenceFeatures,
          candidateFeatures,
          {
            referenceBpm,
            candidateBpm: Number(song.bpm ?? 0) || null,
          },
        );
        const genreSimilarity = getGenreSimilarity(
          referenceGenres,
          song.genres,
        );

        return {
          songId: song.id,
          score:
            genreSimilarity === null
              ? audioSimilarity
              : audioSimilarity * 0.95 + genreSimilarity * 0.05,
          audioSimilarity,
          genreSimilarity,
        };
      } catch (candidateError) {
        console.warn(
          `Reference fallback audio analysis skipped song ${song.id}:`,
          candidateError,
        );
        return null;
      }
    },
  );

  const ranked = analyzed
    .filter(
      (
        result,
      ): result is {
        songId: string;
        score: number;
        audioSimilarity: number;
        genreSimilarity: number | null;
      } => result !== null,
    )
    .sort((a, b) => b.score - a.score);

  const bestScore = ranked[0]?.score ?? 0;
  const minimumScore = Math.max(
    MIN_REFERENCE_MATCH_SCORE,
    bestScore - MAX_REFERENCE_SCORE_DROP,
  );

  return ranked
    .filter((result) => result.score >= minimumScore)
    .slice(0, MAX_RESULT_COUNT)
    .map((result) => ({
      songId: result.songId,
      score: Number(result.score.toFixed(6)),
      audioSimilarity: Number(result.audioSimilarity.toFixed(6)),
      tempoSimilarity: null,
      genreSimilarity: result.genreSimilarity,
    }));
}

// Related-artist overlap is a supporting ranking signal, not a replacement
// for audio matching or the exact-reference promotion below.
const RELATED_ARTIST_BOOST_PER_REFERENCE = 0.012;
const RELATED_ARTIST_BOOST_CAP = 0.036;

async function getRelatedReferenceArtistNames(artist: DeezerArtist | undefined) {
  const names = new Set<string>();
  const direct = normalize(artist?.name ?? "");
  if (direct) names.add(direct);
  if (!artist?.id) return names;

  try {
    const related = await fetchDeezerJson<{
      data?: Array<{ name?: string }>;
    }>(`https://api.deezer.com/artist/${artist.id}/related?limit=30`);
    for (const entry of related.data ?? []) {
      const name = normalize(entry.name ?? "");
      if (name) names.add(name);
    }
  } catch (error) {
    // Deezer related artists are optional; audio ranking must still work.
    console.warn("Related artist lookup unavailable for reference search:", error);
  }
  return names;
}

async function boostMatchesByRelatedArtists<T extends { songId: string; score: number }>(
  matches: T[],
  artist: DeezerArtist | undefined,
): Promise<T[]> {
  if (!matches.length) return matches;

  const artistNames = await getRelatedReferenceArtistNames(artist);
  if (!artistNames.size) return matches;

  const { data, error } = await supabaseServer
    .from("song_similar_references")
    .select("song_id, artist")
    .in("song_id", matches.map((match) => match.songId));
  if (error) {
    console.warn("Reference artist overlap unavailable:", error);
    return matches;
  }

  const overlaps = new Map<string, Set<string>>();
  for (const reference of data ?? []) {
    const artistName = normalize(reference.artist ?? "");
    if (!artistName || !artistNames.has(artistName)) continue;
    const seen = overlaps.get(reference.song_id) ?? new Set<string>();
    seen.add(artistName);
    overlaps.set(reference.song_id, seen);
  }

  return matches
    .map((match) => ({
      ...match,
      score: Number((
        match.score + Math.min(
          RELATED_ARTIST_BOOST_CAP,
          (overlaps.get(match.songId)?.size ?? 0) * RELATED_ARTIST_BOOST_PER_REFERENCE,
        )
      ).toFixed(6)),
    }))
    .sort((a, b) => b.score - a.score);
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to search music." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const referenceId =
      body && typeof body === "object" && typeof body.referenceId === "string"
        ? body.referenceId.trim()
        : "";

    const match = /^deezer:track:(\d+)$/.exec(referenceId);
    const trackId = match ? Number(match[1]) : 0;

    if (!trackId) {
      return NextResponse.json(
        { error: "A Deezer track reference is required" },
        { status: 400 },
      );
    }

    const profile = await getReferenceProfile(trackId);
    const referenceBpm = Number(profile.track.bpm ?? 0) || null;
    const [
      embeddingStats,
      discogsStats,
      rhythmStats,
      harmonicStats,
      meritStats,
    ] = await Promise.all([
      getSongClapEmbeddingStats(),
      getSongDiscogsEmbeddingStats().catch(() => null),
      getSongRhythmProfileStats().catch(() => null),
      getSongHarmonicProfileStats().catch(() => null),
      getSongMeritEmbeddingStats().catch(() => null),
    ]);
    const clapReady = embeddingStats.embeddedSongs > 0;
    const discogsReady = (discogsStats?.embeddedSongs ?? 0) > 0;
    const rhythmReady = (rhythmStats?.profiledSongs ?? 0) > 0;
    const harmonicReady = (harmonicStats?.profiledSongs ?? 0) > 0;
    const meritReady =
      isMeritAnalyzerConfigured() &&
      (meritStats?.embeddedSongs ?? 0) > 0;

    let matches;
    let ranking;

    if (!clapReady) {
      matches = await getLegacyAudioMatches({
        previewUrl: profile.previewUrl,
        referenceBpm,
        referenceGenres: profile.genres,
      });
      ranking = "audio-similarity-v1-fallback";
    } else {
      const [clapRetrieval, discogsRetrieval] = await Promise.all([
        searchPublishedSongsByClapSimilarity(
          profile.previewUrl,
          {
            matchCount: RETRIEVAL_MATCH_COUNT,
            minSimilarity: -1,
          },
        ),
        discogsReady
          ? searchPublishedSongsByDiscogsSimilarity(
              profile.previewUrl,
              {
                matchCount: RETRIEVAL_MATCH_COUNT,
                minSimilarity: -1,
              },
            )
          : Promise.resolve([]),
      ]);

      const ids = [...new Set([
        ...clapRetrieval.matches.map((result) => result.songId),
        ...discogsRetrieval.map((result) => result.songId),
      ])];
      const discogsSimilarityBySongId = new Map(
        discogsRetrieval.map((result) => [
          result.songId,
          result.similarity,
        ]),
      );

      const [
        audioSearch,
        referenceRhythmProfile,
        candidateRhythmProfiles,
        referenceHarmonicProfile,
        candidateHarmonicProfiles,
        referenceMeritEmbeddings,
        candidateMeritEmbeddings,
      ] = await Promise.all([
        scorePublishedSongsByClapSimilarity(
          profile.previewUrl,
          ids,
        ),
        rhythmReady
          ? createRhythmProfile(profile.previewUrl)
          : Promise.resolve(null),
        rhythmReady
          ? getPublishedSongRhythmProfiles(ids)
          : Promise.resolve([]),
        harmonicReady
          ? createHarmonicProfile(profile.previewUrl)
          : Promise.resolve(null),
        harmonicReady
          ? getPublishedSongHarmonicProfiles(ids)
          : Promise.resolve([]),
        meritReady
          ? createMeritAudioEmbeddings(profile.previewUrl).catch(() => null)
          : Promise.resolve(null),
        meritReady
          ? getPublishedSongMeritEmbeddings(ids)
          : Promise.resolve([]),
      ]);
      const rhythmProfileBySongId = new Map(
        candidateRhythmProfiles.map((candidateProfile) => [
          candidateProfile.songId,
          candidateProfile,
        ]),
      );
      const harmonicProfileBySongId = new Map(
        candidateHarmonicProfiles.map((candidateProfile) => [
          candidateProfile.songId,
          candidateProfile,
        ]),
      );
      const meritEmbeddingBySongId = new Map(
        candidateMeritEmbeddings.map((candidateEmbedding) => [
          candidateEmbedding.songId,
          candidateEmbedding,
        ]),
      );

      const { data, error } =
        ids.length === 0
          ? { data: [], error: null }
          : await supabaseServer
              .from("songs")
              .select("id, bpm, genres")
              .in("id", ids);

      if (error) throw error;

      const songsById = new Map(
        ((data ?? []) as RankedSongRow[]).map((song) => [song.id, song]),
      );

      const rankedMatches = audioSearch.matches
        .map((result) => {
          const song = songsById.get(result.songId);
          const tempoSimilarity = getTempoSimilarity(
            referenceBpm,
            Number(song?.bpm ?? 0) || null,
          );
          const conceptSimilarity = compareClapConceptProfiles(
            audioSearch.referenceProfile,
            result.conceptProfile,
          );
          const discogsSimilarity =
            discogsSimilarityBySongId.get(result.songId) ?? null;
          const candidateRhythmProfile =
            rhythmProfileBySongId.get(result.songId);
          const detailedRhythmSimilarity =
            referenceRhythmProfile && candidateRhythmProfile
              ? compareRhythmProfiles(
                  referenceRhythmProfile,
                  candidateRhythmProfile,
                )
              : null;
          const candidateHarmonicProfile =
            harmonicProfileBySongId.get(result.songId);
          const harmonicSimilarity =
            referenceHarmonicProfile && candidateHarmonicProfile
              ? compareHarmonicProfiles(
                  referenceHarmonicProfile,
                  candidateHarmonicProfile,
                )
              : null;
          const candidateMeritEmbedding =
            meritEmbeddingBySongId.get(result.songId);
          const meritSimilarity =
            referenceMeritEmbeddings && candidateMeritEmbedding
              ? compareMeritEmbeddings(
                  referenceMeritEmbeddings,
                  candidateMeritEmbedding,
                )
              : null;

          return {
            songId: result.songId,
            score: scoreMatch({
              audioSimilarity: result.similarity,
              bestSegmentSimilarity:
                result.bestSegmentSimilarity,
              averageBestSegmentSimilarity:
                result.averageBestSegmentSimilarity,
              consistentSegmentSimilarity:
                result.consistentSegmentSimilarity,
              instrumentationSimilarity:
                conceptSimilarity.instrumentation,
              characterSimilarity:
                conceptSimilarity.character,
              rhythmSimilarity: conceptSimilarity.rhythm,
              energyDensitySimilarity:
                conceptSimilarity.energyDensity,
              tempoSimilarity,
              discogsSimilarity,
              detailedRhythmSimilarity,
              harmonicSimilarity,
              meritMelodySimilarity: meritSimilarity?.melody ?? null,
              meritRhythmSimilarity: meritSimilarity?.rhythm ?? null,
              meritTimbreSimilarity: meritSimilarity?.timbre ?? null,
            }),
            audioSimilarity: result.similarity,
            discogsSimilarity,
            detailedRhythmSimilarity,
            harmonicSimilarity,
            meritMelodySimilarity: meritSimilarity?.melody ?? null,
            meritRhythmSimilarity: meritSimilarity?.rhythm ?? null,
            meritTimbreSimilarity: meritSimilarity?.timbre ?? null,
            bestSegmentSimilarity:
              result.bestSegmentSimilarity,
            averageBestSegmentSimilarity:
              result.averageBestSegmentSimilarity,
            consistentSegmentSimilarity:
              result.consistentSegmentSimilarity,
            instrumentationSimilarity:
              conceptSimilarity.instrumentation,
            characterSimilarity:
              conceptSimilarity.character,
            rhythmSimilarity: conceptSimilarity.rhythm,
            energyDensitySimilarity:
              conceptSimilarity.energyDensity,
            tempoSimilarity,
          };
        })
        .sort((a, b) => b.score - a.score);

      const bestScore = rankedMatches[0]?.score ?? 0;
      const minimumScore = Math.max(
        MIN_REFERENCE_MATCH_SCORE,
        bestScore - MAX_REFERENCE_SCORE_DROP,
      );

      matches = rankedMatches
        .filter((result) => result.score >= minimumScore)
        .slice(0, MAX_RESULT_COUNT)
        .map((result) => ({
          songId: result.songId,
          score: Number(result.score.toFixed(6)),
          audioSimilarity: Number(result.audioSimilarity.toFixed(6)),
          discogsSimilarity:
            result.discogsSimilarity === null
              ? null
              : Number(result.discogsSimilarity.toFixed(6)),
          detailedRhythmSimilarity:
            result.detailedRhythmSimilarity === null
              ? null
              : Number(result.detailedRhythmSimilarity.toFixed(6)),
          harmonicSimilarity:
            result.harmonicSimilarity === null
              ? null
              : Number(result.harmonicSimilarity.toFixed(6)),
          meritMelodySimilarity:
            result.meritMelodySimilarity === null
              ? null
              : Number(result.meritMelodySimilarity.toFixed(6)),
          meritRhythmSimilarity:
            result.meritRhythmSimilarity === null
              ? null
              : Number(result.meritRhythmSimilarity.toFixed(6)),
          meritTimbreSimilarity:
            result.meritTimbreSimilarity === null
              ? null
              : Number(result.meritTimbreSimilarity.toFixed(6)),
          bestSegmentSimilarity: Number(
            result.bestSegmentSimilarity.toFixed(6),
          ),
          averageBestSegmentSimilarity: Number(
            result.averageBestSegmentSimilarity.toFixed(6),
          ),
          consistentSegmentSimilarity: Number(
            result.consistentSegmentSimilarity.toFixed(6),
          ),
          tempoSimilarity:
            result.tempoSimilarity === null
              ? null
              : Number(result.tempoSimilarity.toFixed(6)),
          instrumentationSimilarity: Number(
            result.instrumentationSimilarity.toFixed(6),
          ),
          characterSimilarity: Number(
            result.characterSimilarity.toFixed(6),
          ),
          rhythmSimilarity: Number(
            result.rhythmSimilarity.toFixed(6),
          ),
          energyDensitySimilarity: Number(
            result.energyDensitySimilarity.toFixed(6),
          ),
        }));
      ranking =
        meritReady && referenceMeritEmbeddings
          ? "audio-clap-discogs-rhythm-harmonic-merit-rerank-v12"
          : harmonicReady
            ? "audio-clap-discogs-rhythm-harmonic-rerank-v9"
            : rhythmReady
              ? "audio-clap-discogs-rhythm-rerank-v8"
              : discogsReady
                ? "audio-clap-discogs-weighted-rerank-v7"
                : "audio-clap-fulltrack-segments-v5";
    }

    matches = await boostMatchesByRelatedArtists(matches, profile.track.artist);

    // An exact, artist-curated Deezer reference is a stronger signal than
    // acoustic similarity. Promote matching published songs even when they
    // fell outside the acoustic retrieval cutoff.
    const referenceTitle = canonicalTrackTitle(profile.track.title || getTrackName(profile.track));
    const referenceArtist = normalize(profile.track.artist?.name ?? "");
    const [exactLookup, artistLookup] = await Promise.all([
      supabaseServer
        .from("song_similar_references")
        .select("song_id")
        .eq("deezer_track_id", String(trackId)),
      referenceArtist
        ? supabaseServer
            .from("song_similar_references")
            .select("song_id, title, artist")
            .ilike("artist", profile.track.artist?.name?.trim() ?? "")
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (exactLookup.error) throw exactLookup.error;
    // Alternate-version matching is optional: exact IDs and acoustic ranking
    // still work if the artist/title lookup is unavailable.
    if (artistLookup.error) {
      console.warn("Alternate reference version lookup unavailable:", artistLookup.error);
    }

    const exactIds = new Set((exactLookup.data ?? []).map((entry) => entry.song_id));
    const alternateIds = new Set(
      (artistLookup.data ?? [])
        .filter((entry) =>
          normalize(entry.artist ?? "") === referenceArtist &&
          canonicalTrackTitle(entry.title ?? "") === referenceTitle,
        )
        .map((entry) => entry.song_id)
        .filter((id) => !exactIds.has(id)),
    );
    // A saved reference by the searched artist is relevant even when its
    // recording is outside acoustic retrieval. Keep those additional songs
    // after the audio-ranked matches, not above stronger audio matches.
    const sameArtistIds = new Set(
      (artistLookup.data ?? [])
        .filter((entry) => normalize(entry.artist ?? "") === referenceArtist)
        .map((entry) => entry.song_id),
    );
    const matchingIds = [...new Set([...exactIds, ...alternateIds, ...sameArtistIds])];
    if (matchingIds.length > 0) {
      const { data: publishedSongs, error: publishedError } = await supabaseServer
        .from("songs")
        .select("id")
        .eq("status", "published")
        .in("id", matchingIds);
      if (publishedError) throw publishedError;

      const publishedIds = new Set((publishedSongs ?? []).map((song) => song.id));
      const existingMatches = new Map(matches.map((result) => [result.songId, result]));
      const promoted = [...exactIds, ...alternateIds]
        .filter((id) => publishedIds.has(id))
        .map((id) => existingMatches.get(id) ?? ({ songId: id, score: 1 } as (typeof matches)[number]));
      const promotedIds = new Set(promoted.map((result) => result.songId));
      const audioRanked = matches.filter((result) => !promotedIds.has(result.songId));
      const includedIds = new Set([...promotedIds, ...audioRanked.map((result) => result.songId)]);
      const remainingArtistMatches = [...sameArtistIds]
        .filter((id) => publishedIds.has(id) && !includedIds.has(id))
        .map((id) => existingMatches.get(id) ?? ({ songId: id, score: 0 } as (typeof matches)[number]));

      matches = [...promoted, ...audioRanked, ...remainingArtistMatches]
        .slice(0, MAX_RESULT_COUNT);
    }

    return NextResponse.json(
      {
        matches,
        ranking,
        reference: {
          id: referenceId,
          title: getTrackName(profile.track),
          artist: profile.track.artist?.name?.trim() ?? "",
          bpm: referenceBpm,
          duration: Number(profile.track.duration ?? 0) || null,
          genres: profile.genres,
          audioAnalyzed: true,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Reference music search failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Reference search is temporarily unavailable",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }
}
