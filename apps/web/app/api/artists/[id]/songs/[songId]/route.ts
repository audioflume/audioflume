import { NextResponse } from "next/server";

import { createArtistNotificationForMembers } from "@/lib/artistNotifications";
import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import {
  getSongPendingRevision,
  mergeSongPendingRevision,
  songStatusUsesPendingRevision,
  upsertSongMetadataRevision,
} from "@/lib/songPendingRevisions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params:
    | Promise<{ id: string; songId: string }>
    | { id: string; songId: string };
};

type CreditInput = {
  credit_name: string;
  credit_role: string;
};

type RightsHolderInput = {
  holder_name: string;
  rights_type: "master" | "publishing" | "both";
  ownership_percent: number | null;
  pro_affiliation: string | null;
  ipi_cae_number: string | null;
};

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanNullableString(value: unknown, maxLength: number) {
  const cleaned = cleanString(value, maxLength);
  return cleaned || null;
}

function cleanStringArray(value: unknown, maxItems = 30) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanString(item, 80))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanInteger(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function cleanPercent(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return Math.round(number * 100) / 100;
}

function cleanCredits(value: unknown): CreditInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 50)
    .map((item) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      return {
        credit_name: cleanString(record.credit_name, 160),
        credit_role: cleanString(record.credit_role, 100),
      };
    })
    .filter((credit) => credit.credit_name && credit.credit_role);
}

function cleanRightsHolders(value: unknown): RightsHolderInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 50)
    .map((item) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      const rightsType =
        record.rights_type === "master" ||
        record.rights_type === "publishing" ||
        record.rights_type === "both"
          ? record.rights_type
          : "both";

      return {
        holder_name: cleanString(record.holder_name, 160),
        rights_type: rightsType,
        ownership_percent: cleanPercent(record.ownership_percent),
        pro_affiliation: cleanNullableString(record.pro_affiliation, 120),
        ipi_cae_number: cleanNullableString(record.ipi_cae_number, 120),
      };
    })
    .filter((holder) => holder.holder_name);
}

function getOwnershipTotals(holders: RightsHolderInput[]) {
  let master = 0;
  let publishing = 0;

  for (const holder of holders) {
    const percent = holder.ownership_percent ?? 0;
    if (holder.rights_type === "master" || holder.rights_type === "both") {
      master += percent;
    }
    if (holder.rights_type === "publishing" || holder.rights_type === "both") {
      publishing += percent;
    }
  }

  return {
    master: Math.round(master * 100) / 100,
    publishing: Math.round(publishing * 100) / 100,
  };
}

async function requirePrimarySong(artistId: string, songId: string) {
  const { data: link, error: linkError } = await supabaseServer
    .from("song_artists")
    .select("song_id")
    .eq("artist_id", artistId)
    .eq("song_id", songId)
    .eq("role", "primary")
    .maybeSingle();

  if (linkError) throw linkError;
  return Boolean(link);
}

async function createResubmissionNotification(
  artistId: string,
  songTitle: string,
) {
  try {
    await createArtistNotificationForMembers({
      artistId,
      kind: "track_resubmitted",
      title: `Track resubmitted: ${songTitle}`,
      message: "Your track has been resubmitted for review.",
      actionUrl: `/artists/dashboard?section=music&artist=${artistId}`,
    });
  } catch (notificationError) {
    console.error("Failed to create track resubmission notification:", notificationError);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    await requireArtistPermission(id, "catalog:view");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const [
      songResult,
      creditsResult,
      rightsResult,
      holdersResult,
      reviewResult,
      pendingRevision,
    ] = await Promise.all([
      supabaseServer
        .from("songs")
        .select(
          "id, title, status, duration, bpm, key, genres, moods, regions, instruments, builds, vocals, instrumental, explicit, created_at",
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
        .select("action, notes, created_at")
        .eq("song_id", songId)
        .in("action", ["changes_requested", "rejected"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getSongPendingRevision(songId),
    ]);

    if (songResult.error) throw songResult.error;
    if (creditsResult.error) throw creditsResult.error;
    if (rightsResult.error) throw rightsResult.error;
    if (holdersResult.error) throw holdersResult.error;
    if (reviewResult.error) throw reviewResult.error;
    if (!songResult.data) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const defaultRights = {
      master_owner: null,
      publishing_owner: null,
      pro_affiliation: null,
      isrc: null,
      iswc: null,
      copyright_year: null,
      rights_confirmed: false,
      notes: null,
    };
    const pendingFeedback =
      pendingRevision?.status === "changes_requested"
        ? {
            action: "changes_requested" as const,
            notes: pendingRevision.review_notes,
            created_at: pendingRevision.updated_at,
          }
        : null;

    return NextResponse.json({
      song: mergeSongPendingRevision(songResult.data, pendingRevision),
      credits: pendingRevision?.credits ?? creditsResult.data ?? [],
      rights: pendingRevision?.rights ?? rightsResult.data ?? defaultRights,
      rights_holders:
        pendingRevision?.rights_holders ?? holdersResult.data ?? [],
      review_feedback: pendingFeedback ?? reviewResult.data ?? null,
      revision_status: pendingRevision?.status ?? null,
      revision_audio_pending: Boolean(pendingRevision?.audio_url),
      live_status: songResult.data.status,
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load artist song details:", error);
    return NextResponse.json(
      { error: "Failed to load track details" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;

    if (payload.action === "submit") {
      const submitAccess = await requireArtistPermission(id, "catalog:submit");

      if (!(await requirePrimarySong(id, songId))) {
        return NextResponse.json({ error: "Track not found" }, { status: 404 });
      }

      const [songResult, artistResult, rightsResult, pendingRevision] =
        await Promise.all([
          supabaseServer
            .from("songs")
            .select("id, title, status, duration, created_at, submitted_at")
            .eq("id", songId)
            .maybeSingle(),
          supabaseServer
            .from("artists")
            .select("id, status")
            .eq("id", id)
            .maybeSingle(),
          supabaseServer
            .from("song_rights")
            .select("rights_confirmed")
            .eq("song_id", songId)
            .maybeSingle(),
          getSongPendingRevision(songId),
        ]);

      if (songResult.error) throw songResult.error;
      if (artistResult.error) throw artistResult.error;
      if (rightsResult.error) throw rightsResult.error;
      if (!songResult.data) {
        return NextResponse.json({ error: "Track not found" }, { status: 404 });
      }
      if (!artistResult.data || artistResult.data.status !== "approved") {
        return NextResponse.json(
          { error: "Artist profile must be approved before submitting music" },
          { status: 403 },
        );
      }

      if (pendingRevision) {
        if (pendingRevision.status !== "changes_requested") {
          return NextResponse.json(
            { error: "These track changes are already submitted for review" },
            { status: 409 },
          );
        }

        const pendingRightsConfirmed =
          pendingRevision.rights && typeof pendingRevision.rights === "object"
            ? pendingRevision.rights.rights_confirmed === true
            : rightsResult.data?.rights_confirmed === true;

        if (!pendingRightsConfirmed) {
          return NextResponse.json(
            {
              error:
                "Complete master and publishing ownership splits before resubmitting this track for review",
            },
            { status: 400 },
          );
        }

        const submittedAt = new Date().toISOString();
        const { data: submittedRevision, error: revisionError } =
          await supabaseServer
            .from("song_pending_revisions")
            .update({
              status: "submitted",
              review_notes: null,
              submitted_by_clerk_user_id: submitAccess.userId,
              updated_at: submittedAt,
            })
            .eq("song_id", songId)
            .eq("status", "changes_requested")
            .select("song_id, status, updated_at")
            .maybeSingle();

        if (revisionError) throw revisionError;
        if (!submittedRevision) {
          return NextResponse.json(
            { error: "Track changes changed before resubmission completed" },
            { status: 409 },
          );
        }

        const revisionTitle =
          pendingRevision.metadata &&
          typeof pendingRevision.metadata.title === "string"
            ? pendingRevision.metadata.title
            : songResult.data.title;
        await createResubmissionNotification(id, revisionTitle);

        return NextResponse.json({
          song: {
            ...songResult.data,
            title: revisionTitle,
            status: "submitted",
            revision_pending: true,
            live_status: songResult.data.status,
          },
          revision_pending: true,
          revision_status: submittedRevision.status,
          live_status: songResult.data.status,
        });
      }

      if (
        songResult.data.status !== "draft" &&
        songResult.data.status !== "changes_requested"
      ) {
        return NextResponse.json(
          { error: "This track cannot be submitted from its current status" },
          { status: 409 },
        );
      }
      if (!rightsResult.data?.rights_confirmed) {
        return NextResponse.json(
          {
            error:
              "Complete master and publishing ownership splits before submitting this track for review",
          },
          { status: 400 },
        );
      }

      const wasResubmission = songResult.data.status === "changes_requested";
      const submittedAt = new Date().toISOString();
      const { data: submittedSong, error: submitError } = await supabaseServer
        .from("songs")
        .update({ status: "submitted", submitted_at: submittedAt })
        .eq("id", songId)
        .select("id, title, status, duration, created_at, submitted_at")
        .single();

      if (submitError) throw submitError;

      if (wasResubmission) {
        await createResubmissionNotification(id, submittedSong.title);
      }

      return NextResponse.json({ song: submittedSong });
    }

    const access = await requireArtistPermission(id, "catalog:edit");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const { data: existingSong, error: songLookupError } = await supabaseServer
      .from("songs")
      .select(
        "id, title, status, duration, bpm, key, genres, moods, regions, instruments, builds, vocals, instrumental, explicit, created_at",
      )
      .eq("id", songId)
      .maybeSingle();

    if (songLookupError) throw songLookupError;
    if (!existingSong) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const usesPendingRevision = songStatusUsesPendingRevision(existingSong.status);
    if (
      existingSong.status !== "draft" &&
      existingSong.status !== "changes_requested" &&
      !usesPendingRevision
    ) {
      return NextResponse.json(
        { error: "This track cannot be edited from its current status" },
        { status: 409 },
      );
    }

    const metadata =
      payload.metadata && typeof payload.metadata === "object"
        ? (payload.metadata as Record<string, unknown>)
        : {};
    const credits = cleanCredits(payload.credits);
    const rights =
      payload.rights && typeof payload.rights === "object"
        ? (payload.rights as Record<string, unknown>)
        : null;
    const rightsHolders = cleanRightsHolders(payload.rights_holders);

    const title = cleanString(metadata.title, 160);
    if (!title) {
      return NextResponse.json(
        { error: "Track title is required" },
        { status: 400 },
      );
    }

    const bpm = cleanInteger(metadata.bpm, 1, 400);
    if (
      metadata.bpm !== null &&
      metadata.bpm !== undefined &&
      metadata.bpm !== "" &&
      bpm === null
    ) {
      return NextResponse.json(
        { error: "BPM must be between 1 and 400" },
        { status: 400 },
      );
    }

    let copyrightYear: number | null = null;
    let rightsConfirmed = false;

    if (rights) {
      await requireArtistPermission(id, "rights:edit");
      copyrightYear = cleanInteger(rights.copyright_year, 1900, 2200);

      if (
        rights.copyright_year !== null &&
        rights.copyright_year !== undefined &&
        rights.copyright_year !== "" &&
        copyrightYear === null
      ) {
        return NextResponse.json(
          { error: "Copyright year is invalid" },
          { status: 400 },
        );
      }

      const totals = getOwnershipTotals(rightsHolders);
      if (
        rightsHolders.length === 0 ||
        Math.abs(totals.master - 100) > 0.01 ||
        Math.abs(totals.publishing - 100) > 0.01
      ) {
        return NextResponse.json(
          {
            error:
              "Master and publishing ownership splits must each total 100% before saving",
          },
          { status: 400 },
        );
      }

      rightsConfirmed = true;
    }

    const cleanedMetadata = {
      title,
      bpm,
      key: cleanNullableString(metadata.key, 40),
      genres: cleanStringArray(metadata.genres),
      moods: cleanStringArray(metadata.moods),
      regions: cleanStringArray(metadata.regions),
      instruments: cleanStringArray(metadata.instruments),
      builds: cleanStringArray(metadata.builds),
      vocals: cleanStringArray(metadata.vocals),
      instrumental: Boolean(metadata.instrumental),
      explicit: Boolean(metadata.explicit),
    };
    const cleanedRights = rights
      ? {
          master_owner: cleanNullableString(rights.master_owner, 200),
          publishing_owner: cleanNullableString(rights.publishing_owner, 200),
          pro_affiliation: cleanNullableString(rights.pro_affiliation, 120),
          isrc: cleanNullableString(rights.isrc, 40),
          iswc: cleanNullableString(rights.iswc, 40),
          copyright_year: copyrightYear,
          rights_confirmed: rightsConfirmed,
          notes: cleanNullableString(rights.notes, 2000),
        }
      : null;

    if (usesPendingRevision) {
      const previousRevision = await getSongPendingRevision(songId);
      const revision = await upsertSongMetadataRevision({
        songId,
        userId: access.userId,
        metadata: cleanedMetadata,
        credits,
        rights: cleanedRights,
        rightsHolders: rights ? rightsHolders : null,
      });

      if (previousRevision?.status === "changes_requested") {
        await createResubmissionNotification(id, title);
      }

      return NextResponse.json({
        song: {
          ...existingSong,
          ...cleanedMetadata,
        },
        revision_pending: true,
        revision_status: revision.status,
        live_status: existingSong.status,
      });
    }

    const { data: song, error: songError } = await supabaseServer
      .from("songs")
      .update(cleanedMetadata)
      .eq("id", songId)
      .select(
        "id, title, status, duration, bpm, key, genres, moods, regions, instruments, builds, vocals, instrumental, explicit, created_at",
      )
      .single();

    if (songError) throw songError;

    const { error: creditsDeleteError } = await supabaseServer
      .from("song_credits")
      .delete()
      .eq("song_id", songId);
    if (creditsDeleteError) throw creditsDeleteError;

    if (credits.length > 0) {
      const { error: creditsInsertError } = await supabaseServer
        .from("song_credits")
        .insert(
          credits.map((credit, position) => ({
            song_id: songId,
            credit_name: credit.credit_name,
            credit_role: credit.credit_role,
            position,
          })),
        );
      if (creditsInsertError) throw creditsInsertError;
    }

    if (cleanedRights) {
      const { error: rightsError } = await supabaseServer
        .from("song_rights")
        .upsert(
          {
            song_id: songId,
            ...cleanedRights,
          },
          { onConflict: "song_id" },
        );
      if (rightsError) throw rightsError;

      const { error: holdersDeleteError } = await supabaseServer
        .from("song_rights_holders")
        .delete()
        .eq("song_id", songId);
      if (holdersDeleteError) throw holdersDeleteError;

      if (rightsHolders.length > 0) {
        const { error: holdersInsertError } = await supabaseServer
          .from("song_rights_holders")
          .insert(
            rightsHolders.map((holder) => ({
              song_id: songId,
              holder_name: holder.holder_name,
              rights_type: holder.rights_type,
              ownership_percent: holder.ownership_percent,
              pro_affiliation: holder.pro_affiliation,
              ipi_cae_number: holder.ipi_cae_number,
            })),
          );
        if (holdersInsertError) throw holdersInsertError;
      }
    }

    return NextResponse.json({ song, revision_pending: false });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to save artist song details:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save track details",
      },
      { status: 500 },
    );
  }
}
