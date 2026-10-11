import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  ensurePublishedSongSearchEmbeddings,
  searchPublishedSongsSemantically,
  type SemanticSongSearchMatch,
} from "@/lib/songEmbeddings";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_RESULT_COUNT = 200;
const MAX_RELATED_TRACKS = 12;

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
  gain?: number;
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

type DeezerRadioResponse = {
  data?: DeezerTrack[];
};

type ReferenceCandidateSong = {
  id: string;
  genres: string[] | null;
  moods: string[] | null;
  instruments: string[] | null;
  builds: string[] | null;
  vocals: string[] | null;
  instrumental: boolean | null;
  bpm: number | null;
  key: string | null;
  duration: number | null;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

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

  const albumId = Number(track.album?.id ?? 0);

  const [album, radio] = await Promise.all([
    albumId
      ? fetchDeezerJson<DeezerAlbum>(
          `https://api.deezer.com/album/${albumId}`,
        ).catch(() => null)
      : Promise.resolve(null),
    fetchDeezerJson<DeezerRadioResponse>(
      `https://api.deezer.com/track/${trackId}/radio?limit=${MAX_RELATED_TRACKS}`,
    ).catch(() => null),
  ]);

  const genres = (album?.genres?.data ?? [])
    .map((genre) => genre.name?.trim() ?? "")
    .filter(Boolean);

  const relatedTracks = (radio?.data ?? [])
    .map((related) => ({
      title: getTrackName(related),
      artist: related.artist?.name?.trim() ?? "",
    }))
    .filter((related) => related.title && related.artist)
    .slice(0, MAX_RELATED_TRACKS);

  return {
    track,
    genres,
    relatedTracks,
  };
}

function buildReferenceSearchText(profile: Awaited<ReturnType<typeof getReferenceProfile>>) {
  const trackName = getTrackName(profile.track);
  const artist = profile.track.artist?.name?.trim() ?? "";
  const album = profile.track.album?.title?.trim() ?? "";
  const bpm = Number(profile.track.bpm ?? 0);

  const parts = [
    `Reference song: ${trackName} by ${artist}.`,
    album ? `Album: ${album}.` : "",
    profile.genres.length > 0
      ? `Genres: ${profile.genres.join(", ")}.`
      : "",
    bpm > 0 ? `Tempo: ${Math.round(bpm)} BPM.` : "",
    profile.relatedTracks.length > 0
      ? `Sonically related tracks and artists: ${profile.relatedTracks
          .map((track) => `${track.title} by ${track.artist}`)
          .join("; ")}.`
      : "",
    "Find production music with a similar musical character, pacing, instrumentation, mood, and overall sonic feel.",
  ];

  return parts.filter(Boolean).join(" ");
}

function getBpmSimilarity(referenceBpm: number, candidateBpm: number | null) {
  if (!referenceBpm || !candidateBpm) return null;

  const distances = [
    Math.abs(referenceBpm - candidateBpm),
    Math.abs(referenceBpm * 2 - candidateBpm),
    Math.abs(referenceBpm - candidateBpm * 2),
  ];

  const distance = Math.min(...distances);
  return clamp01(1 - distance / 24);
}

function getDurationSimilarity(
  referenceDuration: number,
  candidateDuration: number | null,
) {
  if (!referenceDuration || !candidateDuration) return null;

  return clamp01(1 - Math.abs(referenceDuration - candidateDuration) / 150);
}

function getGenreSimilarity(
  referenceGenres: string[],
  candidateGenres: string[] | null,
) {
  if (referenceGenres.length === 0 || !candidateGenres?.length) return null;

  const reference = referenceGenres.map(normalize).filter(Boolean);
  const candidate = candidateGenres.map(normalize).filter(Boolean);

  if (reference.length === 0 || candidate.length === 0) return null;

  const matched = reference.some((referenceGenre) =>
    candidate.some(
      (candidateGenre) =>
        candidateGenre === referenceGenre ||
        candidateGenre.includes(referenceGenre) ||
        referenceGenre.includes(candidateGenre),
    ),
  );

  return matched ? 1 : 0;
}

function scoreCandidate(
  match: SemanticSongSearchMatch,
  song: ReferenceCandidateSong,
  reference: {
    bpm: number;
    duration: number;
    genres: string[];
  },
) {
  const semanticScore = clamp01(match.similarity);
  const bpmScore = getBpmSimilarity(reference.bpm, song.bpm);
  const durationScore = getDurationSimilarity(reference.duration, song.duration);
  const genreScore = getGenreSimilarity(reference.genres, song.genres);

  const weightedSignals = [
    { score: semanticScore, weight: 0.68 },
    ...(bpmScore === null ? [] : [{ score: bpmScore, weight: 0.22 }]),
    ...(genreScore === null ? [] : [{ score: genreScore, weight: 0.07 }]),
    ...(durationScore === null
      ? []
      : [{ score: durationScore, weight: 0.03 }]),
  ];

  const weightTotal = weightedSignals.reduce(
    (total, signal) => total + signal.weight,
    0,
  );
  const total = weightedSignals.reduce(
    (sum, signal) => sum + signal.score * signal.weight,
    0,
  );

  return {
    songId: song.id,
    score: weightTotal > 0 ? total / weightTotal : semanticScore,
    semanticSimilarity: match.similarity,
    bpmSimilarity: bpmScore,
    genreSimilarity: genreScore,
    durationSimilarity: durationScore,
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
    const searchText = buildReferenceSearchText(profile);

    await ensurePublishedSongSearchEmbeddings();

    const semanticMatches = await searchPublishedSongsSemantically(searchText, {
      matchCount: MAX_RESULT_COUNT,
      minSimilarity: -1,
    });

    if (semanticMatches.length === 0) {
      return NextResponse.json({
        matches: [],
        reference: {
          id: referenceId,
          title: getTrackName(profile.track),
          artist: profile.track.artist?.name?.trim() ?? "",
          bpm: Number(profile.track.bpm ?? 0) || null,
          duration: Number(profile.track.duration ?? 0) || null,
          genres: profile.genres,
        },
      });
    }

    const ids = semanticMatches.map((semanticMatch) => semanticMatch.songId);
    const { data, error } = await supabaseServer
      .from("songs")
      .select(
        "id, genres, moods, instruments, builds, vocals, instrumental, bpm, key, duration",
      )
      .in("id", ids);

    if (error) throw error;

    const songsById = new Map(
      ((data ?? []) as ReferenceCandidateSong[]).map((song) => [song.id, song]),
    );

    const reference = {
      bpm: Number(profile.track.bpm ?? 0),
      duration: Number(profile.track.duration ?? 0),
      genres: profile.genres,
    };

    const matches = semanticMatches
      .flatMap((semanticMatch) => {
        const song = songsById.get(semanticMatch.songId);
        if (!song) return [];

        return [scoreCandidate(semanticMatch, song, reference)];
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULT_COUNT)
      .map((result) => ({
        songId: result.songId,
        score: Number(result.score.toFixed(6)),
        similarity: Number(result.semanticSimilarity.toFixed(6)),
        bpmSimilarity:
          result.bpmSimilarity === null
            ? null
            : Number(result.bpmSimilarity.toFixed(6)),
        genreSimilarity: result.genreSimilarity,
        durationSimilarity:
          result.durationSimilarity === null
            ? null
            : Number(result.durationSimilarity.toFixed(6)),
      }));

    return NextResponse.json(
      {
        matches,
        ranking: "reference-v1",
        reference: {
          id: referenceId,
          title: getTrackName(profile.track),
          artist: profile.track.artist?.name?.trim() ?? "",
          bpm: reference.bpm || null,
          duration: reference.duration || null,
          genres: reference.genres,
          relatedTracks: profile.relatedTracks,
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
      { error: "Reference search is temporarily unavailable" },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }
}
