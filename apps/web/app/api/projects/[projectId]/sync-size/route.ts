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

    const songSizeById = new Map(
      ((songsError ? [] : songRows ?? []) as SongSizeRow[]).flatMap((song) => {
        const sizeBytes = getSongSizeBytes(song);
        return sizeBytes ? [[String(song.id), sizeBytes] as const] : [];
      }),
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
        const songSizeBytes = songSizeById.get(String(asset.asset_id)) ?? null;

        if (songSizeBytes) {
          sizeBytes += songSizeBytes;
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
