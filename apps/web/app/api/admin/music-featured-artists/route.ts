import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

const TABLE = "music_featured_artists";
const isId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function authorized() {
  return (await requireAdmin()).isAdmin;
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const { data: rows, error } = await supabaseServer.from(TABLE)
      .select("artist_id, position, focal_x, focal_y, overlay_opacity").order("position");
    if (error) throw error;
    const ids = (rows ?? []).map(row => row.artist_id);
    if (!ids.length) return NextResponse.json({ items: [] });
    const { data: artists, error: artistError } = await supabaseServer.from("artists")
      .select("id, name, slug, designation, hero_image_url, status").in("id", ids);
    if (artistError) throw artistError;
    const byId = new Map((artists ?? []).map(a => [a.id, a]));
    return NextResponse.json({
      items: (rows ?? []).flatMap(row => {
        const artist = byId.get(row.artist_id);
        return artist ? [{ ...row, artist }] : [];
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Music featured artists" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await request.json();
    const requested: string[] = [...new Set((Array.isArray(body.artist_ids) ? body.artist_ids : []).filter(isId))];
    if (!requested.length) return NextResponse.json({ error: "Select an artist" }, { status: 400 });
    const { data: current, error } = await supabaseServer.from(TABLE).select("artist_id, position");
    if (error) throw error;
    const existing = new Set((current ?? []).map(row => row.artist_id));
    const newIds = requested.filter(id => !existing.has(id));
    if (existing.size + newIds.length > 4) return NextResponse.json({ error: "Music banners support a maximum of four featured artists" }, { status: 400 });
    if (!newIds.length) return NextResponse.json({ success: true });
    const { data: artists, error: artistError } = await supabaseServer.from("artists")
      .select("id, status, hero_image_url, hero_image_position_x, hero_image_position_y").in("id", newIds);
    if (artistError) throw artistError;
    if (artists?.length !== newIds.length || artists.some(a => a.status !== "approved" || !a.hero_image_url)) {
      return NextResponse.json({ error: "Only approved artists with banner images can be featured" }, { status: 400 });
    }
    const byId = new Map(artists.map(a => [a.id, a]));
    const used = new Set((current ?? []).map(row => row.position));
    const inserts = newIds.map(id => {
      const position = [0, 1, 2, 3].find(value => !used.has(value));
      if (position === undefined) throw new Error("Four featured artists maximum");
      used.add(position);
      const artist = byId.get(id)!;
      return { artist_id: id, position, focal_x: artist.hero_image_position_x ?? 50, focal_y: artist.hero_image_position_y ?? 50 };
    });
    const { error: insertError } = await supabaseServer.from(TABLE).insert(inserts);
    if (insertError) throw insertError;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add artists" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await request.json();
    if (body.artist_id !== undefined) {
      if (!isId(body.artist_id) ||
        typeof body.focal_x !== "number" || !Number.isFinite(body.focal_x) || body.focal_x < 0 || body.focal_x > 100 ||
        typeof body.focal_y !== "number" || !Number.isFinite(body.focal_y) || body.focal_y < 0 || body.focal_y > 100 ||
        typeof body.overlay_opacity !== "number" || !Number.isInteger(body.overlay_opacity) || body.overlay_opacity < 0 || body.overlay_opacity > 100) {
        return NextResponse.json({ error: "Invalid focal point" }, { status: 400 });
      }
      const { data, error } = await supabaseServer.from(TABLE).update({
        focal_x: Math.round(body.focal_x * 100) / 100,
        focal_y: Math.round(body.focal_y * 100) / 100,
        overlay_opacity: body.overlay_opacity,
      }).eq("artist_id", body.artist_id).select("artist_id").maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Artist is not featured" }, { status: 404 });
    } else {
      const ids: string[] = Array.isArray(body.artist_ids) ? body.artist_ids : [];
      if (ids.length > 4 || ids.some(id => !isId(id)) || new Set(ids).size !== ids.length) {
        return NextResponse.json({ error: "Invalid artist order" }, { status: 400 });
      }
      const { data: current, error } = await supabaseServer.from(TABLE).select("artist_id");
      if (error) throw error;
      if (current?.length !== ids.length || current.some(row => !ids.includes(row.artist_id))) {
        return NextResponse.json({ error: "The featured artist list has changed" }, { status: 409 });
      }
      for (let position = 0; position < ids.length; position++) {
        const { error: updateError } = await supabaseServer.from(TABLE).update({ position }).eq("artist_id", ids[position]);
        if (updateError) throw updateError;
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update Music featured artists" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const { artist_id } = await request.json();
    if (!isId(artist_id)) return NextResponse.json({ error: "Invalid artist" }, { status: 400 });
    const { error } = await supabaseServer.from(TABLE).delete().eq("artist_id", artist_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove artist" }, { status: 500 });
  }
}
