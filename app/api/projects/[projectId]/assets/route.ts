import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSongs } from "@/lib/songs";
import { normalizeProjectAsset } from "@/lib/projectFolders";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
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

    const songs = await getSongs();
    const songsById = new Map(songs.map((song) => [song.id, song]));

    const projectSongs = projectAssets
      .map((asset) => {
        const song = songsById.get(asset.asset_id);

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

    return NextResponse.json(normalizeProjectAsset(data));
  } catch (err) {
    console.error("Project asset update error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update project asset" },
      { status: 500 },
    );
  }
}
