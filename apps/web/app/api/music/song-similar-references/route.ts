import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireArtistPermission, ArtistAccessError } from "@/lib/artistPermissions";
import { MAX_SIMILAR_SONG_REFERENCES } from "@/lib/similarSongReferences";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

async function authorize(songId: string, artistId: string | null, write: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(songId)) return false;
  const admin = await requireAdmin();
  if (admin.isAdmin) {
    const { data, error } = await supabaseServer.from("songs").select("id").eq("id", songId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  if (!artistId || !/^[0-9a-f-]{36}$/i.test(artistId)) return false;
  await requireArtistPermission(artistId, write ? "catalog:edit" : "catalog:view");
  const { data, error } = await supabaseServer
    .from("song_artists")
    .select("song_id")
    .eq("song_id", songId)
    .eq("artist_id", artistId)
    .eq("role", "primary")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function failure(error: unknown) {
  if (error instanceof ArtistAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Similar-song references failed:", error);
  return NextResponse.json({ error: "Unable to access similar-song references" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const songId = url.searchParams.get("songId") || "";
    if (!(await authorize(songId, url.searchParams.get("artistId"), false))) {
      return NextResponse.json({ error: "Song not found or access denied" }, { status: 403 });
    }
    const { data, error } = await supabaseServer.from("song_similar_references")
      .select("deezer_track_id, title, artist, image_url, position")
      .eq("song_id", songId).order("position", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ references: (data || []).map((row) => ({
      id: `deezer:track:${row.deezer_track_id}`,
      name: row.title, artist: row.artist, imageUrl: row.image_url,
      externalUrl: `https://www.deezer.com/track/${row.deezer_track_id}`,
    })) });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const songId = typeof payload.songId === "string" ? payload.songId : "";
    const artistId = typeof payload.artistId === "string" ? payload.artistId : null;
    if (!(await authorize(songId, artistId, true))) {
      return NextResponse.json({ error: "Song not found or access denied" }, { status: 403 });
    }
    const refs: unknown = payload.references;
    if (!Array.isArray(refs) || refs.length > MAX_SIMILAR_SONG_REFERENCES) {
      return NextResponse.json({ error: "Select no more than 10 references" }, { status: 400 });
    }
    const seen = new Set<string>();
    const rows = [];
    for (const [position, reference] of refs.entries()) {
      if (!reference || typeof reference !== "object") {
        return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
      }
      const item = reference as Record<string, unknown>;
      const match = typeof item.id === "string" ? /^deezer:track:([1-9][0-9]*)$/.exec(item.id) : null;
      const title = typeof item.name === "string" ? item.name.trim() : "";
      const artist = typeof item.artist === "string" ? item.artist.trim() : "";
      if (!match || !title || !artist || title.length > 200 || artist.length > 200 || seen.has(match[1])) {
        return NextResponse.json({ error: "Invalid or duplicate reference" }, { status: 400 });
      }
      seen.add(match[1]);
      const imageUrl = typeof item.imageUrl === "string" &&
        /^https:\/\/cdn-images\.dzcdn\.net\/images\//.test(item.imageUrl)
        ? item.imageUrl.slice(0, 600) : null;
      rows.push({ song_id: songId, deezer_track_id: match[1], title, artist, image_url: imageUrl, position });
    }
    // Upsert first so an insert failure never clears the existing references.
    if (rows.length) {
      const { error: upsertError } = await supabaseServer.from("song_similar_references")
        .upsert(rows, { onConflict: "song_id,deezer_track_id" });
      if (upsertError) throw upsertError;
    }
    let deletion = supabaseServer.from("song_similar_references").delete().eq("song_id", songId);
    if (rows.length) {
      deletion = deletion.not("deezer_track_id", "in", `(${rows.map((row) => row.deezer_track_id).join(",")})`);
    }
    const { error: deleteError } = await deletion;
    if (deleteError) throw deleteError;
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
