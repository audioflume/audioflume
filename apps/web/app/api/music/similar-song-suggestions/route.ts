import { NextResponse } from "next/server";

export const runtime = "nodejs";
const DEEZER = "https://api.deezer.com";

type DeezerTrack = {
  id: number; title?: string; title_short?: string; link?: string;
  artist?: { id?: number; name?: string };
  album?: { cover_medium?: string };
};

async function deezer(path: string) {
  const response = await fetch(DEEZER + path, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Deezer unavailable");
  const value = await response.json();
  if (value.error) throw new Error("Deezer unavailable");
  return value;
}

export async function GET(request: Request) {
  const trackId = new URL(request.url).searchParams.get("trackId") || "";
  if (!/^[1-9][0-9]{0,15}$/.test(trackId)) {
    return NextResponse.json({ error: "Invalid Deezer track" }, { status: 400 });
  }
  try {
    const reference = await deezer(`/track/${trackId}`) as DeezerTrack;
    if (!reference.artist?.id) return NextResponse.json({ results: [] });
    const related = await deezer(`/artist/${reference.artist.id}/related?limit=12`);
    const artists = (related.data || []).slice(0, 12) as Array<{ id: number; name?: string; picture_medium?: string }>;
    const artistResults = artists
      .filter((artist) => Number.isFinite(artist.id) && artist.id > 0)
      .map((artist) => ({
        id: artist.id,
        name: artist.name || "Unknown Artist",
        imageUrl: artist.picture_medium || null,
      }));
    if (new URL(request.url).searchParams.get("mode") === "artists") {
      return NextResponse.json({ artists: artistResults }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    const artistId = new URL(request.url).searchParams.get("artistId");
    if (artistId && (!/^[1-9][0-9]{0,15}$/.test(artistId) || !artists.some((artist) => String(artist.id) === artistId))) {
      return NextResponse.json({ error: "Unknown related artist" }, { status: 400 });
    }
    const artistsToQuery = artistId ? artists.filter((artist) => String(artist.id) === artistId) : artists.slice(0, 6);
    const lists = await Promise.allSettled(artistsToQuery.map((artist) => deezer(`/artist/${artist.id}/top?limit=10`)));
    const seen = new Set<string>();
    const results = lists.flatMap((item) => item.status === "fulfilled" ? (item.value.data || []) as DeezerTrack[] : [])
      .filter((song) => {
        if (!song.id || !song.title || !song.artist?.name || String(song.id) === trackId) return false;
        const key = (song.title_short || song.title).toLowerCase() + "::" + song.artist.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 30).map((song) => ({
        id: `deezer:track:${song.id}`,
        name: song.title_short || song.title,
        artist: song.artist?.name,
        imageUrl: song.album?.cover_medium || null,
        externalUrl: `https://www.deezer.com/track/${song.id}`,
      }));
    return NextResponse.json({ results, artists: artists.map((artist) => ({ id: artist.id, name: artist.name || "Unknown Artist", imageUrl: artist.picture_medium || null })) }, { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } });
  } catch (error) {
    console.error("Deezer related-track lookup failed:", error);
    return NextResponse.json({ error: "Unable to load suggested songs" }, { status: 502 });
  }
}
