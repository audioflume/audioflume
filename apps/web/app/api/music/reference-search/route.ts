import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { searchPublishedSongsByAudioSimilarity } from "@/lib/audioSemanticEmbeddings";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_RESULT_COUNT = 200;

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
  semanticSimilarity,
  tempoSimilarity,
  genreSimilarity,
}: {
  semanticSimilarity: number;
  tempoSimilarity: number | null;
  genreSimilarity: number | null;
}) {
  const signals = [
    { score: semanticSimilarity, weight: 0.95 },
    ...(tempoSimilarity === null
      ? []
      : [{ score: tempoSimilarity, weight: 0.03 }]),
    ...(genreSimilarity === null
      ? []
      : [{ score: genreSimilarity, weight: 0.02 }]),
  ];

  const totalWeight = signals.reduce(
    (sum, signal) => sum + signal.weight,
    0,
  );
  const score = signals.reduce(
    (sum, signal) => sum + signal.score * signal.weight,
    0,
  );

  return totalWeight > 0 ? score / totalWeight : semanticSimilarity;
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
    const audioSearch = await searchPublishedSongsByAudioSimilarity(
      profile.previewUrl,
      {
        matchCount: MAX_RESULT_COUNT,
        minSimilarity: -1,
      },
    );

    const ids = audioSearch.matches.map((result) => result.songId);
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
    const referenceBpm = Number(profile.track.bpm ?? 0) || null;

    const matches = audioSearch.matches
      .map((result) => {
        const song = songsById.get(result.songId);
        const tempoSimilarity = getTempoSimilarity(
          referenceBpm,
          Number(song?.bpm ?? 0) || null,
        );
        const genreSimilarity = getGenreSimilarity(
          profile.genres,
          song?.genres ?? null,
        );

        return {
          songId: result.songId,
          score: scoreMatch({
            semanticSimilarity: result.similarity,
            tempoSimilarity,
            genreSimilarity,
          }),
          semanticSimilarity: result.similarity,
          tempoSimilarity,
          genreSimilarity,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULT_COUNT)
      .map((result) => ({
        songId: result.songId,
        score: Number(result.score.toFixed(6)),
        audioSimilarity: Number(result.semanticSimilarity.toFixed(6)),
        tempoSimilarity:
          result.tempoSimilarity === null
            ? null
            : Number(result.tempoSimilarity.toFixed(6)),
        genreSimilarity: result.genreSimilarity,
      }));

    return NextResponse.json(
      {
        matches,
        ranking: "audio-semantic-v2",
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
