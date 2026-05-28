import { NextResponse } from "next/server";
import { verifyDesktopToken } from "@/lib/desktopAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProjectEventRow = {
  project_id?: string | number | null;
  id?: string | number | null;
};

function getProjectIdFromPayload(payload: {
  new?: ProjectEventRow;
  old?: ProjectEventRow;
}) {
  const value = payload.new?.project_id ?? payload.old?.project_id;
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

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

async function getAllowedProjectIds(userId: string, requestedProjectIds: number[]) {
  let query = supabaseServer
    .from("projects")
    .select("id")
    .eq("clerk_user_id", userId);

  if (requestedProjectIds.length > 0) {
    query = query.in("id", requestedProjectIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  return new Set((data ?? []).map((project) => Number(project.id)));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const payload = verifyDesktopToken(token);

  if (!payload?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedProjectIds = url.searchParams
    .getAll("projectId")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  const userId = payload.userId;
  const allowedProjectIds = await getAllowedProjectIds(userId, requestedProjectIds);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const safeWriteSse = (event: string, data: unknown) => {
        if (closed) return;

        try {
          writeSse(controller, event, data);
        } catch {
          closed = true;
        }
      };

      const safeClose = () => {
        if (closed) return;
        closed = true;

        try {
          controller.close();
        } catch {
          // The browser/runtime may already have closed the stream.
        }
      };

      const emitProjectChange = (
        source: "project_assets" | "project_folders",
        eventPayload: {
          eventType?: string;
          new?: ProjectEventRow;
          old?: ProjectEventRow;
        },
      ) => {
        if (closed) return;

        const projectId = getProjectIdFromPayload(eventPayload);

        if (!projectId || !allowedProjectIds.has(projectId)) return;

        safeWriteSse("project-change", {
          projectId,
          source,
          eventType: eventPayload.eventType ?? "change",
          changedAt: new Date().toISOString(),
        });
      };

      const channel = supabaseServer
        .channel(`desktop-project-events:${userId}:${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_assets",
          },
          (eventPayload) => emitProjectChange("project_assets", eventPayload),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_folders",
          },
          (eventPayload) => emitProjectChange("project_folders", eventPayload),
        )
        .subscribe((status) => {
          safeWriteSse("connection", {
            status,
            connectedAt: new Date().toISOString(),
          });
        });

      const heartbeat = setInterval(() => {
        safeWriteSse("heartbeat", {
          at: new Date().toISOString(),
        });
      }, 25000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        void supabaseServer.removeChannel(channel).catch(() => undefined);
        safeClose();
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
