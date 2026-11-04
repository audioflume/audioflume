import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getDirectoryFeaturedArtistId, setDirectoryFeaturedArtistId } from "@/lib/artistDirectoryFeature";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const artistId = await getDirectoryFeaturedArtistId();
    if (!artistId) return NextResponse.json({ artist: null });
    const { data, error } = await supabaseServer
      .from("artists")
      .select("id, name, slug, profile_image_url, hero_image_url")
      .eq("id", artistId)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ artist: data ?? null });
  } catch (error) {
    console.error("Artist directory feature lookup failed:", error);
    return NextResponse.json({ error: "Unable to load featured artist" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await request.json();
    const artistId = body?.artist_id;
    if (artistId !== null && (typeof artistId !== "string" || !UUID_PATTERN.test(artistId))) {
      return NextResponse.json({ error: "Invalid artist" }, { status: 400 });
    }
    if (artistId !== null) {
      const { data, error } = await supabaseServer.from("artists")
        .select("id").eq("id", artistId).eq("status", "approved").maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Only approved artists can be featured" }, { status: 400 });
    }
    await setDirectoryFeaturedArtistId(artistId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Artist directory feature update failed:", error);
    return NextResponse.json({ error: "Unable to save featured artist" }, { status: 500 });
  }
}
