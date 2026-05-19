import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSongs } from "@/lib/songs";
import { songHasIssue } from "@/lib/songHealth";

export const runtime = "nodejs";
export const maxDuration = 300;

type BatchAnalyzeResult = {
  songId: string;
  title: string;
  status: "saved" | "skipped" | "failed";
  saved?: number;
  error?: string;
};

function getSingleSongId(req: Request) {
  const url = new URL(req.url);
  const value = url.searchParams.get("songId");
  return value?.trim() || null;
}

async function analyzeSong({
  song,
  analyzerUrl,
  analyzerSecret,
}: {
  song: Awaited<ReturnType<typeof getSongs>>[number];
  analyzerUrl: string;
  analyzerSecret: string;
}): Promise<BatchAnalyzeResult> {
  if (!song.audioUrl) {
    return {
      songId: song.id,
      title: song.title,
      status: "skipped",
      error: "Missing audio URL",
    };
  }

  try {
    const response = await fetch(`${analyzerUrl.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-analyzer-secret": analyzerSecret,
      },
      body: JSON.stringify({
        songId: song.id,
        audioUrl: song.audioUrl,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        songId: song.id,
        title: song.title,
        status: "failed",
        error:
          data?.error ||
          data?.detail ||
          `Analyzer failed with status ${response.status}`,
      };
    }

    return {
      songId: song.id,
      title: song.title,
      status: "saved",
      saved: Number(data?.saved ?? 0),
    };
  } catch (err) {
    return {
      songId: song.id,
      title: song.title,
      status: "failed",
      error: err instanceof Error ? err.message : "Analyzer failed",
    };
  }
}

export async function POST(req: Request) {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analyzerUrl = process.env.AUDIO_ANALYZER_URL;
  const analyzerSecret = process.env.AUDIO_ANALYZER_SECRET;

  if (!analyzerUrl || !analyzerSecret) {
    return NextResponse.json(
      { error: "Missing analyzer environment variables." },
      { status: 500 },
    );
  }

  try {
    const songs = await getSongs();
    const missingEditPointSongs = songs.filter((song) =>
      songHasIssue(song, "editPoints"),
    );
    const singleSongId = getSingleSongId(req);

    if (singleSongId) {
      const song = missingEditPointSongs.find((item) => item.id === singleSongId);

      if (!song) {
        return NextResponse.json({
          totalMissing: missingEditPointSongs.length,
          analyzed: 0,
          skipped: 1,
          failed: 0,
          results: [
            {
              songId: singleSongId,
              title: "Unknown song",
              status: "skipped",
              error: "Song is no longer missing edit points.",
            },
          ],
        });
      }

      const result = await analyzeSong({ song, analyzerUrl, analyzerSecret });

      return NextResponse.json({
        totalMissing: missingEditPointSongs.length,
        analyzed: result.status === "saved" ? 1 : 0,
        skipped: result.status === "skipped" ? 1 : 0,
        failed: result.status === "failed" ? 1 : 0,
        results: [result],
      });
    }

    const results: BatchAnalyzeResult[] = [];

    for (const song of missingEditPointSongs) {
      results.push(await analyzeSong({ song, analyzerUrl, analyzerSecret }));
    }

    const analyzed = results.filter((result) => result.status === "saved").length;
    const skipped = results.filter((result) => result.status === "skipped").length;
    const failed = results.filter((result) => result.status === "failed").length;

    return NextResponse.json({
      totalMissing: missingEditPointSongs.length,
      analyzed,
      skipped,
      failed,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to batch analyze edit points.",
      },
      { status: 500 },
    );
  }
}
