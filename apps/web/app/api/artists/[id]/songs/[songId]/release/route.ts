import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params:
    | Promise<{ id: string; songId: string }>
    | { id: string; songId: string };
};

async function requirePrimarySong(artistId: string, songId: string) {
  const { data, error } = await supabaseServer
    .from("song_artists")
    .select("song_id")
    .eq("artist_id", artistId)
    .eq("song_id", songId)
    .eq("role", "primary")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    await requireArtistPermission(id, "release:manage");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const { data: artist, error: artistError } = await supabaseServer
      .from("artists")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (artistError) throw artistError;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    if (artist.status !== "approved") {
      return NextResponse.json(
        { error: "Artist profile must be approved before managing releases" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const releaseId =
      body.release_id === null || body.release_id === ""
        ? null
        : typeof body.release_id === "string"
          ? body.release_id
          : undefined;

    if (releaseId === undefined) {
      return NextResponse.json({ error: "Invalid release" }, { status: 400 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from("songs")
      .select("id, status, standalone_cover_url")
      .eq("id", songId)
      .maybeSingle();

    if (songError) throw songError;
    if (!song) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }
    if (song.status === "rejected") {
      return NextResponse.json(
        { error: "Rejected tracks cannot be added to a release" },
        { status: 400 },
      );
    }

    const { data: currentLink, error: currentLinkError } = await supabaseServer
      .from("artist_release_songs")
      .select("release_id, disc_number, track_number")
      .eq("song_id", songId)
      .maybeSingle();

    if (currentLinkError) throw currentLinkError;

    if (!releaseId) {
      if (currentLink) {
        const { error: deleteError } = await supabaseServer
          .from("artist_release_songs")
          .delete()
          .eq("song_id", songId);
        if (deleteError) throw deleteError;
      }

      return NextResponse.json({ current_release: null });
    }

    const { data: releaseLink, error: releaseLinkError } = await supabaseServer
      .from("artist_release_artists")
      .select("release_id")
      .eq("release_id", releaseId)
      .eq("artist_id", id)
      .eq("role", "primary")
      .maybeSingle();

    if (releaseLinkError) throw releaseLinkError;
    if (!releaseLink) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const { data: release, error: releaseError } = await supabaseServer
      .from("artist_releases")
      .select("id, title, release_type, cover_image_url, release_date, status")
      .eq("id", releaseId)
      .maybeSingle();

    if (releaseError) throw releaseError;
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    if (currentLink?.release_id === releaseId) {
      return NextResponse.json({ current_release: release });
    }

    if (release.release_type === "single") {
      const { data: existingSingleTrack, error: singleTrackError } =
        await supabaseServer
          .from("artist_release_songs")
          .select("song_id")
          .eq("release_id", releaseId)
          .neq("song_id", songId)
          .limit(1)
          .maybeSingle();

      if (singleTrackError) throw singleTrackError;
      if (existingSingleTrack) {
        return NextResponse.json(
          { error: "The selected single already has a track" },
          { status: 409 },
        );
      }
    }

    const { data: lastTrack, error: lastTrackError } = await supabaseServer
      .from("artist_release_songs")
      .select("track_number")
      .eq("release_id", releaseId)
      .order("track_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastTrackError) throw lastTrackError;
    const nextTrackNumber = Number(lastTrack?.track_number ?? 0) + 1;

    if (currentLink) {
      const { error: updateLinkError } = await supabaseServer
        .from("artist_release_songs")
        .update({
          release_id: releaseId,
          disc_number: 1,
          track_number: nextTrackNumber,
        })
        .eq("song_id", songId);

      if (updateLinkError) throw updateLinkError;
    } else {
      const { error: insertLinkError } = await supabaseServer
        .from("artist_release_songs")
        .insert({
          release_id: releaseId,
          song_id: songId,
          disc_number: 1,
          track_number: nextTrackNumber,
        });

      if (insertLinkError) throw insertLinkError;
    }

    const { error: coverError } = await supabaseServer
      .from("songs")
      .update({
        cover_url: release.cover_image_url ?? song.standalone_cover_url ?? null,
      })
      .eq("id", songId);

    if (coverError) throw coverError;

    return NextResponse.json({ current_release: release });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to update artist song release:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update track release",
      },
      { status: 500 },
    );
  }
}
