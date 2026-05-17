import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCuratedPlaylistError } from "@/lib/curatedPlaylists";

type PositionUpdate = { id: number; position: number };

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updates: PositionUpdate[] = body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Invalid updates format" }, { status: 400 });
    }

    const results = await Promise.all(
      updates.map(({ id, position }) =>
        supabaseServer
          .from("curated_playlists")
          .update({ position })
          .eq("id", id),
      ),
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Curated playlist reorder failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to reorder playlists"),
      { status: 500 },
    );
  }
}
