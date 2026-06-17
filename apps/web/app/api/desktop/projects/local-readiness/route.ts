import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDesktopUserIdFromRequest } from "@/lib/desktopAuth";
import { supabaseServer } from "@/lib/supabaseServer";

type ProjectAssetReadinessMetadata = Record<string, unknown> & {
  sizeBytes?: number;
  desktopLocalReadiness?: {
    ready?: boolean;
    status?: string;
    sizeBytes?: number;
    updatedAt?: string;
    path?: string;
  };
};

type LocalReadinessFilePayload = {
  id?: string | number;
  ready?: boolean;
  status?: string;
  sizeBytes?: number;
  path?: string;
};

type LocalReadinessProjectPayload = {
  projectId?: string | number;
  files?: LocalReadinessFilePayload[];
};

type ProjectAssetRow = {
  id: number | string;
  project_id: number | string;
  asset_type?: string | null;
  asset_id?: string | number | null;
  metadata?: unknown;
};

type SongSizeRow = {
  id: string | number;
  size_bytes?: number | string | null;
};

function getNumericId(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getAssetIdFromDesktopNodeId(value: unknown) {
  if (typeof value === "number") return getNumericId(value);
  if (typeof value !== "string") return null;

  const trimmedValue = value.trim();
  const directNumericId = getNumericId(trimmedValue);
  if (directNumericId != null) return directNumericId;

  if (!trimmedValue.startsWith("asset:")) return null;
  return getNumericId(trimmedValue.slice("asset:".length));
}

function normalizeMetadata(value: unknown): ProjectAssetReadinessMetadata {
  return value && typeof value === "object" ? (value as ProjectAssetReadinessMetadata) : {};
}

function getMetadataSizeBytes(
  metadata: ProjectAssetReadinessMetadata,
  fallbackSizeBytes = 0,
) {
  const localSizeBytes = Number(metadata.desktopLocalReadiness?.sizeBytes || 0);
  if (localSizeBytes > 0) return localSizeBytes;

  const storedSizeBytes = Number(metadata.sizeBytes || 0);
  if (storedSizeBytes > 0) return storedSizeBytes;

  return fallbackSizeBytes > 0 ? fallbackSizeBytes : 0;
}

function isReady(metadata: ProjectAssetReadinessMetadata) {
  const readiness = metadata.desktopLocalReadiness;
  return readiness?.ready === true || readiness?.status === "ready";
}

function getUpdatedAt(metadata: ProjectAssetReadinessMetadata) {
  const value = metadata.desktopLocalReadiness?.updatedAt;
  return typeof value === "string" && value ? value : null;
}

async function getRequestUserId(req: Request) {
  const tokenUserId = getDesktopUserIdFromRequest(req);
  if (tokenUserId) return tokenUserId;

  const { userId } = await auth();
  return userId;
}

async function getOwnedProjectIds(userId: string, requestedProjectId?: number | null) {
  let query = supabaseServer.from("projects").select("id").eq("clerk_user_id", userId);

  if (requestedProjectId != null) {
    query = query.eq("id", requestedProjectId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((project) => Number(project.id)).filter(Number.isFinite);
}

async function getSongSizeMap(assets: ProjectAssetRow[]) {
  const songIds = [
    ...new Set(
      assets
        .filter((asset) => asset.asset_type === "song")
        .map((asset) => String(asset.asset_id || ""))
        .filter(Boolean),
    ),
  ];

  if (songIds.length === 0) return new Map<string, number>();

  const { data, error } = await supabaseServer
    .from("songs")
    .select("id, size_bytes")
    .in("id", songIds);

  if (error) throw error;

  return new Map(
    ((data ?? []) as SongSizeRow[]).flatMap((song) => {
      const sizeBytes = Number(song.size_bytes || 0);
      return sizeBytes > 0 ? [[String(song.id), sizeBytes] as const] : [];
    }),
  );
}

export async function GET(req: Request) {
  const userId = await getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const requestedProjectId = getNumericId(url.searchParams.get("projectId"));
    const projectIds = await getOwnedProjectIds(userId, requestedProjectId);

    if (projectIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    const { data: assets, error } = await supabaseServer
      .from("project_assets")
      .select("id, project_id, asset_type, asset_id, metadata")
      .in("project_id", projectIds);

    if (error) throw error;

    const assetRows = (assets ?? []) as ProjectAssetRow[];
    const songSizeById = await getSongSizeMap(assetRows);

    const summaries = new Map<
      number,
      {
        id: string;
        totalFiles: number;
        readyFiles: number;
        sizeBytes: number;
        updatedAt: string | null;
      }
    >();

    projectIds.forEach((projectId) => {
      summaries.set(projectId, {
        id: String(projectId),
        totalFiles: 0,
        readyFiles: 0,
        sizeBytes: 0,
        updatedAt: null,
      });
    });

    assetRows.forEach((asset) => {
      const projectId = Number(asset.project_id);
      const summary = summaries.get(projectId);
      if (!summary) return;

      const metadata = normalizeMetadata(asset.metadata);
      const updatedAt = getUpdatedAt(metadata);
      const songSizeBytes =
        asset.asset_type === "song"
          ? songSizeById.get(String(asset.asset_id || "")) ?? 0
          : 0;

      summary.totalFiles += 1;
      summary.sizeBytes += getMetadataSizeBytes(metadata, songSizeBytes);

      if (isReady(metadata)) {
        summary.readyFiles += 1;
      }

      if (updatedAt && (!summary.updatedAt || updatedAt > summary.updatedAt)) {
        summary.updatedAt = updatedAt;
      }
    });

    return NextResponse.json({ projects: [...summaries.values()] });
  } catch (error) {
    console.error("Desktop local readiness fetch error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load desktop local readiness",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const userId = await getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { projects?: LocalReadinessProjectPayload[] };
    const projectPayloads = Array.isArray(body.projects) ? body.projects : [];
    const requestedProjectIds = [
      ...new Set(
        projectPayloads
          .map((project) => getNumericId(project.projectId))
          .filter((projectId): projectId is number => projectId != null),
      ),
    ];

    if (requestedProjectIds.length === 0) {
      return NextResponse.json({ updatedFileCount: 0 });
    }

    const ownedProjectIds = new Set(await getOwnedProjectIds(userId));
    const allowedProjectIds = new Set(
      requestedProjectIds.filter((projectId) => ownedProjectIds.has(projectId)),
    );

    if (allowedProjectIds.size === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const filePayloads = projectPayloads.flatMap((project) => {
      const projectId = getNumericId(project.projectId);
      if (projectId == null || !allowedProjectIds.has(projectId)) return [];

      return (project.files ?? [])
        .map((file) => {
          const assetId = getAssetIdFromDesktopNodeId(file.id);
          if (assetId == null) return null;

          return {
            ...file,
            assetId,
            projectId,
          };
        })
        .filter(Boolean) as Array<
        LocalReadinessFilePayload & { assetId: number; projectId: number }
      >;
    });

    if (filePayloads.length === 0) {
      return NextResponse.json({ updatedFileCount: 0 });
    }

    const assetIds = [...new Set(filePayloads.map((file) => file.assetId))];
    const { data: existingAssets, error: existingAssetsError } = await supabaseServer
      .from("project_assets")
      .select("id, project_id, metadata")
      .in("id", assetIds)
      .in("project_id", [...allowedProjectIds]);

    if (existingAssetsError) throw existingAssetsError;

    const assetsById = new Map(
      (existingAssets ?? []).map((asset) => [Number(asset.id), asset]),
    );
    let updatedFileCount = 0;
    const updatedAt = new Date().toISOString();

    for (const file of filePayloads) {
      const existingAsset = assetsById.get(file.assetId);
      if (!existingAsset || Number(existingAsset.project_id) !== file.projectId) continue;

      const metadata = normalizeMetadata(existingAsset.metadata);
      const sizeBytes = Number(file.sizeBytes || 0);
      const status = file.ready === true ? "ready" : file.status || "missing";

      const { error } = await supabaseServer
        .from("project_assets")
        .update({
          metadata: {
            ...metadata,
            desktopLocalReadiness: {
              ready: file.ready === true || status === "ready",
              status,
              sizeBytes: sizeBytes > 0 ? sizeBytes : undefined,
              path: typeof file.path === "string" ? file.path : undefined,
              updatedAt,
            },
          },
        })
        .eq("id", file.assetId)
        .eq("project_id", file.projectId);

      if (error) throw error;
      updatedFileCount += 1;
    }

    return NextResponse.json({ updatedFileCount });
  } catch (error) {
    console.error("Desktop local readiness update error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update desktop local readiness",
      },
      { status: 500 },
    );
  }
}