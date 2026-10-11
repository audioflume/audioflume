import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;
const MUSICBRAINZ_SEARCH_LIMIT = 8;
const MUSICBRAINZ_TITLE_SEARCH_LIMIT = 30;
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

type MusicBrainzReleaseGroup = {
  id?: string;
  title?: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
};

type MusicBrainzRelease = {
  id?: string;
  title?: string;
  date?: string;
  status?: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
  "release-group"?: MusicBrainzReleaseGroup;
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

function getReleaseScore(
  release: MusicBrainzRelease,
  recordingArtist: string,
  recordingTitle: string,
) {
  let score = 0;

  const releaseArtist = getArtistLabel(release["artist-credit"]);
  if (
    releaseArtist &&
    normalize(releaseArtist) === normalize(recordingArtist)
  ) {
    score += 6;
  }

  if (release.status?.toLowerCase() === "official") {
    score += 2;
  }

  const primaryType = release["release-group"]?.["primary-type"]?.toLowerCase();
  if (primaryType === "album") score += 4;
  if (primaryType === "single") score += 3;
  if (primaryType === "ep") score += 3;

  const secondaryTypes = (
    release["release-group"]?.["secondary-types"] ?? []
  ).map((type) => type.toLowerCase());

  if (secondaryTypes.includes("compilation")) score -= 8;
  if (secondaryTypes.includes("live")) score -= 5;
  if (secondaryTypes.includes("remix")) score -= 4;
  if (secondaryTypes.includes("dj-mix")) score -= 4;
  if (secondaryTypes.includes("mixtape/street")) score -= 3;

  if (normalize(release.title ?? "") === normalize(recordingTitle)) {
    score += 1;
  }

  return score;
}

function getRankedReleases(
  releases: MusicBrainzRelease[] | undefined,
  recordingArtist: string,
  recordingTitle: string,
) {
  return [...(releases ?? [])]
    .filter((release) => release.id?.trim())
    .sort((a, b) => {
      const scoreDifference =
        getReleaseScore(b, recordingArtist, recordingTitle) -
        getReleaseScore(a, recordingArtist, recordingTitle);

      if (scoreDifference !== 0) return scoreDifference;

      return String(a.date ?? "").localeCompare(String(b.date ?? ""));
    });
}

function getArtworkCandidates(releases: MusicBrainzRelease[]) {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const release of releases) {
    const releaseGroupId = release["release-group"]?.id?.trim();
    const releaseId = release.id?.trim();

    for (const url of [
      releaseGroupId
        ? `https://coverartarchive.org/release-group/${releaseGroupId}/front-250`
        : "",
      releaseId
        ? `https://coverartarchive.org/release/${releaseId}/front-250`
        : "",
    ]) {
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }

    if (urls.length >= 8) break;
  }

  return urls;
}

function getTrackResult(recording: MusicBrainzRecording) {
  const id = recording.id?.trim();
  const name = recording.title?.trim();
  const artist = getArtistLabel(recording["artist-credit"]);

  if (!id || !name || !artist) return null;

  const rankedReleases = getRankedReleases(recording.releases, artist, name);
  const release = rankedReleases[0];
  const releaseTitle =
    release?.["release-group"]?.title?.trim() || release?.title?.trim();
  const imageUrls = getArtworkCandidates(rankedReleases);

  return {
    id: `musicbrainz:recording:${id}`,
    kind: "track" as const,
    name,
    artist,
    secondary: releaseTitle || "Track",
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
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
    imageUrls: [],
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

function escapeMusicBrainzQuery(value: string) {
  return value.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
}

async function searchRecordings(query: string, artistId?: string) {
  const searchUrl = new URL("https://musicbrainz.org/ws/2/recording");
  searchUrl.searchParams.set(
    "query",
    artistId
      ? `arid:${artistId}`
      : `recording:"${escapeMusicBrainzQuery(query)}"`,
  );
  searchUrl.searchParams.set("fmt", "json");
  searchUrl.searchParams.set(
    "limit",
    String(
      artistId ? MUSICBRAINZ_SEARCH_LIMIT : MUSICBRAINZ_TITLE_SEARCH_LIMIT,
    ),
  );

  const data =
    await fetchMusicBrainz<MusicBrainzRecordingSearchResponse>(searchUrl);

  return data.recordings ?? [];
}

function rankRecordingResults(
  query: string,
  recordings: MusicBrainzRecording[],
) {
  const normalizedQuery = normalize(query);

  return [...recordings].sort((a, b) => {
    const aExact = normalize(a.title ?? "") === normalizedQuery ? 1 : 0;
    const bExact = normalize(b.title ?? "") === normalizedQuery ? 1 : 0;

    if (aExact !== bExact) return bExact - aExact;

    const scoreDifference = Number(b.score ?? 0) - Number(a.score ?? 0);
    if (scoreDifference !== 0) return scoreDifference;

    return (b.releases?.length ?? 0) - (a.releases?.length ?? 0);
  });
}

function dedupeRecordingResults(recordings: MusicBrainzRecording[]) {
  const seen = new Set<string>();

  return recordings.filter((recording) => {
    const title = normalize(recording.title ?? "");
    const artist = normalize(getArtistLabel(recording["artist-credit"]));
    const key = `${title}::${artist}`;

    if (!title || !artist || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

async function searchMusicBrainz(query: string) {
  const normalizedQuery = normalize(query);
  const cached = resultCache.get(normalizedQuery);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const matchedArtist = await findExactArtist(query);
  const recordings = await searchRecordings(query, matchedArtist?.id);
  const rankedRecordings = matchedArtist
    ? recordings
    : dedupeRecordingResults(rankRecordingResults(query, recordings));

  const tracks = rankedRecordings.flatMap((recording) => {
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
