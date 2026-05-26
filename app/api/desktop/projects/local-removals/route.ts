import { NextResponse } from "next/server";
import { getDesktopUserIdFromRequest } from "@/lib/desktopAuth";
import { supabaseServer } from "@/lib/supabaseServer";

type LocalRemovalRequestItem = {
  projectId?: string | number;
  id?: string;
  type?: "file" | "folder";
  assetId?: string | number | null;
  folderId?: string | number | null;
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

function normalizeRemoval(item: LocalRemovalRequestItem) {
  const projectId = getNumericId(item.projectId);

  if (!projectId) return null;

  if (item.type === "file") {
    const assetId =
      getNumericId(item.assetId) ?? getIdFromDesktopNodeId(item.id, "asset");

    if (!assetId) return null;

    return {
      projectId,
      type: "file" as const,
      assetId,
    };
  }

  if (item.type === "folder") {
    const folderId =
      getNumericId(item.folderId) ?? getIdFromDesktopNodeId(item.id, "folder");

    if (!folderId) return null;

    return {
      projectId,
      type: "folder" as const,
      folderId,
    };
  }

  return null;
}

export async function POST(req: Request) {
  const userId = getDesktopUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const removals = Array.isArray(body.removals)
      ? body.removals.map(normalizeRemoval).filter(Boolean)
      : [];

    if (removals.length === 0) {
      return NextResponse.json({
        removedAssetCount: 0,
        removedFolderCount: 0,
      });
    }

    const projectIds = [...new Set(removals.map((item) => item.projectId))];

    const { data: projectRows, error: projectsError } = await supabaseServer
      .from("projects")
      .select("id")
      .eq("clerk_user_id", userId)
      .in("id", projectIds);

    if (projectsError) throw projectsError;

    const allowedProjectIds = new Set((projectRows ?? []).map((project) => Number(project.id)));
    const allowedRemovals = removals.filter((item) =>
      allowedProjectIds.has(Number(item.projectId)),
    );

    const assetIdsByProjectId = new Map<number, number[]>();
    const folderIdsByProjectId = new Map<number, number[]>();

    for (const removal of allowedRemovals) {
      if (removal.type === "file") {
        const current = assetIdsByProjectId.get(removal.projectId) ?? [];
        current.push(removal.assetId);
        assetIdsByProjectId.set(removal.projectId, current);
      }

      if (removal.type === "folder") {
        const current = folderIdsByProjectId.get(removal.projectId) ?? [];
        current.push(removal.folderId);
        folderIdsByProjectId.set(removal.projectId, current);
      }
    }

    let removedAssetCount = 0;
    let removedFolderCount = 0;

    for (const [projectId, assetIds] of assetIdsByProjectId) {
      const uniqueAssetIds = [...new Set(assetIds)];

      if (uniqueAssetIds.length === 0) continue;

      const { error, count } = await supabaseServer
        .from("project_assets")
        .delete({ count: "exact" })
        .eq("project_id", projectId)
        .in("id", uniqueAssetIds);

      if (error) throw error;

      removedAssetCount += count ?? 0;
    }

    for (const [projectId, folderIds] of folderIdsByProjectId) {
      const uniqueFolderIds = [...new Set(folderIds)];

      if (uniqueFolderIds.length === 0) continue;

      const { error, count } = await supabaseServer
        .from("project_folders")
        .delete({ count: "exact" })
        .eq("project_id", projectId)
        .eq("clerk_user_id", userId)
        .in("id", uniqueFolderIds);

      if (error) throw error;

      removedFolderCount += count ?? 0;
    }

    return NextResponse.json({
      removedAssetCount,
      removedFolderCount,
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
