import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  analyzeAudioUrl,
  compareAudioFeatures,
  type AudioSimilarityFeatures,
} from "@/lib/audioSimilarity";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_RESULT_COUNT = 200;
const ANALYSIS_CONCURRENCY = 4;

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

type ReferenceCandidateSong = {
  id: string;
  playback_url: string | null;
  audio_url: string | null;
  bpm: number | null;
  genres: string[] | null;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTrackName(track: DeezerTrack) {
  return track.title_short?.trim() || track.title?.trim() || "";
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

function scoreCandidate({
  referenceFeatures,
  candidateFeatures,
  referenceBpm,
  candidateBpm,
  referenceGenres,
  candidateGenres,
}: {
  referenceFeatures: AudioSimilarityFeatures;
  candidateFeatures: AudioSimilarityFeatures;
  referenceBpm: number | null;
  candidateBpm: number | null;
  referenceGenres: string[];
  candidateGenres: string[] | null;
}) {
  const audioScore = compareAudioFeatures(referenceFeatures, candidateFeatures, {
    referenceBpm,
    candidateBpm,
  });
  const genreScore = getGenreSimilarity(referenceGenres, candidateGenres);

  if (genreScore === null) {
    return {
      score: audioScore,
      audioScore,
      genreScore: null,
    };
  }

  return {
    score: audioScore * 0.95 + genreScore * 0.05,
    audioScore,
    genreScore,
  };
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
    const referenceFeatures = await analyzeAudioUrl(profile.previewUrl);

    const { data, error } = await supabaseServer
      .from("songs")
      .select("id, playback_url, audio_url, bpm, genres")
      .eq("status", "published");

    if (error) throw error;

    const candidateSongs = ((data ?? []) as ReferenceCandidateSong[]).filter(
      (song) => Boolean(song.playback_url?.trim() || song.audio_url?.trim()),
    );

    const analyzed = await mapWithConcurrency(
      candidateSongs,
      ANALYSIS_CONCURRENCY,
      async (song) => {
        const sourceUrl =
          song.playback_url?.trim() || song.audio_url?.trim() || "";

        try {
          const candidateFeatures = await analyzeAudioUrl(sourceUrl);
          const scored = scoreCandidate({
            referenceFeatures,
            candidateFeatures,
            referenceBpm: Number(profile.track.bpm ?? 0) || null,
            candidateBpm: Number(song.bpm ?? 0) || null,
            referenceGenres: profile.genres,
            candidateGenres: song.genres,
          });

          return {
            songId: song.id,
            ...scored,
          };
        } catch (candidateError) {
          console.warn(
            `Reference audio analysis skipped song ${song.id}:`,
            candidateError,
          );
          return null;
        }
      },
    );

    const matches = analyzed
      .filter(
        (
          result,
        ): result is {
          songId: string;
          score: number;
          audioScore: number;
          genreScore: number | null;
        } => result !== null,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULT_COUNT)
      .map((result) => ({
        songId: result.songId,
        score: Number(result.score.toFixed(6)),
        audioSimilarity: Number(result.audioScore.toFixed(6)),
        genreSimilarity: result.genreScore,
      }));

    return NextResponse.json(
      {
        matches,
        ranking: "audio-similarity-v1",
        reference: {
          id: referenceId,
          title: getTrackName(profile.track),
          artist: profile.track.artist?.name?.trim() ?? "",
          bpm: Number(profile.track.bpm ?? 0) || referenceFeatures.estimatedBpm,
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
