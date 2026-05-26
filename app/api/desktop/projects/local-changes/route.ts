import { NextResponse } from "next/server";
import { getDesktopUserIdFromRequest } from "@/lib/desktopAuth";
import { normalizeProjectFolder } from "@/lib/projectFolders";
import { supabaseServer } from "@/lib/supabaseServer";

type LocalFileMove = {
  projectId?: string | number;
  id?: string;
  path?: string;
};

type LocalFolderCreate = {
  projectId?: string | number;
  path?: string;
};

type LocalFolderRemoval = {
  projectId?: string | number;
  id?: string;
};

type LocalFileRemoval = {
  projectId?: string | number;
  id?: string;
};

type ProjectFolderRow = {
  id: number;
  name: string;
  parent_folder_id: number | null;
};

function getNumericId(value: unknown) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function getIdFromDesktopNodeId(value: unknown, prefix: "asset" | "folder") {
  if (typeof value !== "string") return null;

  const expectedPrefix = `${prefix}:`;

  if (!value.startsWith(expectedPrefix)) return null;

  return getNumericId(value.slice(expectedPrefix.length));
}

function sanitizePathPart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRelativePath(value: unknown) {
  if (typeof value !== "string") return null;

  const cleanPath = value
    .split("/")
    .map(sanitizePathPart)
    .filter(Boolean)
    .join("/");

  if (!cleanPath || cleanPath.startsWith("/") || cleanPath.includes("..")) {
    return null;
  }

  return cleanPath;
}

function getParentPathFromFilePath(filePath: string) {
  return filePath.split("/").slice(0, -1).join("/");
}

function buildFolderPathMap(folders: ProjectFolderRow[]) {
  const foldersById = new Map(folders.map((folder) => [Number(folder.id), folder]));
  const pathsById = new Map<number, string>();
  const idsByPath = new Map<string, number>();

  function getFolderPath(folder: ProjectFolderRow): string {
    const cached = pathsById.get(folder.id);
    if (cached) return cached;

    const name = sanitizePathPart(folder.name || "Folder") || "Folder";
    const parent =
      folder.parent_folder_id == null
        ? null
        : foldersById.get(Number(folder.parent_folder_id)) ?? null;
    const path = parent ? `${getFolderPath(parent)}/${name}` : name;

    pathsById.set(folder.id, path);
    idsByPath.set(path, folder.id);

    return path;
  }

  folders.forEach(getFolderPath);

  return { idsByPath, pathsById };
}

async function getNextFolderPosition(projectId: number, parentFolderId: number | null) {
  let query = supabaseServer
    .from("project_folders")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1);

  query = parentFolderId == null
    ? query.is("parent_folder_id", null)
    : query.eq("parent_folder_id", parentFolderId);

  const { data, error } = await query;

  if (error) throw error;

  return data?.[0]?.position != null ? Number(data[0].position) + 1 : 0;
}

async function getProjectFolders(projectId: number, userId: string) {
  const { data, error } = await supabaseServer
    .from("project_folders")
    .select("id,name,parent_folder_id")
    .eq("project_id", projectId)
    .eq("clerk_user_id", userId);

  if (error) throw error;

  return (data ?? []) as ProjectFolderRow[];
}

async function ensureFolderPath({
  path,
  projectId,
  userId,
}: {
  path: string;
  projectId: number;
  userId: string;
}) {
  if (!path) return null;

  let folders = await getProjectFolders(projectId, userId);
  let { idsByPath } = buildFolderPathMap(folders);
  const existingId = idsByPath.get(path);

  if (existingId) return existingId;

  let parentFolderId: number | null = null;
  let currentPath = "";

  for (const segment of path.split("/").filter(Boolean)) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;

    const currentId = idsByPath.get(currentPath);

    if (currentId) {
      parentFolderId = currentId;
      continue;
    }

    const nextPosition = await getNextFolderPosition(projectId, parentFolderId);
    const { data, error } = await supabaseServer
      .from("project_folders")
      .insert({
        project_id: projectId,
        clerk_user_id: userId,
        name: segment,
        parent_folder_id: parentFolderId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    const folder = normalizeProjectFolder(data);
    parentFolderId = folder.id;
    folders = await getProjectFolders(projectId, userId);
    idsByPath = buildFolderPathMap(folders).idsByPath;
  }

  return parentFolderId;
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

async function getAllowedProjectIds(userId: string, rawProjectIds: unknown[]) {
  const projectIds = [
    ...new Set(
      rawProjectIds
        .map(getNumericId)
        .filter((value): value is number => value != null),
    ),
  ];

  if (projectIds.length === 0) return new Set<number>();

  const { data, error } = await supabaseServer
    .from("projects")
    .select("id")
    .eq("clerk_user_id", userId)
    .in("id", projectIds);

  if (error) throw error;

  return new Set((data ?? []).map((project) => Number(project.id)));
}

export async function POST(req: Request) {
  const userId = getDesktopUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const folderCreates = Array.isArray(body.folderCreates)
      ? (body.folderCreates as LocalFolderCreate[])
      : [];
    const fileMoves = Array.isArray(body.fileMoves)
      ? (body.fileMoves as LocalFileMove[])
      : [];
    const fileRemovals = Array.isArray(body.fileRemovals)
      ? (body.fileRemovals as LocalFileRemoval[])
      : [];
    const folderRemovals = Array.isArray(body.folderRemovals)
      ? (body.folderRemovals as LocalFolderRemoval[])
      : [];

    const allowedProjectIds = await getAllowedProjectIds(userId, [
      ...folderCreates.map((item) => item.projectId),
      ...fileMoves.map((item) => item.projectId),
      ...fileRemovals.map((item) => item.projectId),
      ...folderRemovals.map((item) => item.projectId),
    ]);

    let createdFolderCount = 0;
    let movedFileCount = 0;
    let removedAssetCount = 0;
    let removedFolderCount = 0;
    let ignoredFileAddCount = Number(body.ignoredFileAddCount || 0);

    const normalizedFolderCreates = folderCreates
      .map((item) => ({
        projectId: getNumericId(item.projectId),
        path: normalizeRelativePath(item.path),
      }))
      .filter((item): item is { projectId: number; path: string } =>
        item.projectId != null && allowedProjectIds.has(item.projectId) && Boolean(item.path),
      )
      .sort((a, b) => a.path.length - b.path.length);

    for (const folderCreate of normalizedFolderCreates) {
      const before = await getProjectFolders(folderCreate.projectId, userId);
      const beforePaths = buildFolderPathMap(before).idsByPath;

      if (beforePaths.has(folderCreate.path)) continue;

      await ensureFolderPath({
        path: folderCreate.path,
        projectId: folderCreate.projectId,
        userId,
      });
      createdFolderCount += 1;
    }

    for (const move of fileMoves) {
      const projectId = getNumericId(move.projectId);
      const assetId = getIdFromDesktopNodeId(move.id, "asset");
      const nextPath = normalizeRelativePath(move.path);

      if (!projectId || !assetId || !nextPath || !allowedProjectIds.has(projectId)) continue;

      const parentPath = getParentPathFromFilePath(nextPath);
      const folderId = parentPath
        ? await ensureFolderPath({ path: parentPath, projectId, userId })
        : null;

      const { error, count } = await supabaseServer
        .from("project_assets")
        .update({ folder_id: folderId })
        .eq("project_id", projectId)
        .eq("id", assetId)
        .select("id", { count: "exact" });

      if (error) throw error;

      movedFileCount += count ?? 0;
    }

    for (const removal of fileRemovals) {
      const projectId = getNumericId(removal.projectId);
      const assetId = getIdFromDesktopNodeId(removal.id, "asset");

      if (!projectId || !assetId || !allowedProjectIds.has(projectId)) continue;

      const { error, count } = await supabaseServer
        .from("project_assets")
        .delete({ count: "exact" })
        .eq("project_id", projectId)
        .eq("id", assetId);

      if (error) throw error;

      removedAssetCount += count ?? 0;
    }

    for (const removal of folderRemovals) {
      const projectId = getNumericId(removal.projectId);
      const folderId = getIdFromDesktopNodeId(removal.id, "folder");

      if (!projectId || !folderId || !allowedProjectIds.has(projectId)) continue;

      const folderRows = await getProjectFolders(projectId, userId);
      const allFolderIdsToDelete = getDescendantFolderIds({
        allFolders: folderRows,
        rootFolderIds: [folderId],
      });

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

    return NextResponse.json({
      createdFolderCount,
      movedFileCount,
      removedAssetCount,
      removedFolderCount,
      ignoredFileAddCount,
    });
  } catch (error) {
    console.error("Desktop local changes apply error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to apply local changes",
      },
      { status: 500 },
    );
  }
}
