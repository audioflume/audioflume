import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
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
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_QUERY_LENGTH = 500;
const DEFAULT_TEST_MATCH_COUNT = 25;
const MAX_TEST_MATCH_COUNT = 100;

type SongSearchPreview = {
  id: string;
  title: string | null;
  artist: string | null;
  genres: string[] | null;
  moods: string[] | null;
  regions: string[] | null;
  instruments: string[] | null;
  builds: string[] | null;
  vocals: string[] | null;
  instrumental: boolean | null;
  bpm: number | null;
  key: string | null;
  duration: number | null;
};

function clampMatchCount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TEST_MATCH_COUNT;
  return Math.min(
    MAX_TEST_MATCH_COUNT,
    Math.max(1, Math.floor(parsed)),
  );
}

async function getPreviewResults(matches: SemanticSongSearchMatch[]) {
  if (matches.length === 0) return [];

  const ids = matches.map((match) => match.songId);
  const { data, error } = await supabaseServer
    .from("songs")
    .select(
      "id, title, artist, genres, moods, regions, instruments, builds, vocals, instrumental, bpm, key, duration",
    )
    .in("id", ids);

  if (error) throw error;

  const songsById = new Map(
    ((data ?? []) as SongSearchPreview[]).map((song) => [song.id, song]),
  );

  return matches.flatMap((match, index) => {
    const song = songsById.get(match.songId);
    if (!song) return [];

    return [
      {
        rank: index + 1,
        similarity: Number(match.similarity.toFixed(4)),
        ...song,
      },
    ];
  });
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
    const stats = await getSongSearchEmbeddingStats();

    return NextResponse.json({
      stats,
      model: SONG_SEARCH_EMBEDDING_MODEL,
      dimensions: SONG_SEARCH_EMBEDDING_DIMENSIONS,
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

      const updatedEmbeddings = await ensurePublishedSongSearchEmbeddings();
      const matches = await searchPublishedSongsSemantically(query, {
        matchCount: clampMatchCount(payload.matchCount),
        minSimilarity: -1,
      });
      const results = await getPreviewResults(matches);

      return NextResponse.json({
        action,
        query,
        updatedEmbeddings,
        results,
        model: SONG_SEARCH_EMBEDDING_MODEL,
        dimensions: SONG_SEARCH_EMBEDDING_DIMENSIONS,
      });
    }

    return NextResponse.json(
      { error: "action must be backfill, refresh, or search" },
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
