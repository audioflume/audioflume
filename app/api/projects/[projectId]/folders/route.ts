import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  ensureDefaultProjectFolders,
  normalizeProjectAsset,
  normalizeProjectFolder,
} from "@/lib/projectFolders";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
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

  query = parentFolderId == null ? query.is("parent_folder_id", null) : query.eq("parent_folder_id", parentFolderId);

  const { data, error } = await query;

  if (error) throw error;

  return data?.[0]?.position != null ? Number(data[0].position) + 1 : 0;
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

    normalizedFolders.forEach((folder) => {
      if (folder.parent_folder_id == null) return;
      childCounts.set(
        folder.parent_folder_id,
        (childCounts.get(folder.parent_folder_id) ?? 0) + 1,
      );
    });

    normalizedAssets.forEach((asset) => {
      if (asset.folder_id == null) return;
      assetCounts.set(asset.folder_id, (assetCounts.get(asset.folder_id) ?? 0) + 1);
    });

    return NextResponse.json({
      folders: normalizedFolders.map((folder) => ({
        ...folder,
        child_count: childCounts.get(folder.id) ?? 0,
        asset_count: assetCounts.get(folder.id) ?? 0,
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

    return NextResponse.json(normalizeProjectFolder(data));
  } catch (err) {
    console.error("Project folder create error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create folder" },
      { status: 500 },
    );
  }
}
