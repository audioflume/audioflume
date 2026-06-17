import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureDefaultProjectFolders } from "@/lib/projectFolders";
import { createProjectSyncOperation } from "@/lib/projectSyncOperations";
import { supabaseServer } from "@/lib/supabaseServer";

type ProjectAssetAddTarget = "root" | "media_folder";

type RouteContext = {
  params: Promise<{ songId: string }> | { songId: string };
};

type SongSizeRow = {
  size_bytes?: number | string | null;
};

async function getSongId(context: RouteContext) {
  const params = await context.params;
  return decodeURIComponent(params.songId);
}

async function getProjectAssetAddTarget(userId: string): Promise<ProjectAssetAddTarget> {
  const { data, error } = await supabaseServer
    .from("user_preferences")
    .select("project_asset_add_target")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error || !data) return "media_folder";

  return data.project_asset_add_target === "root" ? "root" : "media_folder";
}

async function getDefaultSongFolderId(projectId: number, userId: string) {
  const addTarget = await getProjectAssetAddTarget(userId);

  if (addTarget === "root") return null;

  await ensureDefaultProjectFolders({
    supabase: supabaseServer,
    projectId,
    userId,
  });

  const { data, error } = await supabaseServer
    .from("project_folders")
    .select("id")
    .eq("project_id", projectId)
    .eq("clerk_user_id", userId)
    .eq("asset_type", "song")
    .is("parent_folder_id", null)
    .single();

  if (error || !data) return null;

  return Number(data.id);
}

async function getSongSizeBytes(songId: string) {
  const { data, error } = await supabaseServer
    .from("songs")
    .select("size_bytes")
    .eq("id", songId)
    .maybeSingle();

  if (error || !data) return undefined;

  const sizeBytes = Number((data as SongSizeRow).size_bytes || 0);
  return sizeBytes > 0 ? sizeBytes : undefined;
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
      const folderId = await getDefaultSongFolderId(projectId, userId);
      const songSizeBytes = await getSongSizeBytes(songId);
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
          folder_id: folderId,
          position: nextPosition,
          metadata: songSizeBytes ? { sizeBytes: songSizeBytes } : {},
        },
        {
          onConflict: "project_id,asset_type,asset_id",
        },
      );

      if (error) {
        throw error;
      }

      await createProjectSyncOperation({
        projectId,
        userId,
        sourceClient: "website",
        operationType: "add_song",
        websiteDone: true,
        desktopDone: false,
      });

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

    await createProjectSyncOperation({
      projectId,
      userId,
      sourceClient: "website",
      operationType: "remove_song",
      websiteDone: true,
      desktopDone: false,
    });

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