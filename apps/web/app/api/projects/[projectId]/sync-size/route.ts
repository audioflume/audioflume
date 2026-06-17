import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

type ProjectAssetSizeRow = {
  id: number;
  asset_type: string | null;
  asset_id: string | number | null;
  metadata: Record<string, unknown> | null;
};

type SongSizeRow = {
  id: string | number;
  size_bytes?: number | string | null;
  audio_url?: string | null;
  playback_url?: string | null;
  audioUrl?: string | null;
  playbackUrl?: string | null;
};

async function getProjectId(context: RouteContext) {
  const params = await context.params;
  return params.projectId;
}

async function verifyProject(projectId: string, userId: string) {
  const { data: project, error } = await supabaseServer
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("clerk_user_id", userId)
    .single();

  if (error || !project) return null;

  return project;
}

function getPositiveSizeBytes(value: unknown) {
  const sizeBytes = Number(value || 0);
  return Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : null;
}

function getMetadataSizeBytes(metadata: ProjectAssetSizeRow["metadata"]) {
  return getPositiveSizeBytes(metadata?.sizeBytes);
}

function getSongSizeBytes(song: SongSizeRow | undefined) {
  return getPositiveSizeBytes(song?.size_bytes);
}

function getSongAudioUrl(song: SongSizeRow | undefined) {
  const url =
    song?.audio_url ||
    song?.playback_url ||
    song?.audioUrl ||
    song?.playbackUrl ||
    "";

  return typeof url === "string" && url.trim() ? url.trim() : null;
}

function getContentRangeSizeBytes(contentRange: string | null) {
  if (!contentRange) return null;

  const match = contentRange.match(/\/(\d+)$/);
  if (!match) return null;

  return getPositiveSizeBytes(match[1]);
}

async function getRemoteFileSizeBytes(url: string) {
  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    const headSizeBytes = getPositiveSizeBytes(
      headResponse.headers.get("content-length"),
    );

    if (headSizeBytes) return headSizeBytes;
  } catch {
    // Fall through to range request below.
  }

  try {
    const rangeResponse = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
    });

    const rangeSizeBytes = getContentRangeSizeBytes(
      rangeResponse.headers.get("content-range"),
    );

    if (rangeSizeBytes) return rangeSizeBytes;

    return getPositiveSizeBytes(rangeResponse.headers.get("content-length"));
  } catch {
    return null;
  }
}

async function persistResolvedSizeBytes({
  asset,
  song,
  sizeBytes,
}: {
  asset: ProjectAssetSizeRow;
  song: SongSizeRow | undefined;
  sizeBytes: number;
}) {
  const updates: Promise<unknown>[] = [];

  if (song?.id != null && !getSongSizeBytes(song)) {
    updates.push(
      supabaseServer
        .from("songs")
        .update({ size_bytes: sizeBytes })
        .eq("id", song.id),
    );
  }

  if (!getMetadataSizeBytes(asset.metadata)) {
    updates.push(
      supabaseServer
        .from("project_assets")
        .update({
          metadata: {
            ...(asset.metadata ?? {}),
            sizeBytes,
          },
        })
        .eq("id", asset.id),
    );
  }

  if (updates.length === 0) return;

  await Promise.allSettled(updates);
}

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = await getProjectId(context);
  const project = await verifyProject(projectId, userId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const { data: assetRows, error: assetsError } = await supabaseServer
      .from("project_assets")
      .select("id, asset_type, asset_id, metadata")
      .eq("project_id", projectId);

    if (assetsError) throw assetsError;

    const assets = (assetRows ?? []) as ProjectAssetSizeRow[];
    const songIds = [
      ...new Set(
        assets
          .filter((asset) => asset.asset_type === "song" && asset.asset_id != null)
          .map((asset) => String(asset.asset_id)),
      ),
    ];

    const { data: songRows, error: songsError } = songIds.length
      ? await supabaseServer.from("songs").select("*").in("id", songIds)
      : { data: [], error: null };

    if (songsError) {
      console.warn("Project sync size song-size lookup failed", songsError);
    }

    const songById = new Map(
      ((songsError ? [] : songRows ?? []) as SongSizeRow[]).map((song) => [
        String(song.id),
        song,
      ]),
    );

    let sizeBytes = 0;
    let missingSizeCount = 0;

    for (const asset of assets) {
      const metadataSizeBytes = getMetadataSizeBytes(asset.metadata);

      if (metadataSizeBytes) {
        sizeBytes += metadataSizeBytes;
        continue;
      }

      if (asset.asset_type === "song" && asset.asset_id != null) {
        const song = songById.get(String(asset.asset_id));
        const songSizeBytes = getSongSizeBytes(song);

        if (songSizeBytes) {
          sizeBytes += songSizeBytes;
          continue;
        }

        const songUrl = getSongAudioUrl(song);
        const remoteSizeBytes = songUrl
          ? await getRemoteFileSizeBytes(songUrl)
          : null;

        if (remoteSizeBytes) {
          sizeBytes += remoteSizeBytes;
          await persistResolvedSizeBytes({ asset, song, sizeBytes: remoteSizeBytes });
          continue;
        }
      }

      missingSizeCount += 1;
    }

    return NextResponse.json({
      sizeBytes,
      missingSizeCount,
      totalAssetCount: assets.length,
    });
  } catch (error) {
    console.error("Project sync size fetch error:", error);

    return NextResponse.json({
      sizeBytes: 0,
      missingSizeCount: 0,
      totalAssetCount: 0,
      warning:
        error instanceof Error ? error.message : "Failed to calculate project sync size",
    });
  }
}
