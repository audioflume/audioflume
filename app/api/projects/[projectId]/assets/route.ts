import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeSongRow, attachEditPoints } from "@/lib/songs";
import { normalizeProjectAsset } from "@/lib/projectFolders";
import { createProjectSyncOperation } from "@/lib/projectSyncOperations";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

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

async function getProjectSongRows(songIds: string[]) {
  const uniqueSongIds = [...new Set(songIds.filter(Boolean))];
  const uuidSongIds = uniqueSongIds.filter(isUuid);

  if (uuidSongIds.length === 0) return [];

  const targeted = await supabaseServer
    .from("songs")
    .select("*")
    .in("id", uuidSongIds)
    .eq("status", "published");

  if (!targeted.error) return targeted.data ?? [];

  console.warn("Targeted project song fetch failed. Retrying without status filter.", targeted.error);

  const targetedWithoutStatus = await supabaseServer
    .from("songs")
    .select("*")
    .in("id", uuidSongIds);

  if (!targetedWithoutStatus.error) return targetedWithoutStatus.data ?? [];

  console.warn("Targeted project song fetch without status failed. Retrying with catalogue fetch.", targetedWithoutStatus.error);

  const catalogue = await supabaseServer
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false });

  if (catalogue.error) throw catalogue.error;

  const songIdSet = new Set(uuidSongIds.map(String));

  return (catalogue.data ?? []).filter((row) => songIdSet.has(String(row.id)));
}

export async function GET(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projectId = await getProjectId(context);
    const url = new URL(req.url);
    const assetType = url.searchParams.get("type") || "song";

    const project = await verifyProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: assets, error: assetsError } = await supabaseServer
      .from("project_assets")
      .select("*")
      .eq("project_id", projectId)
      .eq("asset_type", assetType)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (assetsError) {
      throw assetsError;
    }

    const projectAssets = (assets ?? []).map(normalizeProjectAsset);

    if (assetType !== "song") {
      return NextResponse.json({ assets: projectAssets });
    }

    const songIds = projectAssets
      .map((asset) => String(asset.asset_id || ""))
      .filter(Boolean);

    if (songIds.length === 0) {
      return NextResponse.json({ assets: projectAssets, songs: [] });
    }

    const songRows = await getProjectSongRows(songIds);

    const normalizedSongs = await attachEditPoints(
      (songRows ?? []).map(normalizeSongRow),
    );

    const songsById = new Map(normalizedSongs.map((song) => [String(song.id), song]));

    const projectSongs = projectAssets
      .map((asset) => {
        const song = songsById.get(String(asset.asset_id));

        if (!song) return null;

        return {
          ...song,
          project_asset_id: asset.id,
          project_id: asset.project_id,
          project_position: asset.position,
          project_added_at: asset.created_at,
          project_notes: asset.notes,
          project_folder_id: asset.folder_id,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      assets: projectAssets,
      songs: projectSongs,
    });
  } catch (err) {
    console.error("Project assets fetch error:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load project assets",
      },
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
    const project = await verifyProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const assetId = Number(body.asset_id);
    const folderId =
      body.folder_id === null || body.folder_id === undefined
        ? null
        : Number(body.folder_id);

    if (!Number.isFinite(assetId)) {
      return NextResponse.json({ error: "Missing asset_id" }, { status: 400 });
    }

    if (folderId !== null && !Number.isFinite(folderId)) {
      return NextResponse.json({ error: "Invalid folder_id" }, { status: 400 });
    }

    if (folderId !== null) {
      const { data: folder, error: folderError } = await supabaseServer
        .from("project_folders")
        .select("id")
        .eq("id", folderId)
        .eq("project_id", projectId)
        .eq("clerk_user_id", userId)
        .single();

      if (folderError || !folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    const { data, error } = await supabaseServer
      .from("project_assets")
      .update({ folder_id: folderId })
      .eq("id", assetId)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error) throw error;

    await createProjectSyncOperation({
      projectId,
      userId,
      sourceClient: "website",
      operationType: "move_asset",
      websiteDone: true,
      desktopDone: false,
    });

    return NextResponse.json(normalizeProjectAsset(data));
  } catch (err) {
    console.error("Project asset update error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update project asset" },
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
    const project = await verifyProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const assetId = Number(body.asset_id);

    if (!Number.isFinite(assetId)) {
      return NextResponse.json({ error: "Missing asset_id" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("project_assets")
      .delete()
      .eq("id", assetId)
      .eq("project_id", projectId);

    if (error) throw error;

    await createProjectSyncOperation({
      projectId,
      userId,
      sourceClient: "website",
      operationType: "delete_asset",
      websiteDone: true,
      desktopDone: false,
    });

    return NextResponse.json({ deleted_asset_id: assetId });
  } catch (err) {
    console.error("Project asset delete error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete project asset" },
      { status: 500 },
    );
  }
}
