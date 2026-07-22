import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeProject } from "@/lib/projects";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

async function getProjectId(context: RouteContext) {
  const params = await context.params;
  return params.projectId;
}

function getErrorResponse(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}) {
  return {
    error: error.message || "Request failed",
    details: error.details,
    hint: error.hint,
    code: error.code,
  };
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projectId = await getProjectId(context);
    const body = await req.json();

    const updates: {
      name?: string;
      description?: string | null;
      position?: number | null;
      is_archived?: boolean;
    } = {};

    if ("name" in body) {
      const cleanName = typeof body.name === "string" ? body.name.trim() : "";

      if (!cleanName) {
        return NextResponse.json(
          { error: "Missing project name" },
          { status: 400 },
        );
      }

      updates.name = cleanName;
    }

    if ("description" in body) {
      updates.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }

    if ("position" in body) {
      const nextPosition = Number(body.position);

      updates.position = Number.isFinite(nextPosition) ? nextPosition : null;
    }

    if ("is_archived" in body) {
      if (typeof body.is_archived !== "boolean") {
        return NextResponse.json(
          { error: "Invalid archive state" },
          { status: 400 },
        );
      }

      updates.is_archived = body.is_archived;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Missing project updates" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(normalizeProject(data));
  } catch (err) {
    console.error("Project update error:", err);

    return NextResponse.json(
      getErrorResponse(
        err instanceof Error
          ? { message: err.message }
          : { message: "Failed to update project" },
      ),
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
    const projectId = await getProjectId(context);

    const { error } = await supabaseServer
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("clerk_user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, id: Number(projectId) });
  } catch (err) {
    console.error("Project delete error:", err);

    return NextResponse.json(
      getErrorResponse(
        err instanceof Error
          ? { message: err.message }
          : { message: "Failed to delete project" },
      ),
      { status: 500 },
    );
  }
}
