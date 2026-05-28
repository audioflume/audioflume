import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  ensureDefaultProjectFolders,
  normalizeProjectAsset,
  normalizeProjectFolder,
} from "@/lib/projectFolders";
import { createProjectSyncOperation } from "@/lib/projectSyncOperations";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

type FolderCountRow = {
  id: number;
  parent_folder_id: number | null;
};

async function getProjectId(context: RouteContext) {
  const params = await context.params;
  return params.projectId;
}

async function getOwnedProject(projectId: string, userId: string) {
  const { data: project, error } = await supabaseServer
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("clerk_user_id", userId)
    .single();

  if (error || !project) return null;

  return project;
}

async function getNextFolderPosition(projectId: string, parentFolderId: number | null) {
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

function getDescendantFolderIds(folderId: number, folders: FolderCountRow[]) {
  const ids = new Set<number>([folderId]);
  let changed = true;

  while (changed) {
    changed = false;

    folders.forEach((folder) => {
      const id = Number(folder.id);
      const parentId = folder.parent_folder_id == null ? null : Number(folder.parent_folder_id);

      if (parentId != null && Number.isFinite(parentId) && ids.has(parentId) && !ids.has(id)) {
        ids.add(id);
        changed = true;
      }
    });
  }

  return ids;
}

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projectId = await getProjectId(context);
    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await ensureDefaultProjectFolders({
      supabase: supabaseServer,
      projectId,
      userId,
    });

    const [{ data: folders, error: foldersError }, { data: assets, error: assetsError }] =
      await Promise.all([
        supabaseServer
          .from("project_folders")
          .select("*")
          .eq("project_id", projectId)
          .eq("clerk_user_id", userId)
          .order("position", { ascending: true })
          .order("name", { ascending: true }),
        supabaseServer
          .from("project_assets")
          .select("*")
          .eq("project_id", projectId)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

    if (foldersError) throw foldersError;
    if (assetsError) throw assetsError;

    const normalizedFolders = (folders ?? []).map(normalizeProjectFolder);
    const normalizedAssets = (assets ?? []).map(normalizeProjectAsset);

    const childCounts = new Map<number, number>();
    const assetCounts = new Map<number, number>();
    const recursiveAssetCounts = new Map<number, number>();

    normalizedFolders.forEach((folder) => {
      if (folder.parent_folder_id == null) return;
      childCounts.set(folder.parent_folder_id, (childCounts.get(folder.parent_folder_id) ?? 0) + 1);
    });

    normalizedAssets.forEach((asset) => {
      if (asset.folder_id == null) return;
      assetCounts.set(asset.folder_id, (assetCounts.get(asset.folder_id) ?? 0) + 1);
    });

    normalizedFolders.forEach((folder) => {
      const descendantFolderIds = getDescendantFolderIds(folder.id, normalizedFolders);
      const recursiveAssetCount = normalizedAssets.filter((asset) => {
        if (asset.folder_id == null) return false;
        return descendantFolderIds.has(asset.folder_id);
      }).length;

      recursiveAssetCounts.set(folder.id, recursiveAssetCount);
    });

    return NextResponse.json({
      folders: normalizedFolders.map((folder) => ({
        ...folder,
        child_count: childCounts.get(folder.id) ?? 0,
        asset_count: assetCounts.get(folder.id) ?? 0,
        recursive_asset_count: recursiveAssetCounts.get(folder.id) ?? 0,
      })),
      assets: normalizedAssets,
    });
  } catch (err) {
    console.error("Project folders fetch error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load project folders" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projectId = await getProjectId(context);
    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const cleanName = typeof body.name === "string" ? body.name.trim() : "";
    const parentFolderId =
      body.parent_folder_id === null || body.parent_folder_id === undefined
        ? null
        : Number(body.parent_folder_id);
    const assetType =
      body.asset_type === "song" ||
      body.asset_type === "sound-fx" ||
      body.asset_type === "visual-fx" ||
      body.asset_type === "colour-grading"
        ? body.asset_type
        : null;

    if (!cleanName) {
      return NextResponse.json({ error: "Folder name required" }, { status: 400 });
    }

    if (parentFolderId !== null && !Number.isFinite(parentFolderId)) {
      return NextResponse.json({ error: "Invalid parent folder" }, { status: 400 });
    }

    if (parentFolderId !== null) {
      const { data: parent, error: parentError } = await supabaseServer
        .from("project_folders")
        .select("id")
        .eq("id", parentFolderId)
        .eq("project_id", projectId)
        .eq("clerk_user_id", userId)
        .single();

      if (parentError || !parent) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
    }

    const nextPosition = await getNextFolderPosition(projectId, parentFolderId);

    const { data, error } = await supabaseServer
      .from("project_folders")
      .insert({
        project_id: projectId,
        clerk_user_id: userId,
        name: cleanName,
        asset_type: assetType,
        parent_folder_id: parentFolderId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    await createProjectSyncOperation({
      projectId,
      userId,
      sourceClient: "website",
      operationType: "create_folder",
      websiteDone: true,
      desktopDone: false,
    });

    return NextResponse.json(normalizeProjectFolder(data));
  } catch (err) {
    console.error("Project folder create error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create folder" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projectId = await getProjectId(context);
    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const folderId = Number(body.folder_id);
    const cleanName = typeof body.name === "string" ? body.name.trim() : undefined;
    const isMoveRequest = "parent_folder_id" in body;
    const parentFolderId =
      body.parent_folder_id === null || body.parent_folder_id === undefined
        ? null
        : Number(body.parent_folder_id);

    if (!Number.isFinite(folderId)) {
      return NextResponse.json({ error: "Missing folder_id" }, { status: 400 });
    }

    if (cleanName !== undefined && !cleanName) {
      return NextResponse.json({ error: "Folder name required" }, { status: 400 });
    }

    if (isMoveRequest && parentFolderId !== null && !Number.isFinite(parentFolderId)) {
      return NextResponse.json({ error: "Invalid parent folder" }, { status: 400 });
    }

    if (isMoveRequest && parentFolderId === folderId) {
      return NextResponse.json({ error: "Folder cannot move into itself" }, { status: 400 });
    }

    const { data: folders, error: foldersError } = await supabaseServer
      .from("project_folders")
      .select("id,parent_folder_id")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId);

    if (foldersError) throw foldersError;

    const folderRows = folders ?? [];
    const folderIds = new Set(folderRows.map((folder) => Number(folder.id)));

    if (!folderIds.has(folderId)) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    if (isMoveRequest && parentFolderId !== null && !folderIds.has(parentFolderId)) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }

    if (isMoveRequest && parentFolderId !== null) {
      const byId = new Map(folderRows.map((folder) => [Number(folder.id), Number(folder.parent_folder_id)]));
      const visited = new Set<number>();
      let current: number | null = parentFolderId;

      while (current !== null && Number.isFinite(current) && !visited.has(current)) {
        if (current === folderId) {
          return NextResponse.json({ error: "Folder cannot move into its own child" }, { status: 400 });
        }

        visited.add(current);
        const nextParent = byId.get(current);
        current = nextParent == null || !Number.isFinite(nextParent) ? null : nextParent;
      }
    }

    const updatePayload: Record<string, string | number | null> = {};

    if (cleanName !== undefined) updatePayload.name = cleanName;

    if (isMoveRequest) {
      const nextPosition = await getNextFolderPosition(projectId, parentFolderId);
      updatePayload.parent_folder_id = parentFolderId;
      updatePayload.position = nextPosition;
    }

    const { data, error } = await supabaseServer
      .from("project_folders")
      .update(updatePayload)
      .eq("id", folderId)
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error) throw error;

    await createProjectSyncOperation({
      projectId,
      userId,
      sourceClient: "website",
      operationType: isMoveRequest ? "update_folder" : "update_folder",
      websiteDone: true,
      desktopDone: false,
    });

    return NextResponse.json(normalizeProjectFolder(data));
  } catch (err) {
    console.error("Project folder update error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update project folder" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projectId = await getProjectId(context);
    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const folderId = Number(body.folder_id);

    if (!Number.isFinite(folderId)) {
      return NextResponse.json({ error: "Missing folder_id" }, { status: 400 });
    }

    const { data: folders, error: foldersError } = await supabaseServer
      .from("project_folders")
      .select("id,parent_folder_id")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId);

    if (foldersError) throw foldersError;

    const folderRows = folders ?? [];
    const folderIds = new Set(folderRows.map((folder) => Number(folder.id)));

    if (!folderIds.has(folderId)) {
      return NextResponse.json({ deleted_folder_ids: [], already_deleted: true });
    }

    const ids = Array.from(getDescendantFolderIds(folderId, folderRows));

    const { error: assetDeleteError } = await supabaseServer
      .from("project_assets")
      .delete()
      .eq("project_id", projectId)
      .in("folder_id", ids);

    if (assetDeleteError) throw assetDeleteError;

    const { error: folderDeleteError } = await supabaseServer
      .from("project_folders")
      .delete()
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .in("id", ids);

    if (folderDeleteError) throw folderDeleteError;

    await createProjectSyncOperation({
      projectId,
      userId,
      sourceClient: "website",
      operationType: "delete_folder",
      websiteDone: true,
      desktopDone: false,
    });

    return NextResponse.json({ deleted_folder_ids: ids });
  } catch (err) {
    console.error("Project folder delete error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete project folder" },
      { status: 500 },
    );
  }
}
