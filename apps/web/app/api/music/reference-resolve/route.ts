import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SpotifyOEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

type DeezerArtist = {
  id?: number;
  name?: string;
};

type DeezerAlbum = {
  title?: string;
  cover_medium?: string;
};

type DeezerTrack = {
  id?: number;
  title?: string;
  title_short?: string;
  link?: string;
  artist?: DeezerArtist;
  album?: DeezerAlbum;
};

type DeezerSearchResponse = {
  data?: DeezerTrack[];
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

function isSpotifyTrackUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname === "open.spotify.com" &&
      /^\/track\/[A-Za-z0-9]+/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

async function resolveSpotifyTrack(url: string) {
  const oEmbedUrl = new URL("https://open.spotify.com/oembed");
  oEmbedUrl.searchParams.set("url", url);

  const oEmbedResponse = await fetch(oEmbedUrl, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!oEmbedResponse.ok) {
    throw new Error(
      `Spotify track lookup failed with ${oEmbedResponse.status}`,
    );
  }

  const metadata = (await oEmbedResponse.json()) as SpotifyOEmbedResponse;
  const title = metadata.title?.trim() ?? "";
  const artist = metadata.author_name?.trim() ?? "";

  if (!title) {
    throw new Error("Spotify did not return a track title");
  }

  const searchUrl = new URL("https://api.deezer.com/search");
  searchUrl.searchParams.set(
    "q",
    artist ? `track:"${title}" artist:"${artist}"` : title,
  );
  searchUrl.searchParams.set("limit", "10");

  const searchResponse = await fetch(searchUrl, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!searchResponse.ok) {
    throw new Error(
      `Deezer track lookup failed with ${searchResponse.status}`,
    );
  }

  const payload = (await searchResponse.json()) as DeezerSearchResponse;
  const tracks = Array.isArray(payload.data) ? payload.data : [];
  const normalizedTitle = normalize(title);
  const normalizedArtist = normalize(artist);

  const track =
    tracks.find((candidate) => {
      const candidateTitle = normalize(getTrackName(candidate));
      const candidateArtist = normalize(candidate.artist?.name ?? "");

      return (
        candidateTitle === normalizedTitle &&
        (!normalizedArtist || candidateArtist === normalizedArtist)
      );
    }) ??
    tracks.find(
      (candidate) => normalize(getTrackName(candidate)) === normalizedTitle,
    ) ??
    tracks[0];

  const id = Number(track?.id ?? 0);
  const name = track ? getTrackName(track) : "";
  const matchedArtist = track?.artist?.name?.trim() ?? "";

  if (!id || !name || !matchedArtist) {
    throw new Error("Could not match this Spotify track in the audio catalog");
  }

  const imageUrl = track?.album?.cover_medium?.trim() || null;

  return {
    id: `deezer:track:${id}`,
    kind: "track" as const,
    name,
    artist: matchedArtist,
    secondary: track?.album?.title?.trim() || "Track",
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
    externalUrl: track?.link?.trim() || null,
    searchQuery: `${name} by ${matchedArtist}`,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const url =
      body && typeof body === "object" && typeof body.url === "string"
        ? body.url.trim()
        : "";

    if (!url) {
      return NextResponse.json(
        { error: "Music URL is required" },
        { status: 400 },
      );
    }

    if (!isSpotifyTrackUrl(url)) {
      return NextResponse.json(
        {
          error:
            "Direct link resolution currently supports Spotify track URLs.",
        },
        { status: 400 },
      );
    }

    const result = await resolveSpotifyTrack(url);

    return NextResponse.json(
      {
        provider: "spotify-deezer",
        result,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Reference link resolution failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not resolve this music link",
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
