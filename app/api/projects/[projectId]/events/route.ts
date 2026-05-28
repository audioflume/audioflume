import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

function writeSse(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown,
) {
  const encoder = new TextEncoder();
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
  );
}

export async function GET(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const projectId = params.projectId;

  const { data: project, error: projectError } = await supabaseServer
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("clerk_user_id", userId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const safeWrite = (event: string, data: unknown) => {
        if (closed) return;
        try {
          writeSse(controller, event, data);
        } catch {
          closed = true;
        }
      };

      const channel = supabaseServer
        .channel(
          `project-page-events:${userId}:${projectId}:${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_assets",
            filter: `project_id=eq.${projectId}`,
          },
          () =>
            safeWrite("changed", {
              projectId,
              changedAt: new Date().toISOString(),
            }),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_folders",
            filter: `project_id=eq.${projectId}`,
          },
          () =>
            safeWrite("changed", {
              projectId,
              changedAt: new Date().toISOString(),
            }),
        )
        .subscribe((status) => {
          safeWrite("connection", {
            status,
            connectedAt: new Date().toISOString(),
          });
        });

      const heartbeat = setInterval(() => {
        safeWrite("heartbeat", { at: new Date().toISOString() });
      }, 25000);

      req.signal.addEventListener("abort", async () => {
        closed = true;
        clearInterval(heartbeat);
        await supabaseServer.removeChannel(channel);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
