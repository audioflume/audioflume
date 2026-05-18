import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  DEFAULT_DISCOVER_BUTTON_TEXT,
  DISCOVER_SECTION_OPTIONS,
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanDiscoverSection(value: unknown) {
  const section = cleanString(value);
  return DISCOVER_SECTION_OPTIONS.some((option) => option.value === section)
    ? section
    : null;
}

function cleanBoolean(value: unknown) {
  return value === true;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .select("*, curated_playlist_songs(count)")
      .order("playlist_group", { ascending: true })
      .order("position", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((row) =>
        normalizeCuratedPlaylist({
          ...row,
          song_count: row.curated_playlist_songs?.[0]?.count ?? 0,
        }),
      ),
    );
  } catch (err) {
    console.error("Admin curated playlists fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load curated playlists"),
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = cleanString(body.name);
    const kicker = cleanString(body.kicker);
    const coverImageUrl = cleanString(body.cover_image_url);
    const playlistGroup = cleanString(body.playlist_group) || DEFAULT_CURATED_PLAYLIST_GROUP;
    const description = cleanString(body.description);
    const discoverSection = cleanDiscoverSection(body.discover_section);
    const showOnDiscover = cleanBoolean(body.show_on_discover);
    const discoverButtonText = cleanString(body.discover_button_text) || DEFAULT_DISCOVER_BUTTON_TEXT;
    const discoverButtonEnabled = body.discover_button_enabled !== false;

    if (!name) {
      return NextResponse.json({ error: "Missing playlist name" }, { status: 400 });
    }

    const { data: existing, error: positionError } = await supabaseServer
      .from("curated_playlists")
      .select("position")
      .eq("playlist_group", playlistGroup)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition = existing?.[0]?.position != null ? existing[0].position + 1 : 0;

    const discoverPositionQuery = supabaseServer
      .from("curated_playlists")
      .select("discover_position")
      .order("discover_position", { ascending: false })
      .limit(1);

    const { data: discoverExisting, error: discoverPositionError } = discoverSection
      ? await discoverPositionQuery.eq("discover_section", discoverSection)
      : showOnDiscover
        ? await discoverPositionQuery.eq("show_on_discover", true).is("discover_section", null)
        : { data: [], error: null };

    if (discoverPositionError) throw discoverPositionError;

    const nextDiscoverPosition =
      discoverExisting?.[0]?.discover_position != null
        ? discoverExisting[0].discover_position + 1
        : 0;

    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .insert({
        name,
        kicker: kicker || "Curated selection",
        cover_image_url: coverImageUrl || null,
        playlist_group: playlistGroup,
        description,
        discover_section: discoverSection,
        show_on_discover: showOnDiscover,
        discover_position: nextDiscoverPosition,
        discover_button_enabled: discoverButtonEnabled,
        discover_button_text: discoverButtonText,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeCuratedPlaylist(data));
  } catch (err) {
    console.error("Admin curated playlist create failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to create curated playlist"),
      { status: 500 },
    );
  }
}
