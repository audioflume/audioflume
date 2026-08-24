import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { DISCOVER_LIBRARY_SECTION } from "@/lib/discoverAdmin";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizeCuratedBrowseAssignments } from "@/lib/curatedBrowseTaxonomy";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  DISCOVER_SECTION_OPTIONS,
  getCuratedPlaylistError,
  normalizeCuratedBrowseSubcategories,
  normalizeCuratedBrowseTags,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";
import { toSmartTitleCase } from "@/lib/smartTitleCase";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanDiscoverSection(value: unknown) {
  const section = cleanString(value);
  if (section === DISCOVER_LIBRARY_SECTION) return section;

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
    const [playlistsResult, assignmentsResult] = await Promise.all([
      supabaseServer
        .from("curated_playlists")
        .select("*, curated_playlist_songs(count)")
        .order("playlist_group", { ascending: true })
        .order("position", { ascending: true }),
      supabaseServer
        .from("curated_playlist_browse_assignments")
        .select("curated_playlist_id, browse_filter, subcategory_id"),
    ]);

    if (playlistsResult.error) throw playlistsResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;

    const assignmentsByPlaylist = new Map<number, unknown[]>();
    for (const assignment of assignmentsResult.data ?? []) {
      const playlistId = Number(assignment.curated_playlist_id);
      const current = assignmentsByPlaylist.get(playlistId) ?? [];
      current.push(assignment);
      assignmentsByPlaylist.set(playlistId, current);
    }

    return NextResponse.json(
      (playlistsResult.data ?? []).map((row) => ({
        ...normalizeCuratedPlaylist({
          ...row,
          song_count: row.curated_playlist_songs?.[0]?.count ?? 0,
        }),
        browse_assignments: normalizeCuratedBrowseAssignments(
          assignmentsByPlaylist.get(Number(row.id)) ?? [],
        ),
      })),
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
    const name = toSmartTitleCase(cleanString(body.name));
    const kicker = cleanString(body.kicker);
    const coverImageUrl = cleanString(body.cover_image_url);
    const coverVideoUrl = cleanString(body.cover_video_url);
    const playlistGroup = cleanString(body.playlist_group) || DEFAULT_CURATED_PLAYLIST_GROUP;
    const browseTags = normalizeCuratedBrowseTags(body.browse_tags);
    const browseSubcategories = normalizeCuratedBrowseSubcategories(
      body.browse_subcategories,
      browseTags,
    );
    const browseAssignments = normalizeCuratedBrowseAssignments(
      body.browse_assignments,
      browseTags,
    );
    const description = cleanString(body.description);
    const discoverSection = cleanDiscoverSection(body.discover_section);
    const showOnDiscover = cleanBoolean(body.show_on_discover);
    const showOnCuratedFeature = cleanBoolean(body.show_on_curated_feature);

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

    const insertValues: Record<
      string,
      string | string[] | number | boolean | null
    > = {
      name,
      kicker: kicker || "Curated selection",
      cover_image_url: coverImageUrl || null,
      playlist_group: playlistGroup,
      browse_tags: browseTags,
      browse_subcategories: browseSubcategories,
      description,
      discover_section: discoverSection,
      show_on_discover: showOnDiscover,
      show_on_curated_feature: showOnCuratedFeature,
      discover_position: nextDiscoverPosition,
      position: nextPosition,
    };

    if (coverVideoUrl) {
      insertValues.cover_video_url = coverVideoUrl;
    }

    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .insert(insertValues)
      .select()
      .single();

    if (error) throw error;

    if (browseAssignments.length > 0) {
      const { error: assignmentsError } = await supabaseServer
        .from("curated_playlist_browse_assignments")
        .insert(
          browseAssignments.map((assignment) => ({
            curated_playlist_id: data.id,
            browse_filter: assignment.browse_filter,
            subcategory_id: assignment.subcategory_id,
          })),
        );

      if (assignmentsError) {
        await supabaseServer.from("curated_playlists").delete().eq("id", data.id);
        throw assignmentsError;
      }
    }

    return NextResponse.json({
      ...normalizeCuratedPlaylist(data),
      browse_assignments: browseAssignments,
    });
  } catch (err) {
    console.error("Admin curated playlist create failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to create curated playlist"),
      { status: 500 },
    );
  }
}
