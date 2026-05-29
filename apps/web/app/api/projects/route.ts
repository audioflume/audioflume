import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizeProject } from "@/lib/projects";
import { ensureDefaultProjectFolders } from "@/lib/projectFolders";
import { toSmartTitleCase } from "@/lib/smartTitleCase";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("projects")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("position", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json((data ?? []).map(normalizeProject));
  } catch (err) {
    console.error("Projects fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load projects" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const cleanName =
      typeof body.name === "string" ? toSmartTitleCase(body.name) : "";

    if (!cleanName) {
      return NextResponse.json(
        { error: "Missing project name" },
        { status: 400 },
      );
    }

    const { data: existing, error: positionError } = await supabaseServer
      .from("projects")
      .select("position")
      .eq("clerk_user_id", userId)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition =
      existing?.[0]?.position != null ? existing[0].position + 1 : 0;

    const { data, error } = await supabaseServer
      .from("projects")
      .insert({
        clerk_user_id: userId,
        name: cleanName,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    await ensureDefaultProjectFolders({
      supabase: supabaseServer,
      projectId: data.id,
      userId,
    });

    return NextResponse.json(normalizeProject(data));
  } catch (err) {
    console.error("Project create error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create project",
      },
      { status: 500 },
    );
  }
}
