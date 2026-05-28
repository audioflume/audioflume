import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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

    const { data, error } = await supabaseServer
      .from("project_sync_operations")
      .select("id,project_id,source_client,operation_type,status,website_done_at,desktop_done_at,error_message,created_at,updated_at,completed_at")
      .eq("project_id", Number(projectId))
      .eq("status", "running")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ operations: data ?? [] });
  } catch (error) {
    console.error("Project sync operations fetch error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load project sync operations" },
      { status: 500 },
    );
  }
}
