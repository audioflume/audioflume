import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { DISCOVER_LIBRARY_SECTION } from "@/lib/discoverAdmin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DISCOVER_SECTION_OPTIONS,
  getCuratedPlaylistError,
} from "@/lib/curatedPlaylists";

type PositionUpdate = { id: number; position: number };
type SectionUpdate = { id: number; section: string };
type DiscoverMembershipUpdate = {
  id: number;
  visible: boolean;
  position: number;
};
type ReorderMode =
  | "playlist"
  | "discover"
  | "discover-sections"
  | "discover-membership";

const DISCOVER_SECTION_VALUES = new Set<string>([
  ...DISCOVER_SECTION_OPTIONS.map((option) => option.value),
  DISCOVER_LIBRARY_SECTION,
]);

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const mode: ReorderMode =
      body.mode === "discover-sections"
        ? "discover-sections"
        : body.mode === "discover-membership"
          ? "discover-membership"
          : body.mode === "discover"
            ? "discover"
            : "playlist";

    if (mode === "discover-sections") {
      const updates: SectionUpdate[] = body.updates;

      if (
        !Array.isArray(updates) ||
        updates.length === 0 ||
        updates.some(
          ({ id, section }) =>
            !Number.isFinite(Number(id)) ||
            !DISCOVER_SECTION_VALUES.has(String(section || "")),
        )
      ) {
        return NextResponse.json(
          { error: "Invalid updates format" },
          { status: 400 },
        );
      }

      const results = await Promise.all(
        updates.map(({ id, section }) =>
          supabaseServer
            .from("curated_playlists")
            .update({ discover_section: section })
            .eq("id", id),
        ),
      );

      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      return NextResponse.json({ success: true });
    }

    if (mode === "discover-membership") {
      const updates: DiscoverMembershipUpdate[] = body.updates;

      if (
        !Array.isArray(updates) ||
        updates.length === 0 ||
        updates.some(
          ({ id, visible, position }) =>
            !Number.isFinite(Number(id)) ||
            typeof visible !== "boolean" ||
            !Number.isFinite(Number(position)) ||
            Number(position) < 0,
        )
      ) {
        return NextResponse.json(
          { error: "Invalid updates format" },
          { status: 400 },
        );
      }

      const results = await Promise.all(
        updates.map(({ id, visible, position }) =>
          supabaseServer
            .from("curated_playlists")
            .update({
              show_on_discover: visible,
              discover_position: Number(position),
            })
            .eq("id", id)
            .is("discover_section", null),
        ),
      );

      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      return NextResponse.json({ success: true });
    }

    const updates: PositionUpdate[] = body.updates;
    const column = mode === "discover" ? "discover_position" : "position";

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Invalid updates format" }, { status: 400 });
    }

    const results = await Promise.all(
      updates.map(({ id, position }) =>
        supabaseServer
          .from("curated_playlists")
          .update({ [column]: position })
          .eq("id", id),
      ),
    );

    const failed = results.find((result) => result.error);
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
