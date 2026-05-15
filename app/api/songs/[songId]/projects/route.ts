import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ songId: string }> | { songId: string };
};

async function getSongId(context: RouteContext) {
  const params = await context.params;
  return decodeURIComponent(params.songId);
}

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const songId = await getSongId(context);

    const { data: projects, error: projectsError } = await supabaseServer
      .from("projects")
      .select("id")
      .eq("clerk_user_id", userId);

    if (projectsError) {
      throw projectsError;
    }

    const projectIds = (projects ?? [])
      .map((project) => Number(project.id))
      .filter((projectId) => Number.isFinite(projectId));

    if (projectIds.length === 0) {
      return NextResponse.json({ selected_project_ids: [] });
    }

    const { data: projectAssets, error: projectAssetsError } =
      await supabaseServer
        .from("project_assets")
        .select("project_id")
        .eq("asset_type", "song")
        .eq("asset_id", songId)
        .in("project_id", projectIds);

    if (projectAssetsError) {
      throw projectAssetsError;
    }

    return NextResponse.json({
      selected_project_ids: (projectAssets ?? []).map((row) =>
        Number(row.project_id),
      ),
    });
  } catch (err) {
    console.error("Project selections fetch error:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load project selections",
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
    const songId = await getSongId(context);
    const body = await req.json();

    const projectId = Number(body.project_id);
    const selected = Boolean(body.selected);

    if (!Number.isFinite(projectId)) {
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 },
      );
    }

    const { data: project, error: projectError } = await supabaseServer
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (selected) {
      const { data: latestAsset, error: latestAssetError } =
        await supabaseServer
          .from("project_assets")
          .select("position")
          .eq("project_id", projectId)
          .eq("asset_type", "song")
          .order("position", { ascending: false })
          .limit(1);

      if (latestAssetError) {
        throw latestAssetError;
      }

      const nextPosition =
        latestAsset?.[0]?.position != null ? latestAsset[0].position + 1 : 0;

      const { error } = await supabaseServer.from("project_assets").upsert(
        {
          project_id: projectId,
          asset_type: "song",
          asset_id: songId,
          position: nextPosition,
        },
        {
          onConflict: "project_id,asset_type,asset_id",
        },
      );

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true, selected: true });
    }

    const { error } = await supabaseServer
      .from("project_assets")
      .delete()
      .eq("project_id", projectId)
      .eq("asset_type", "song")
      .eq("asset_id", songId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, selected: false });
  } catch (err) {
    console.error("Project selection update error:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to update project selection",
      },
      { status: 500 },
    );
  }
}
