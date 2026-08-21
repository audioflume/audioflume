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

  return rankHybridSongSearchResults(
    query,
    matches,
    (data ?? []) as HybridSearchSong[],
  )
    .slice(0, MAX_RESULT_COUNT)
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
