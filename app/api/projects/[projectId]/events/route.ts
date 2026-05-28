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

function getPayloadProjectId(payload: {
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}) {
  return String(payload.new?.project_id ?? payload.old?.project_id ?? "");
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

      const emitIfMatch = (payload: {
        new?: Record<string, unknown>;
        old?: Record<string, unknown>;
      }) => {
        // No filter on the subscription so DELETE events aren't silently
        // dropped (Supabase can't filter deletes without REPLICA IDENTITY FULL).
        // Instead we check project_id here; if it's missing from the payload
        // (possible on delete without REPLICA IDENTITY FULL) we fire anyway —
        // the client just does a benign silent refetch.
        const changedProjectId = getPayloadProjectId(payload);
        if (!changedProjectId || changedProjectId === projectId) {
          safeWrite("changed", {
            projectId,
            changedAt: new Date().toISOString(),
          });
        }
      };

      const channel = supabaseServer
        .channel(
          `project-page-events:${userId}:${projectId}:${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "project_assets" },
          emitIfMatch,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "project_folders" },
          emitIfMatch,
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
