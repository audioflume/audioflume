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

export async function POST() {
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

    const results: BatchAnalyzeResult[] = [];

    for (const song of missingEditPointSongs) {
      if (!song.audioUrl) {
        results.push({
          songId: song.id,
          title: song.title,
          status: "skipped",
          error: "Missing audio URL",
        });
        continue;
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
          results.push({
            songId: song.id,
            title: song.title,
            status: "failed",
            error:
              data?.error ||
              data?.detail ||
              `Analyzer failed with status ${response.status}`,
          });
          continue;
        }

        results.push({
          songId: song.id,
          title: song.title,
          status: "saved",
          saved: Number(data?.saved ?? 0),
        });
      } catch (err) {
        results.push({
          songId: song.id,
          title: song.title,
          status: "failed",
          error: err instanceof Error ? err.message : "Analyzer failed",
        });
      }
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
