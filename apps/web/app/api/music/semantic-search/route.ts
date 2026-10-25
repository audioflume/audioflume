import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  ensurePublishedSongSearchEmbeddings,
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
const MAX_RESULT_COUNT = 200;
const MAX_RETURNED_RESULTS = 40;
const MIN_HYBRID_MATCH_SCORE = 0.3;
const MAX_HYBRID_SCORE_DROP = 0.12;

async function getHybridMatches(
  query: string,
  matches: SemanticSongSearchMatch[],
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
  );

  const bestScore = ranked[0]?.hybridScore ?? 0;
  if (bestScore < MIN_HYBRID_MATCH_SCORE) return [];

  const minimumScore = Math.max(
    MIN_HYBRID_MATCH_SCORE,
    bestScore - MAX_HYBRID_SCORE_DROP,
  );

  return ranked
    .filter((result) => result.hybridScore >= minimumScore)
    .slice(0, MAX_RETURNED_RESULTS)
    .map((result) => ({
      songId: result.id,
      score: Number(result.hybridScore.toFixed(6)),
      similarity: Number(result.semanticSimilarity.toFixed(6)),
    }));
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
    const query =
      body && typeof body === "object" && typeof body.query === "string"
        ? body.query.trim()
        : "";

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 },
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }

    const updatedEmbeddings = await ensurePublishedSongSearchEmbeddings();
    const semanticMatches = await searchPublishedSongsSemantically(query, {
      matchCount: MAX_RESULT_COUNT,
      minSimilarity: -1,
    });
    const matches = await getHybridMatches(query, semanticMatches);

    return NextResponse.json(
      {
        matches,
        updatedEmbeddings,
        ranking: "hybrid-v1",
        model: SONG_SEARCH_EMBEDDING_MODEL,
        dimensions: SONG_SEARCH_EMBEDDING_DIMENSIONS,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Semantic music search failed:", error);

    return NextResponse.json(
      { error: "Semantic search is temporarily unavailable" },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }
}
