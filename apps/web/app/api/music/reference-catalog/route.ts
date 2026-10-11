import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;
const MUSICBRAINZ_SEARCH_LIMIT = 8;
const MUSICBRAINZ_REQUEST_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 5 * 60 * 1000;

type MusicBrainzArtist = {
  id?: string;
  name?: string;
  score?: number;
};

type MusicBrainzArtistCredit = {
  name?: string;
  joinphrase?: string;
  artist?: MusicBrainzArtist;
};

type MusicBrainzRelease = {
  title?: string;
};

type MusicBrainzRecording = {
  id?: string;
  title?: string;
  length?: number;
  score?: number;
  "artist-credit"?: MusicBrainzArtistCredit[];
  releases?: MusicBrainzRelease[];
};

type MusicBrainzArtistSearchResponse = {
  artists?: MusicBrainzArtist[];
};

type MusicBrainzRecordingSearchResponse = {
  recordings?: MusicBrainzRecording[];
};

type ReferenceCatalogResult = {
  id: string;
  kind: "track" | "artist";
  name: string;
  artist: string;
  secondary: string;
  imageUrl: string | null;
  externalUrl: string | null;
  searchQuery: string;
};

const resultCache = new Map<
  string,
  {
    expiresAt: number;
    results: ReferenceCatalogResult[];
  }
>();

let nextMusicBrainzRequestAt = 0;

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getArtistLabel(credits: MusicBrainzArtistCredit[] | undefined) {
  return (credits ?? [])
    .map((credit) => {
      const name = credit.name?.trim() || credit.artist?.name?.trim() || "";
      return `${name}${credit.joinphrase ?? ""}`;
    })
    .join("")
    .trim();
}

function getTrackResult(recording: MusicBrainzRecording) {
  const id = recording.id?.trim();
  const name = recording.title?.trim();
  const artist = getArtistLabel(recording["artist-credit"]);

  if (!id || !name || !artist) return null;

  const releaseTitle = recording.releases?.find(
    (release) => typeof release.title === "string" && release.title.trim(),
  )?.title?.trim();

  return {
    id: `musicbrainz:recording:${id}`,
    kind: "track" as const,
    name,
    artist,
    secondary: releaseTitle || "Track",
    imageUrl: null,
    externalUrl: `https://musicbrainz.org/recording/${id}`,
    searchQuery: `${name} by ${artist}`,
  };
}

function getArtistResult(artist: MusicBrainzArtist) {
  const id = artist.id?.trim();
  const name = artist.name?.trim();

  if (!id || !name) return null;

  return {
    id: `musicbrainz:artist:${id}`,
    kind: "artist" as const,
    name,
    artist: "",
    secondary: "Artist",
    imageUrl: null,
    externalUrl: `https://musicbrainz.org/artist/${id}`,
    searchQuery: name,
  };
}

async function waitForMusicBrainzSlot() {
  const now = Date.now();
  const requestAt = Math.max(now, nextMusicBrainzRequestAt);
  nextMusicBrainzRequestAt = requestAt + MUSICBRAINZ_REQUEST_INTERVAL_MS;

  if (requestAt > now) {
    await new Promise((resolve) => {
      setTimeout(resolve, requestAt - now);
    });
  }
}

async function fetchMusicBrainz<T>(url: URL) {
  await waitForMusicBrainzSlot();

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Audioflume/1.0 (https://audioflume.com)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz search failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function findExactArtist(query: string) {
  const searchUrl = new URL("https://musicbrainz.org/ws/2/artist");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("fmt", "json");
  searchUrl.searchParams.set("limit", "5");

  const data = await fetchMusicBrainz<MusicBrainzArtistSearchResponse>(searchUrl);
  const normalizedQuery = normalize(query);

  return (
    (data.artists ?? []).find(
      (artist) => normalize(artist.name ?? "") === normalizedQuery,
    ) ?? null
  );
}

async function searchRecordings(query: string, artistId?: string) {
  const searchUrl = new URL("https://musicbrainz.org/ws/2/recording");
  searchUrl.searchParams.set(
    "query",
    artistId ? `arid:${artistId}` : query,
  );
  searchUrl.searchParams.set("fmt", "json");
  searchUrl.searchParams.set("limit", String(MUSICBRAINZ_SEARCH_LIMIT));

  const data =
    await fetchMusicBrainz<MusicBrainzRecordingSearchResponse>(searchUrl);

  return data.recordings ?? [];
}

async function searchMusicBrainz(query: string) {
  const normalizedQuery = normalize(query);
  const cached = resultCache.get(normalizedQuery);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const matchedArtist = await findExactArtist(query);
  const recordings = await searchRecordings(query, matchedArtist?.id);

  const tracks = recordings.flatMap((recording) => {
    const result = getTrackResult(recording);
    return result ? [result] : [];
  });

  const artistResult = matchedArtist ? getArtistResult(matchedArtist) : null;
  const results = artistResult
    ? [artistResult, ...tracks.slice(0, 7)]
    : tracks.slice(0, 8);

  resultCache.set(normalizedQuery, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    results,
  });

  return results;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim();

    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        {
          configured: true,
          results: [],
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }

    const results = await searchMusicBrainz(query);

    return NextResponse.json(
      {
        configured: true,
        provider: "musicbrainz",
        results,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Reference catalog search failed:", error);

    return NextResponse.json(
      {
        configured: true,
        results: [],
        error: "Reference catalog search is temporarily unavailable",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }
}
