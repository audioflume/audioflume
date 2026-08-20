import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { createArtistNotificationForMembers } from "@/lib/artistNotifications";
import { deleteFilesFromR2 } from "@/lib/r2";
import {
  applySongPendingRevision,
  deleteSongPendingRevision,
  getR2KeyFromSongUrl,
  getSongPendingRevision,
  mergeSongPendingRevision,
  setSongPendingRevisionChangesRequested,
} from "@/lib/songPendingRevisions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ songId: string }> | { songId: string };
};

type ReviewAction = "request_changes" | "reject" | "approve" | "publish";

const ACTION_CONFIG: Record<
  ReviewAction,
  {
    from: string[];
    to: "changes_requested" | "rejected" | "approved" | "published";
    eventAction: "changes_requested" | "rejected" | "approved" | "published";
    requiresNotes: boolean;
  }
> = {
  request_changes: {
    from: ["submitted"],
    to: "changes_requested",
    eventAction: "changes_requested",
    requiresNotes: true,
  },
  reject: {
    from: ["submitted"],
    to: "rejected",
    eventAction: "rejected",
    requiresNotes: false,
  },
  approve: {
    from: ["submitted"],
    to: "approved",
    eventAction: "approved",
    requiresNotes: false,
  },
  publish: {
    from: ["approved"],
    to: "published",
    eventAction: "published",
    requiresNotes: false,
  },
};

function cleanNotes(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 4000);
}

function isReviewAction(value: unknown): value is ReviewAction {
  return (
    value === "request_changes" ||
    value === "reject" ||
    value === "approve" ||
    value === "publish"
  );
}

function getTrackReviewNotification(
  action: ReviewAction,
  trackTitle: string,
  notes: string,
  revisionApplied = false,
  liveStatus?: string | null,
) {
  if (action === "request_changes") {
    return {
      kind: "track_changes_requested",
      title: `Changes requested: ${trackTitle}`,
      message: notes,
    };
  }

  if (action === "reject") {
    return {
      kind: "track_rejected",
      title: `Track rejected: ${trackTitle}`,
      message: revisionApplied
        ? notes || "The proposed changes were not approved. The current version is unchanged."
        : notes || "This track was not approved. Review it before submitting again.",
    };
  }

  if (action === "approve") {
    return {
      kind: "track_approved",
      title: `Track approved: ${trackTitle}`,
      message: revisionApplied
        ? liveStatus === "published"
          ? "The approved changes are now live."
          : "The approved changes have been applied to this track."
        : "This track has been approved and is ready to publish.",
    };
  }

  return {
    kind: "track_published",
    title: `Track published: ${trackTitle}`,
    message: "This track is now live in the Audioflume music library.",
  };
}

async function getPrimaryArtist(songId: string) {
  const { data: link, error: linkError } = await supabaseServer
    .from("song_artists")
    .select("artist_id")
    .eq("song_id", songId)
    .eq("role", "primary")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!link?.artist_id) return null;

  const { data: artist, error: artistError } = await supabaseServer
    .from("artists")
    .select("id, name, slug, status, profile_image_url")
    .eq("id", link.artist_id)
    .maybeSingle();

  if (artistError) throw artistError;
  return artist ?? null;
}

async function deleteRevisionAudioAssets(values: unknown[]) {
  const keys = values
    .map(getR2KeyFromSongUrl)
    .filter((key): key is string => Boolean(key));

  if (keys.length === 0) return;

  try {
    await deleteFilesFromR2([...new Set(keys)]);
  } catch (error) {
    console.error("Failed to clean up revision audio assets:", error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { songId } = await context.params;
    const artist = await getPrimaryArtist(songId);

    if (!artist) {
      return NextResponse.json({ error: "Artist submission not found" }, { status: 404 });
    }

    const [
      songResult,
      creditsResult,
      rightsResult,
      holdersResult,
      reviewsResult,
      pendingRevision,
    ] = await Promise.all([
      supabaseServer
        .from("songs")
        .select(
          "id, title, artist, status, duration, bpm, key, genres, moods, regions, instruments, builds, vocals, instrumental, explicit, audio_url, playback_url, hls_url, cover_url, created_at",
        )
        .eq("id", songId)
        .maybeSingle(),
      supabaseServer
        .from("song_credits")
        .select("id, credit_name, credit_role, position")
        .eq("song_id", songId)
        .order("position", { ascending: true }),
      supabaseServer
        .from("song_rights")
        .select(
          "master_owner, publishing_owner, pro_affiliation, isrc, iswc, copyright_year, rights_confirmed, notes",
        )
        .eq("song_id", songId)
        .maybeSingle(),
      supabaseServer
        .from("song_rights_holders")
        .select(
          "id, holder_name, rights_type, ownership_percent, pro_affiliation, ipi_cae_number, created_at",
        )
        .eq("song_id", songId)
        .order("created_at", { ascending: true }),
      supabaseServer
        .from("song_review_events")
        .select("id, action, notes, reviewed_by_clerk_user_id, created_at")
        .eq("song_id", songId)
        .order("created_at", { ascending: false }),
      getSongPendingRevision(songId),
    ]);

    if (songResult.error) throw songResult.error;
    if (creditsResult.error) throw creditsResult.error;
    if (rightsResult.error) throw rightsResult.error;
    if (holdersResult.error) throw holdersResult.error;
    if (reviewsResult.error) throw reviewsResult.error;

    if (!songResult.data) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const reviewSong = pendingRevision
      ? {
          ...mergeSongPendingRevision(songResult.data, pendingRevision),
          status: pendingRevision.status,
        }
      : songResult.data;

    return NextResponse.json({
      song: reviewSong,
      artist,
      credits: pendingRevision?.credits ?? creditsResult.data ?? [],
      rights: pendingRevision?.rights ?? rightsResult.data ?? null,
      rights_holders:
        pendingRevision?.rights_holders ?? holdersResult.data ?? [],
      reviews: reviewsResult.data ?? [],
      revision_pending: Boolean(pendingRevision),
      live_status: songResult.data.status,
    });
  } catch (error) {
    console.error("Failed to load admin song review details:", error);

    return NextResponse.json(
      { error: "Failed to load submission details" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { songId } = await context.params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const action = payload.action;

    if (!isReviewAction(action)) {
      return NextResponse.json({ error: "Invalid review action" }, { status: 400 });
    }

    const config = ACTION_CONFIG[action];
    const notes = cleanNotes(payload.notes);

    if (config.requiresNotes && !notes) {
      return NextResponse.json(
        { error: "Review feedback is required for this action" },
        { status: 400 },
      );
    }

    const artist = await getPrimaryArtist(songId);

    if (!artist) {
      return NextResponse.json({ error: "Artist submission not found" }, { status: 404 });
    }

    const [songResult, rightsResult, pendingRevision] = await Promise.all([
      supabaseServer
        .from("songs")
        .select("id, title, artist, status, duration, created_at")
        .eq("id", songId)
        .maybeSingle(),
      supabaseServer
        .from("song_rights")
        .select("rights_confirmed")
        .eq("song_id", songId)
        .maybeSingle(),
      getSongPendingRevision(songId),
    ]);

    if (songResult.error) throw songResult.error;
    if (rightsResult.error) throw rightsResult.error;

    const currentSong = songResult.data;

    if (!currentSong) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    if (pendingRevision) {
      if (action === "publish") {
        return NextResponse.json(
          { error: "Pending song changes must be approved before publishing" },
          { status: 409 },
        );
      }
      if (pendingRevision.status !== "submitted") {
        return NextResponse.json(
          { error: `These changes cannot be ${action.replace(/_/g, " ")} from their current status` },
          { status: 409 },
        );
      }

      const pendingRightsConfirmed = pendingRevision.rights
        ? pendingRevision.rights.rights_confirmed === true
        : rightsResult.data?.rights_confirmed === true;

      if (action === "approve" && !pendingRightsConfirmed) {
        return NextResponse.json(
          { error: "Ownership must be complete before these changes can be approved" },
          { status: 400 },
        );
      }

      let updatedSong = currentSong;
      let revisionApplied = false;

      if (action === "request_changes") {
        const changedRevision = await setSongPendingRevisionChangesRequested(
          songId,
          notes,
        );
        if (!changedRevision) {
          return NextResponse.json(
            { error: "Pending changes changed before this review action completed" },
            { status: 409 },
          );
        }
      } else if (action === "reject") {
        const deletedRevision = await deleteSongPendingRevision(songId);
        if (!deletedRevision) {
          return NextResponse.json(
            { error: "Pending changes changed before this review action completed" },
            { status: 409 },
          );
        }
        await deleteRevisionAudioAssets([
          deletedRevision.audio_url,
          deletedRevision.playback_url,
          deletedRevision.hls_url,
        ]);
      } else if (action === "approve") {
        const hadReplacementAudio = Boolean(pendingRevision.audio_url);
        const applied = await applySongPendingRevision(songId);
        revisionApplied = true;

        const { data: appliedSong, error: appliedSongError } = await supabaseServer
          .from("songs")
          .select("id, title, artist, status, duration, created_at")
          .eq("id", songId)
          .single();
        if (appliedSongError) throw appliedSongError;
        updatedSong = appliedSong;

        if (hadReplacementAudio) {
          await deleteRevisionAudioAssets([
            applied.oldAudioUrl,
            applied.oldPlaybackUrl,
            applied.oldHlsUrl,
          ]);
        }
      }

      const { data: review, error: reviewError } = await supabaseServer
        .from("song_review_events")
        .insert({
          song_id: songId,
          action: config.eventAction,
          notes: notes || null,
          reviewed_by_clerk_user_id: admin.user?.id ?? null,
        })
        .select("id, action, notes, reviewed_by_clerk_user_id, created_at")
        .single();

      if (reviewError) throw reviewError;

      const revisionTitle =
        pendingRevision.metadata &&
        typeof pendingRevision.metadata.title === "string"
          ? pendingRevision.metadata.title
          : currentSong.title;
      const notification = getTrackReviewNotification(
        action,
        revisionTitle,
        notes,
        action === "reject" || revisionApplied,
        currentSong.status,
      );

      try {
        await createArtistNotificationForMembers({
          artistId: artist.id,
          ...notification,
          actionUrl: `/artists/dashboard?section=music&artist=${artist.id}`,
        });
      } catch (notificationError) {
        console.error("Failed to create track review notification:", notificationError);
      }

      return NextResponse.json({
        song: updatedSong,
        artist,
        review,
        revision_applied: revisionApplied,
        revision_pending: action === "request_changes",
        live_status: updatedSong.status,
      });
    }

    if (!config.from.includes(currentSong.status)) {
      return NextResponse.json(
        { error: `This track cannot be ${action.replace(/_/g, " ")} from its current status` },
        { status: 409 },
      );
    }

    if ((action === "approve" || action === "publish") && !rightsResult.data?.rights_confirmed) {
      return NextResponse.json(
        { error: "Ownership must be complete before this track can be approved or published" },
        { status: 400 },
      );
    }

    const { data: updatedSong, error: updateError } = await supabaseServer
      .from("songs")
      .update({ status: config.to })
      .eq("id", songId)
      .eq("status", currentSong.status)
      .select("id, title, artist, status, duration, created_at")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updatedSong) {
      return NextResponse.json(
        { error: "Track status changed before this review action completed" },
        { status: 409 },
      );
    }

    const { data: review, error: reviewError } = await supabaseServer
      .from("song_review_events")
      .insert({
        song_id: songId,
        action: config.eventAction,
        notes: notes || null,
        reviewed_by_clerk_user_id: admin.user?.id ?? null,
      })
      .select("id, action, notes, reviewed_by_clerk_user_id, created_at")
      .single();

    if (reviewError) {
      await supabaseServer
        .from("songs")
        .update({ status: currentSong.status })
        .eq("id", songId)
        .eq("status", config.to);
      throw reviewError;
    }

    const notification = getTrackReviewNotification(
      action,
      updatedSong.title,
      notes,
    );

    try {
      await createArtistNotificationForMembers({
        artistId: artist.id,
        ...notification,
        actionUrl: `/artists/dashboard?section=music&artist=${artist.id}`,
      });
    } catch (notificationError) {
      console.error("Failed to create track review notification:", notificationError);
    }

    return NextResponse.json({
      song: updatedSong,
      artist,
      review,
      revision_applied: false,
      revision_pending: false,
      live_status: updatedSong.status,
    });
  } catch (error) {
    console.error("Failed to update admin song review status:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update submission",
      },
      { status: 500 },
    );
  }
}
