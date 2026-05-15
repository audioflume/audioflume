import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSongs } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

type ProjectAssetRow = {
  id: number;
  created_at: string;
  project_id: number;
  asset_type: string;
  asset_id: string;
  position: number;
  notes: string | null;
  metadata: Record<string, unknown>;
};

async function getProjectId(context: RouteContext) {
  const params = await context.params;
  return params.projectId;
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

    const { data: project, error: projectError } = await supabaseServer
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    if (projectError || !project) {
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

    const projectAssets = (assets ?? []) as ProjectAssetRow[];

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
