import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;
const SPOTIFY_SEARCH_LIMIT = 5;
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

type SpotifyImage = {
  url?: string;
};

type SpotifyArtistSummary = {
  id?: string;
  name?: string;
  external_urls?: {
    spotify?: string;
  };
  images?: SpotifyImage[];
};

type SpotifyTrackSummary = {
  id?: string;
  name?: string;
  artists?: Array<{ name?: string }>;
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
  external_urls?: {
    spotify?: string;
  };
};

type SpotifySearchResponse = {
  tracks?: {
    items?: SpotifyTrackSummary[];
  };
  artists?: {
    items?: SpotifyArtistSummary[];
  };
};

let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;

function getSpotifyCredentials() {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? "",
  };
}

async function getSpotifyAccessToken() {
  const now = Date.now();

  if (
    cachedAccessToken &&
    cachedAccessTokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS > now
  ) {
    return cachedAccessToken;
  }

  const { clientId, clientSecret } = getSpotifyCredentials();

  if (!clientId || !clientSecret) {
    return null;
  }

  const encodedCredentials = Buffer.from(
    `${clientId}:${clientSecret}`,
  ).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedCredentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("Spotify token response did not include an access token");
  }

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt =
    now + Math.max(60, Number(data.expires_in) || 3600) * 1000;

  return cachedAccessToken;
}

function getArtwork(images: SpotifyImage[] | undefined) {
  return images?.find((image) => typeof image.url === "string")?.url ?? null;
}

function mapTrack(track: SpotifyTrackSummary) {
  const id = track.id?.trim();
  const name = track.name?.trim();
  const artists = (track.artists ?? [])
    .map((artist) => artist.name?.trim() ?? "")
    .filter(Boolean);

  if (!id || !name || artists.length === 0) return null;

  const artistLabel = artists.join(", ");

  return {
    id: `spotify:track:${id}`,
    kind: "track" as const,
    name,
    artist: artistLabel,
    secondary: track.album?.name?.trim() || "Track",
    imageUrl: getArtwork(track.album?.images),
    externalUrl: track.external_urls?.spotify ?? null,
    searchQuery: `${name} by ${artistLabel}`,
  };
}

function mapArtist(artist: SpotifyArtistSummary) {
  const id = artist.id?.trim();
  const name = artist.name?.trim();

  if (!id || !name) return null;

  return {
    id: `spotify:artist:${id}`,
    kind: "artist" as const,
    name,
    artist: "",
    secondary: "Artist",
    imageUrl: getArtwork(artist.images),
    externalUrl: artist.external_urls?.spotify ?? null,
    searchQuery: name,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim();
    const { clientId, clientSecret } = getSpotifyCredentials();

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          configured: false,
          results: [],
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

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

    const accessToken = await getSpotifyAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          configured: false,
          results: [],
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "track,artist");
    searchUrl.searchParams.set("limit", String(SPOTIFY_SEARCH_LIMIT));

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Spotify search failed with ${response.status}`);
    }

    const data = (await response.json()) as SpotifySearchResponse;
    const tracks = (data.tracks?.items ?? []).flatMap((track) => {
      const result = mapTrack(track);
      return result ? [result] : [];
    });
    const artists = (data.artists?.items ?? []).flatMap((artist) => {
      const result = mapArtist(artist);
      return result ? [result] : [];
    });

    return NextResponse.json(
      {
        configured: true,
        results: [...tracks, ...artists],
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
