import { NextResponse } from "next/server";
import { getDesktopUserIdFromRequest } from "@/lib/desktopAuth";
import { normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";
import type { ProjectAsset, ProjectFolder, Song } from "@/lib/types";

type LocalRemovalRequestItem = {
  projectId?: string | number;
  id?: string | number;
  type?: "file" | "folder";
  assetId?: string | number | null;
  folderId?: string | number | null;
  name?: string | null;
  path?: string | null;
};

type NormalizedRemoval =
  | {
      projectId: number;
      type: "file";
      assetId: number | null;
      path: string | null;
    }
  | {
      projectId: number;
      type: "folder";
      folderId: number | null;
      path: string | null;
    };

type ProjectFolderRow = {
  id: number;
  parent_folder_id: number | null;
};

type SongRow = Record<string, unknown> & {
  id?: string;
  updated_at?: string;
  created_at?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function getNumericId(value: unknown) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function getIdFromDesktopNodeId(value: unknown, prefix: "asset" | "folder") {
  if (typeof value === "number") return getNumericId(value);

  if (typeof value !== "string") return null;

  const trimmedValue = value.trim();
  const directNumericId = getNumericId(trimmedValue);

  if (directNumericId != null) return directNumericId;

  const expectedPrefix = `${prefix}:`;

  if (!trimmedValue.startsWith(expectedPrefix)) return null;

  return getNumericId(trimmedValue.slice(expectedPrefix.length));
}

function sanitizeFilenamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRelativePath(value: unknown) {
  if (typeof value !== "string") return null;

  const cleanPath = value
    .split("/")
    .map(sanitizeFilenamePart)
    .filter(Boolean)
    .join("/");

  if (!cleanPath || cleanPath.startsWith("/") || cleanPath.includes("..")) {
    return null;
  }

  return cleanPath;
}

function joinPath(parts: string[]) {
  return parts.filter(Boolean).join("/");
}

function getUrlFilename(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const filename = decodeURIComponent(pathname.split("/").pop() || "").trim();
    return filename || null;
  } catch {
    return null;
  }
}

function getFilenameExtension(filename: string | null) {
  if (!filename) return null;

  const match = filename.match(/\.[a-z0-9]{2,8}$/i);
  return match?.[0] ?? null;
}

function getSongFilename(song: Song) {
  const urlFilename = getUrlFilename(song.audioUrl || song.playbackUrl || "");
  const extension = getFilenameExtension(urlFilename) ?? ".mp3";
  const title = sanitizeFilenamePart(song.title || "Untitled");
  const artist = sanitizeFilenamePart(song.artist || "Filmwave");

  return `${title} - ${artist}${extension}`;
}

function getFallbackAssetFilename(asset: ProjectAsset) {
  const metadata = asset.metadata ?? {};
  const rawFilename =
    typeof metadata.filename === "string" && metadata.filename.trim()
      ? metadata.filename.trim()
      : `${asset.asset_type}-${asset.id}.txt`;

  return sanitizeFilenamePart(rawFilename) || `${asset.asset_type}-${asset.id}.txt`;
}

function normalizeRemoval(item: LocalRemovalRequestItem): NormalizedRemoval | null {
  const projectId = getNumericId(item.projectId);
  const path = normalizeRelativePath(item.path);

  if (!projectId) return null;

  if (item.type === "file") {
    const assetId =
      getNumericId(item.assetId) ?? getIdFromDesktopNodeId(item.id, "asset");

    if (!assetId && !path) return null;

    return {
      projectId,
      type: "file" as const,
      assetId,
      path,
    };
  }

  if (item.type === "folder") {
    const folderId =
      getNumericId(item.folderId) ?? getIdFromDesktopNodeId(item.id, "folder");

    if (!folderId && !path) return null;

    return {
      projectId,
      type: "folder" as const,
      folderId,
      path,
    };
  }

  return null;
}

function buildFolderPaths(folders: ProjectFolder[]) {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const cache = new Map<number, string>();

  function getFolderPath(folder: ProjectFolder): string {
    const cached = cache.get(folder.id);
    if (cached) return cached;

    const folderName = sanitizeFilenamePart(folder.name || "Folder") || "Folder";
    const parent =
      folder.parent_folder_id == null
        ? null
        : foldersById.get(folder.parent_folder_id) ?? null;
    const path = parent ? joinPath([getFolderPath(parent), folderName]) : folderName;

    cache.set(folder.id, path);

    return path;
  }

  folders.forEach(getFolderPath);

  return cache;
}

function getDescendantFolderIds({
  allFolders,
  rootFolderIds,
}: {
  allFolders: ProjectFolderRow[];
  rootFolderIds: number[];
}) {
  const folderIds = new Set(rootFolderIds);
  let changed = true;

  while (changed) {
    changed = false;

    for (const folder of allFolders) {
      if (
        folder.parent_folder_id != null &&
        folderIds.has(folder.parent_folder_id) &&
        !folderIds.has(folder.id)
      ) {
        folderIds.add(folder.id);
        changed = true;
      }
    }
  }

  return [...folderIds];
}

async function resolveAssetIdsByPath({
  assets,
  folders,
  removalPaths,
}: {
  assets: ProjectAsset[];
  folders: ProjectFolder[];
  removalPaths: string[];
}) {
  if (removalPaths.length === 0) return [];

  const songIds = [
    ...new Set(
      assets
        .filter((asset) => asset.asset_type === "song")
        .map((asset) => String(asset.asset_id || ""))
        .filter(isUuid),
    ),
  ];

  const { data: songRows, error: songsError } =
    songIds.length > 0
      ? await supabaseServer.from("songs").select("*").in("id", songIds)
      : { data: [], error: null };

  if (songsError) throw songsError;

  const songsById = new Map(
    (songRows ?? []).map((row) => {
      const song = normalizeSongRow(row as SongRow);
      return [String(song.id), song];
    }),
  );
  const folderPaths = buildFolderPaths(folders);
  const assetIds: number[] = [];
  const removalPathSet = new Set(removalPaths);

  for (const asset of assets) {
    const parentPath = asset.folder_id == null ? "" : folderPaths.get(asset.folder_id) ?? "";
    const filename =
      asset.asset_type === "song"
        ? getSongFilename(songsById.get(String(asset.asset_id)) as Song)
        : getFallbackAssetFilename(asset);
    const assetPath = joinPath([parentPath, filename]);

    if (removalPathSet.has(assetPath)) {
      assetIds.push(asset.id);
    }
  }

  return assetIds;
}

function resolveFolderIdsByPath({
  folders,
  removalPaths,
}: {
  folders: ProjectFolder[];
  removalPaths: string[];
}) {
  if (removalPaths.length === 0) return [];

  const folderPaths = buildFolderPaths(folders);
  const removalPathSet = new Set(removalPaths);
  const folderIds: number[] = [];

  for (const folder of folders) {
    const folderPath = folderPaths.get(folder.id);

    if (folderPath && removalPathSet.has(folderPath)) {
      folderIds.push(folder.id);
    }
  }

  return folderIds;
}

export async function POST(req: Request) {
  const userId = getDesktopUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const removals = Array.isArray(body.removals)
      ? (body.removals as LocalRemovalRequestItem[]).map(normalizeRemoval).filter((item): item is NormalizedRemoval => Boolean(item))
      : [];

    if (removals.length === 0) {
      return NextResponse.json({
        removedAssetCount: 0,
        removedFolderCount: 0,
        requestedRemovalCount: 0,
        resolvedAssetIds: [],
        resolvedFolderIds: [],
      });
    }

    const projectIds = [...new Set(removals.map((item) => item.projectId))];

    const { data: projectRows, error: projectsError } = await supabaseServer
      .from("projects")
      .select("id")
      .eq("clerk_user_id", userId)
      .in("id", projectIds);

    if (projectsError) throw projectsError;

    const allowedProjectIds = new Set(
      (projectRows ?? []).map((project) => Number(project.id)),
    );
    const allowedRemovals = removals.filter((item) =>
      allowedProjectIds.has(Number(item.projectId)),
    );

    const assetIdsByProjectId = new Map<number, number[]>();
    const folderIdsByProjectId = new Map<number, number[]>();
    const assetPathsByProjectId = new Map<number, string[]>();
    const folderPathsByProjectId = new Map<number, string[]>();

    for (const removal of allowedRemovals) {
      if (removal.type === "file") {
        if (removal.assetId != null) {
          const current = assetIdsByProjectId.get(removal.projectId) ?? [];
          current.push(removal.assetId);
          assetIdsByProjectId.set(removal.projectId, current);
        }

        if (removal.path) {
          const current = assetPathsByProjectId.get(removal.projectId) ?? [];
          current.push(removal.path);
          assetPathsByProjectId.set(removal.projectId, current);
        }
      }

      if (removal.type === "folder") {
        if (removal.folderId != null) {
          const current = folderIdsByProjectId.get(removal.projectId) ?? [];
          current.push(removal.folderId);
          folderIdsByProjectId.set(removal.projectId, current);
        }

        if (removal.path) {
          const current = folderPathsByProjectId.get(removal.projectId) ?? [];
          current.push(removal.path);
          folderPathsByProjectId.set(removal.projectId, current);
        }
      }
    }

    for (const projectId of allowedProjectIds) {
      const assetPaths = assetPathsByProjectId.get(projectId) ?? [];
      const folderPaths = folderPathsByProjectId.get(projectId) ?? [];

      if (assetPaths.length === 0 && folderPaths.length === 0) continue;

      const [{ data: folderRows, error: foldersError }, { data: assetRows, error: assetsError }] =
        await Promise.all([
          supabaseServer
            .from("project_folders")
            .select("*")
            .eq("project_id", projectId)
            .eq("clerk_user_id", userId),
          supabaseServer
            .from("project_assets")
            .select("*")
            .eq("project_id", projectId),
        ]);

      if (foldersError) throw foldersError;
      if (assetsError) throw assetsError;

      const folders = (folderRows ?? []) as ProjectFolder[];
      const assets = (assetRows ?? []) as ProjectAsset[];

      if (folderPaths.length > 0) {
        const resolvedFolderIds = resolveFolderIdsByPath({ folders, removalPaths: folderPaths });
        const current = folderIdsByProjectId.get(projectId) ?? [];
        folderIdsByProjectId.set(projectId, [...current, ...resolvedFolderIds]);
      }

      if (assetPaths.length > 0) {
        const resolvedAssetIds = await resolveAssetIdsByPath({
          assets,
          folders,
          removalPaths: assetPaths,
        });
        const current = assetIdsByProjectId.get(projectId) ?? [];
        assetIdsByProjectId.set(projectId, [...current, ...resolvedAssetIds]);
      }
    }

    let removedAssetCount = 0;
    let removedFolderCount = 0;
    const resolvedAssetIdsForDebug: number[] = [];
    const resolvedFolderIdsForDebug: number[] = [];

    for (const [projectId, folderIds] of folderIdsByProjectId) {
      const uniqueFolderIds = [...new Set(folderIds)];

      if (uniqueFolderIds.length === 0) continue;

      resolvedFolderIdsForDebug.push(...uniqueFolderIds);

      const { data: folderRows, error: foldersError } = await supabaseServer
        .from("project_folders")
        .select("id,parent_folder_id")
        .eq("project_id", projectId)
        .eq("clerk_user_id", userId);

      if (foldersError) throw foldersError;

      const allFolderIdsToDelete = getDescendantFolderIds({
        allFolders: (folderRows ?? []) as ProjectFolderRow[],
        rootFolderIds: uniqueFolderIds,
      });

      if (allFolderIdsToDelete.length === 0) continue;

      const { error: assetDeleteError, count: assetCount } = await supabaseServer
        .from("project_assets")
        .delete({ count: "exact" })
        .eq("project_id", projectId)
        .in("folder_id", allFolderIdsToDelete);

      if (assetDeleteError) throw assetDeleteError;

      removedAssetCount += assetCount ?? 0;

      const { error: folderDeleteError, count: folderCount } = await supabaseServer
        .from("project_folders")
        .delete({ count: "exact" })
        .eq("project_id", projectId)
        .eq("clerk_user_id", userId)
        .in("id", allFolderIdsToDelete);

      if (folderDeleteError) throw folderDeleteError;

      removedFolderCount += folderCount ?? 0;
    }

    for (const [projectId, assetIds] of assetIdsByProjectId) {
      const uniqueAssetIds = [...new Set(assetIds)];

      if (uniqueAssetIds.length === 0) continue;

      resolvedAssetIdsForDebug.push(...uniqueAssetIds);

      const { error, count } = await supabaseServer
        .from("project_assets")
        .delete({ count: "exact" })
        .eq("project_id", projectId)
        .in("id", uniqueAssetIds);

      if (error) throw error;

      removedAssetCount += count ?? 0;
    }

    return NextResponse.json({
      removedAssetCount,
      removedFolderCount,
      requestedRemovalCount: removals.length,
      resolvedAssetIds: resolvedAssetIdsForDebug,
      resolvedFolderIds: resolvedFolderIdsForDebug,
    });
  } catch (error) {
    console.error("Desktop local removals apply error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to apply local removals",
      },
      { status: 500 },
    );
  }
}
