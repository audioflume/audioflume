import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import {
  ensurePublishedSongClapEmbeddings,
  getSongClapEmbeddingStats,
  refreshPublishedSongClapEmbedding,
  SONG_CLAP_EMBEDDING_DIMENSIONS,
  SONG_CLAP_MODEL_ID,
  SONG_CLAP_MODEL_KEY,
} from "@/lib/audioClapEmbeddings";
import {
  ensurePublishedSongDiscogsEmbeddings,
  getSongDiscogsEmbeddingStats,
  refreshPublishedSongDiscogsEmbedding,
  SONG_DISCOGS_EMBEDDING_DIMENSIONS,
  SONG_DISCOGS_MODEL_ID,
  SONG_DISCOGS_MODEL_KEY,
} from "@/lib/audioDiscogsEmbeddings";
import {
  ensurePublishedSongRhythmProfiles,
  getSongRhythmProfileStats,
  refreshPublishedSongRhythmProfile,
  SONG_RHYTHM_PROFILE_VERSION,
} from "@/lib/audioRhythmFeatures";
import {
  ensurePublishedSongHarmonicProfiles,
  getSongHarmonicProfileStats,
  refreshPublishedSongHarmonicProfile,
  SONG_HARMONIC_PROFILE_VERSION,
} from "@/lib/audioHarmonicFeatures";
import {
  ensurePublishedSongMeritEmbeddings,
  getSongMeritEmbeddingStats,
  refreshPublishedSongMeritEmbedding,
  SONG_MERIT_EMBEDDING_DIMENSIONS,
  SONG_MERIT_MODEL_ID,
  SONG_MERIT_MODEL_KEY,
} from "@/lib/audioMeritEmbeddings";
import {
  backfillPublishedSongSearchEmbeddings,
  ensurePublishedSongSearchEmbeddings,
  getSongSearchEmbeddingStats,
  refreshPublishedSongSearchEmbedding,
  searchPublishedSongsSemantically,
  SONG_SEARCH_EMBEDDING_DIMENSIONS,
  SONG_SEARCH_EMBEDDING_MODEL,
  type SemanticSongSearchMatch,
} from "@/lib/songEmbeddings";
import {
  rankHybridSongSearchResults,
  type HybridSearchSong,
} from "@/lib/songSearchHybridRanking";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_QUERY_LENGTH = 500;
const DEFAULT_TEST_MATCH_COUNT = 25;
const MAX_TEST_MATCH_COUNT = 100;
const MIN_HYBRID_CANDIDATE_COUNT = 100;
const MAX_HYBRID_CANDIDATE_COUNT = 200;

function clampMatchCount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TEST_MATCH_COUNT;
  return Math.min(
    MAX_TEST_MATCH_COUNT,
    Math.max(1, Math.floor(parsed)),
  );
}

function getHybridCandidateCount(matchCount: number) {
  return Math.min(
    MAX_HYBRID_CANDIDATE_COUNT,
    Math.max(MIN_HYBRID_CANDIDATE_COUNT, matchCount * 4),
  );
}

async function getPreviewResults(
  query: string,
  matches: SemanticSongSearchMatch[],
  matchCount: number,
) {
  if (matches.length === 0) return [];

  const ids = matches.map((match) => match.songId);
  const { data, error } = await supabaseServer
    .from("songs")
    .select(
      "id, title, artist, genres, moods, regions, instruments, builds, vocals, instrumental, bpm, key, duration",
    )
    .in("id", ids);

  if (error) throw error;

  const ranked = rankHybridSongSearchResults(
    query,
    matches,
    (data ?? []) as HybridSearchSong[],
  ).slice(0, matchCount);

  return ranked.map((result, index) => ({
    rank: index + 1,
    similarity: Number(result.semanticSimilarity.toFixed(4)),
    semanticScore: Number(result.semanticScore.toFixed(4)),
    metadataScore: Number(result.metadataScore.toFixed(4)),
    lexicalScore: Number(result.lexicalScore.toFixed(4)),
    negativePenalty: Number(result.negativePenalty.toFixed(4)),
    hybridScore: Number(result.hybridScore.toFixed(4)),
    matchedConcepts: result.matchedConcepts,
    matchedMetadata: result.matchedMetadata,
    penaltyMetadata: result.penaltyMetadata,
    id: result.id,
    title: result.title,
    artist: result.artist,
    genres: result.genres,
    moods: result.moods,
    regions: result.regions,
    instruments: result.instruments,
    builds: result.builds,
    vocals: result.vocals,
    instrumental: result.instrumental,
    bpm: result.bpm,
    key: result.key,
    duration: result.duration,
  }));
}

async function requireSemanticSearchAdmin() {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return {
      admin: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
    };
  }

  return { admin, response: null };
}

export async function GET() {
  const access = await requireSemanticSearchAdmin();
  if (access.response) return access.response;

  try {
    const [
      stats,
      audioSimilarityStats,
      discogsSimilarityStats,
      rhythmProfileStats,
      harmonicProfileStats,
      meritEmbeddingStats,
    ] = await Promise.all([
      getSongSearchEmbeddingStats(),
      getSongClapEmbeddingStats(),
      getSongDiscogsEmbeddingStats(),
      getSongRhythmProfileStats(),
      getSongHarmonicProfileStats(),
      getSongMeritEmbeddingStats(),
    ]);

    return NextResponse.json({
      stats,
      model: SONG_SEARCH_EMBEDDING_MODEL,
      dimensions: SONG_SEARCH_EMBEDDING_DIMENSIONS,
      audioSimilarity: {
        stats: audioSimilarityStats,
        analysisModel: SONG_CLAP_MODEL_ID,
        embeddingModel: SONG_CLAP_MODEL_KEY,
        dimensions: SONG_CLAP_EMBEDDING_DIMENSIONS,
      },
      discogsSimilarity: {
        stats: discogsSimilarityStats,
        analysisModel: SONG_DISCOGS_MODEL_ID,
        embeddingModel: SONG_DISCOGS_MODEL_KEY,
        dimensions: SONG_DISCOGS_EMBEDDING_DIMENSIONS,
      },
      rhythmSimilarity: {
        stats: rhythmProfileStats,
        profileVersion: SONG_RHYTHM_PROFILE_VERSION,
      },
      harmonicSimilarity: {
        stats: harmonicProfileStats,
        profileVersion: SONG_HARMONIC_PROFILE_VERSION,
      },
      meritSimilarity: {
        stats: meritEmbeddingStats,
        analysisModel: SONG_MERIT_MODEL_ID,
        embeddingModel: SONG_MERIT_MODEL_KEY,
        dimensions: SONG_MERIT_EMBEDDING_DIMENSIONS,
      },
    });
  } catch (error) {
    console.error("Failed to load semantic search status:", error);
    return NextResponse.json(
      { error: "Failed to load semantic search status" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const access = await requireSemanticSearchAdmin();
  if (access.response) return access.response;

  try {
    const body = await request.json().catch(() => null);
    const payload =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};
    const action = typeof payload.action === "string" ? payload.action : "";


    if (action === "merit-backfill") {
      const updated = await ensurePublishedSongMeritEmbeddings(1);
      const stats = await getSongMeritEmbeddingStats();

      return NextResponse.json({
        action,
        updated,
        stats,
        analysisModel: SONG_MERIT_MODEL_ID,
        embeddingModel: SONG_MERIT_MODEL_KEY,
        dimensions: SONG_MERIT_EMBEDDING_DIMENSIONS,
      });
    }

    if (action === "merit-refresh") {
      const songId =
        typeof payload.songId === "string" ? payload.songId.trim() : "";

      if (!songId) {
        return NextResponse.json(
          { error: "songId is required" },
          { status: 400 },
        );
      }

      const updated = await refreshPublishedSongMeritEmbedding(songId);
      const stats = await getSongMeritEmbeddingStats();

      return NextResponse.json({ action, songId, updated, stats });
    }

    if (action === "harmonic-backfill") {
      const requestedBatchSize = Number(payload.batchSize);
      const batchSize = Number.isFinite(requestedBatchSize)
        ? Math.min(2, Math.max(1, Math.floor(requestedBatchSize)))
        : 1;
      const updated = await ensurePublishedSongHarmonicProfiles(batchSize);
      const stats = await getSongHarmonicProfileStats();

      return NextResponse.json({
        action,
        updated,
        stats,
        profileVersion: SONG_HARMONIC_PROFILE_VERSION,
      });
    }

    if (action === "harmonic-refresh") {
      const songId =
        typeof payload.songId === "string" ? payload.songId.trim() : "";

      if (!songId) {
        return NextResponse.json(
          { error: "songId is required" },
          { status: 400 },
        );
      }

      const updated = await refreshPublishedSongHarmonicProfile(songId);
      const stats = await getSongHarmonicProfileStats();

      return NextResponse.json({ action, songId, updated, stats });
    }

    if (action === "rhythm-backfill") {
      const requestedBatchSize = Number(payload.batchSize);
      const batchSize = Number.isFinite(requestedBatchSize)
        ? Math.min(2, Math.max(1, Math.floor(requestedBatchSize)))
        : 1;
      const updated = await ensurePublishedSongRhythmProfiles(batchSize);
      const stats = await getSongRhythmProfileStats();

      return NextResponse.json({
        action,
        updated,
        stats,
        profileVersion: SONG_RHYTHM_PROFILE_VERSION,
      });
    }

    if (action === "rhythm-refresh") {
      const songId =
        typeof payload.songId === "string" ? payload.songId.trim() : "";

      if (!songId) {
        return NextResponse.json(
          { error: "songId is required" },
          { status: 400 },
        );
      }

      const updated = await refreshPublishedSongRhythmProfile(songId);
      const stats = await getSongRhythmProfileStats();

      return NextResponse.json({ action, songId, updated, stats });
    }

    if (action === "discogs-backfill") {
      const requestedBatchSize = Number(payload.batchSize);
      const batchSize = Number.isFinite(requestedBatchSize)
        ? Math.min(2, Math.max(1, Math.floor(requestedBatchSize)))
        : 1;
      const updated = await ensurePublishedSongDiscogsEmbeddings(batchSize);
      const stats = await getSongDiscogsEmbeddingStats();

      return NextResponse.json({
        action,
        updated,
        stats,
        analysisModel: SONG_DISCOGS_MODEL_ID,
        embeddingModel: SONG_DISCOGS_MODEL_KEY,
        dimensions: SONG_DISCOGS_EMBEDDING_DIMENSIONS,
      });
    }

    if (action === "discogs-refresh") {
      const songId =
        typeof payload.songId === "string" ? payload.songId.trim() : "";

      if (!songId) {
        return NextResponse.json(
          { error: "songId is required" },
          { status: 400 },
        );
      }

      const updated = await refreshPublishedSongDiscogsEmbedding(songId);
      const stats = await getSongDiscogsEmbeddingStats();

      return NextResponse.json({ action, songId, updated, stats });
    }

    if (action === "audio-backfill") {
      const requestedBatchSize = Number(payload.batchSize);
      const batchSize = Number.isFinite(requestedBatchSize)
        ? Math.min(2, Math.max(1, Math.floor(requestedBatchSize)))
        : 1;
      const updated = await ensurePublishedSongClapEmbeddings(batchSize);
      const stats = await getSongClapEmbeddingStats();

      return NextResponse.json({
        action,
        updated,
        stats,
        analysisModel: SONG_CLAP_MODEL_ID,
        embeddingModel: SONG_CLAP_MODEL_KEY,
        dimensions: SONG_CLAP_EMBEDDING_DIMENSIONS,
      });
    }

    if (action === "audio-refresh") {
      const songId =
        typeof payload.songId === "string" ? payload.songId.trim() : "";

      if (!songId) {
        return NextResponse.json(
          { error: "songId is required" },
          { status: 400 },
        );
      }

      const updated = await refreshPublishedSongClapEmbedding(songId);
      const stats = await getSongClapEmbeddingStats();

      return NextResponse.json({ action, songId, updated, stats });
    }

    if (action === "backfill") {
      const result = await backfillPublishedSongSearchEmbeddings();
      const stats = await getSongSearchEmbeddingStats();

      return NextResponse.json({
        action,
        ...result,
        stats,
        model: SONG_SEARCH_EMBEDDING_MODEL,
        dimensions: SONG_SEARCH_EMBEDDING_DIMENSIONS,
      });
    }

    if (action === "refresh") {
      const songId =
        typeof payload.songId === "string" ? payload.songId.trim() : "";

      if (!songId) {
        return NextResponse.json(
          { error: "songId is required" },
          { status: 400 },
        );
      }

      const updated = await refreshPublishedSongSearchEmbedding(songId);
      const stats = await getSongSearchEmbeddingStats();

      return NextResponse.json({ action, songId, updated, stats });
    }

    if (action === "search") {
      const query =
        typeof payload.query === "string" ? payload.query.trim() : "";

      if (!query) {
        return NextResponse.json(
          { error: "query is required" },
          { status: 400 },
        );
      }

      if (query.length > MAX_QUERY_LENGTH) {
        return NextResponse.json(
          { error: `query must be ${MAX_QUERY_LENGTH} characters or fewer` },
          { status: 400 },
        );
      }

      const matchCount = clampMatchCount(payload.matchCount);
      const semanticCandidateCount = getHybridCandidateCount(matchCount);
      const updatedEmbeddings = await ensurePublishedSongSearchEmbeddings();
      const matches = await searchPublishedSongsSemantically(query, {
        matchCount: semanticCandidateCount,
        minSimilarity: -1,
      });
      const results = await getPreviewResults(query, matches, matchCount);

      return NextResponse.json({
        action,
        query,
        updatedEmbeddings,
        semanticCandidates: matches.length,
        results,
        ranking: "hybrid-v1",
        model: SONG_SEARCH_EMBEDDING_MODEL,
        dimensions: SONG_SEARCH_EMBEDDING_DIMENSIONS,
      });
    }

    return NextResponse.json(
      { error: "action must be merit-backfill, merit-refresh, harmonic-backfill, harmonic-refresh, rhythm-backfill, rhythm-refresh, discogs-backfill, discogs-refresh, audio-backfill, audio-refresh, backfill, refresh, or search" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Semantic search admin action failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Semantic search admin action failed",
      },
      { status: 500 },
    );
  }
}
