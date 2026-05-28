import { NextResponse } from "next/server";
import { getDesktopUserIdFromRequest } from "@/lib/desktopAuth";
import { completeProjectSyncOperationsForProject } from "@/lib/projectSyncOperations";
import { supabaseServer } from "@/lib/supabaseServer";

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

export async function POST(req: Request) {
  const userId = getDesktopUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const projectId = String(body.projectId || "");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await completeProjectSyncOperationsForProject({
      projectId,
      client: "desktop",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Desktop sync operation completion error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete sync operations" },
      { status: 500 },
    );
  }
}
