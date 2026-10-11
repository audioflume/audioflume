import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;
const DEEZER_SEARCH_LIMIT = 25;
const RESULT_LIMIT = 8;
const CACHE_TTL_MS = 5 * 60 * 1000;

type DeezerArtist = {
  id?: number;
  name?: string;
  link?: string;
  picture_medium?: string;
};

type DeezerAlbum = {
  id?: number;
  title?: string;
  cover_medium?: string;
};

type DeezerTrack = {
  id?: number;
  title?: string;
  title_short?: string;
  title_version?: string;
  link?: string;
  duration?: number;
  rank?: number;
  artist?: DeezerArtist;
  album?: DeezerAlbum;
};

type DeezerSearchResponse = {
  data?: DeezerTrack[];
};

type ReferenceCatalogResult = {
  id: string;
  kind: "track" | "artist";
  name: string;
  artist: string;
  secondary: string;
  imageUrl: string | null;
  imageUrls: string[];
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

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTrackName(track: DeezerTrack) {
  return track.title_short?.trim() || track.title?.trim() || "";
}

function getTrackResult(track: DeezerTrack): ReferenceCatalogResult | null {
  const id = track.id;
  const name = getTrackName(track);
  const artist = track.artist?.name?.trim() ?? "";

  if (!id || !name || !artist) return null;

  const imageUrl = track.album?.cover_medium?.trim() || null;

  return {
    id: `deezer:track:${id}`,
    kind: "track",
    name,
    artist,
    secondary: track.album?.title?.trim() || "Track",
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
    externalUrl: track.link?.trim() || null,
    searchQuery: `${name} by ${artist}`,
  };
}

function getArtistResult(artist: DeezerArtist): ReferenceCatalogResult | null {
  const id = artist.id;
  const name = artist.name?.trim();

  if (!id || !name) return null;

  const imageUrl = artist.picture_medium?.trim() || null;

  return {
    id: `deezer:artist:${id}`,
    kind: "artist",
    name,
    artist: "",
    secondary: "Artist",
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
    externalUrl: artist.link?.trim() || null,
    searchQuery: name,
  };
}

function findExactArtist(query: string, tracks: DeezerTrack[]) {
  const normalizedQuery = normalize(query);

  for (const track of tracks) {
    const artist = track.artist;
    const name = artist?.name?.trim() ?? "";

    if (artist?.id && normalize(name) === normalizedQuery) {
      return artist;
    }
  }

  return null;
}

function rankTracks(
  query: string,
  tracks: DeezerTrack[],
  exactArtist: DeezerArtist | null,
) {
  const normalizedQuery = normalize(query);
  const exactArtistName = normalize(exactArtist?.name ?? "");

  return [...tracks].sort((a, b) => {
    const aArtist = normalize(a.artist?.name ?? "");
    const bArtist = normalize(b.artist?.name ?? "");
    const aTitle = normalize(getTrackName(a));
    const bTitle = normalize(getTrackName(b));

    const aArtistExact = exactArtistName && aArtist === exactArtistName ? 1 : 0;
    const bArtistExact = exactArtistName && bArtist === exactArtistName ? 1 : 0;

    if (aArtistExact !== bArtistExact) {
      return bArtistExact - aArtistExact;
    }

    const aTitleExact = aTitle === normalizedQuery ? 1 : 0;
    const bTitleExact = bTitle === normalizedQuery ? 1 : 0;

    if (aTitleExact !== bTitleExact) {
      return bTitleExact - aTitleExact;
    }

    return Number(b.rank ?? 0) - Number(a.rank ?? 0);
  });
}

function dedupeTracks(tracks: DeezerTrack[]) {
  const seen = new Set<string>();

  return tracks.filter((track) => {
    const title = normalize(getTrackName(track));
    const artist = normalize(track.artist?.name ?? "");
    const key = `${title}::${artist}`;

    if (!title || !artist || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

async function searchDeezer(query: string) {
  const normalizedQuery = normalize(query);
  const cached = resultCache.get(normalizedQuery);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const searchUrl = new URL("https://api.deezer.com/search");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", String(DEEZER_SEARCH_LIMIT));

  const response = await fetch(searchUrl, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Deezer search failed with ${response.status}`);
  }

  const data = (await response.json()) as DeezerSearchResponse;
  const tracks = Array.isArray(data.data) ? data.data : [];
  const exactArtist = findExactArtist(query, tracks);
  const rankedTracks = dedupeTracks(rankTracks(query, tracks, exactArtist));

  const trackResults = rankedTracks.flatMap((track) => {
    const result = getTrackResult(track);
    return result ? [result] : [];
  });

  const artistResult = exactArtist ? getArtistResult(exactArtist) : null;
  const results = artistResult
    ? [artistResult, ...trackResults.slice(0, RESULT_LIMIT - 1)]
    : trackResults.slice(0, RESULT_LIMIT);

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

    const results = await searchDeezer(query);

    return NextResponse.json(
      {
        configured: true,
        provider: "deezer",
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
