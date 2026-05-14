import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Project } from "@/lib/types";
import { normalizeProject } from "@/lib/projects";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await context.params;
    const body = await req.json();

    const cleanName = typeof body.name === "string" ? body.name.trim() : "";

    if (!cleanName) {
      return NextResponse.json(
        { error: "Missing project name" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from("projects")
      .update({
        name: cleanName,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
      })
      .eq("id", projectId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeProject(data));
  } catch (err) {
    console.error("Project update error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update project",
      },
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
    const { projectId } = await context.params;

    const { error } = await supabaseServer
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("clerk_user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true, id: Number(projectId) });
  } catch (err) {
    console.error("Project delete error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete project",
      },
      { status: 500 },
    );
  }
}
