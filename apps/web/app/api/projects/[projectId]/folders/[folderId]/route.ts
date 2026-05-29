import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeProjectFolder } from "@/lib/projectFolders";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params:
    | Promise<{ projectId: string; folderId: string }>
    | { projectId: string; folderId: string };
};

type FolderParentRow = {
  id: number;
  parent_folder_id: number | null;
};

async function getParams(context: RouteContext) {
  return context.params;
}

async function getOwnedFolder(projectId: string, folderId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from("project_folders")
    .select("*")
    .eq("id", folderId)
    .eq("project_id", projectId)
    .eq("clerk_user_id", userId)
    .single();

  if (error || !data) return null;

  return normalizeProjectFolder(data);
}

async function wouldCreateCycle({
  folderId,
  parentFolderId,
  projectId,
  userId,
}: {
  folderId: number;
  parentFolderId: number | null;
  projectId: string;
  userId: string;
}) {
  if (parentFolderId == null) return false;
  if (parentFolderId === folderId) return true;

  let currentParentId: number | null = parentFolderId;
  const visited = new Set<number>();

  while (currentParentId != null) {
    if (currentParentId === folderId) return true;
    if (visited.has(currentParentId)) return true;

    visited.add(currentParentId);

    const folderLookup = await supabaseServer
      .from("project_folders")
      .select("id,parent_folder_id")
      .eq("id", currentParentId)
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    const data = folderLookup.data as FolderParentRow | null;
    const error = folderLookup.error;

    if (error || !data) return true;

    currentParentId =
      typeof data.parent_folder_id === "number" ? data.parent_folder_id : null;
  }

  return false;
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, folderId } = await getParams(context);
    const folder = await getOwnedFolder(projectId, folderId, userId);

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await req.json();
    const updates: {
      name?: string;
      asset_type?: string | null;
      parent_folder_id?: number | null;
      position?: number | null;
    } = {};

    if ("name" in body) {
      const cleanName = typeof body.name === "string" ? body.name.trim() : "";

      if (!cleanName) {
        return NextResponse.json({ error: "Folder name required" }, { status: 400 });
      }

      updates.name = cleanName;
    }

    if ("asset_type" in body) {
      updates.asset_type =
        body.asset_type === "song" ||
        body.asset_type === "sound-fx" ||
        body.asset_type === "visual-fx" ||
        body.asset_type === "colour-grading"
          ? body.asset_type
          : null;
    }

    if ("parent_folder_id" in body) {
      const parentFolderId =
        body.parent_folder_id === null || body.parent_folder_id === undefined
          ? null
          : Number(body.parent_folder_id);

      if (parentFolderId !== null && !Number.isFinite(parentFolderId)) {
        return NextResponse.json({ error: "Invalid parent folder" }, { status: 400 });
      }

      if (
        await wouldCreateCycle({
          folderId: folder.id,
          parentFolderId,
          projectId,
          userId,
        })
      ) {
        return NextResponse.json(
          { error: "Folder cannot be moved inside itself" },
          { status: 400 },
        );
      }

      updates.parent_folder_id = parentFolderId;
    }

    if ("position" in body) {
      const nextPosition = Number(body.position);
      updates.position = Number.isFinite(nextPosition) ? nextPosition : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Missing folder updates" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("project_folders")
      .update(updates)
      .eq("id", folderId)
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeProjectFolder(data));
  } catch (err) {
    console.error("Project folder update error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update folder" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, folderId } = await getParams(context);
    const folder = await getOwnedFolder(projectId, folderId, userId);

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const { error } = await supabaseServer
      .from("project_folders")
      .delete()
      .eq("id", folderId)
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true, id: Number(folderId) });
  } catch (err) {
    console.error("Project folder delete error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete folder" },
      { status: 500 },
    );
  }
}
