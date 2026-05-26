import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

async function getDesktopUserId() {
  const { userId } = await auth();

  if (userId) return userId;

  if (process.env.NODE_ENV !== "production") {
    return process.env.FILMWAVE_DESKTOP_DEV_USER_ID ?? null;
  }

  return null;
}

function getFilenameFromUrl(url: string) {
  try {
    const filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return filename || "filmwave-audio.wav";
  } catch {
    return "filmwave-audio.wav";
  }
}

export async function GET(req: Request) {
  const userId = await getDesktopUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const projectId = Number(url.searchParams.get("projectId"));
    const assetId = Number(url.searchParams.get("assetId"));

    if (!Number.isFinite(projectId) || !Number.isFinite(assetId)) {
      return NextResponse.json({ error: "Missing projectId or assetId" }, { status: 400 });
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

    const { data: asset, error: assetError } = await supabaseServer
      .from("project_assets")
      .select("*")
      .eq("id", assetId)
      .eq("project_id", projectId)
      .eq("asset_type", "song")
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const { data: songRow, error: songError } = await supabaseServer
      .from("songs")
      .select("*")
      .eq("id", String(asset.asset_id))
      .single();

    if (songError || !songRow) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const song = normalizeSongRow(songRow);
    const sourceUrl = song.audioUrl || song.playbackUrl;

    if (!sourceUrl) {
      return NextResponse.json({ error: "Song has no downloadable audio URL" }, { status: 404 });
    }

    const upstream = await fetch(sourceUrl, { redirect: "follow" });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Audio download failed: ${upstream.status} ${upstream.statusText}` },
        { status: 502 },
      );
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type") || "audio/wav";
    const contentLength = upstream.headers.get("content-length");
    const filename = getFilenameFromUrl(sourceUrl);

    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "private, max-age=60");

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(upstream.body, { headers });
  } catch (error) {
    console.error("Desktop file download error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download file" },
      { status: 500 },
    );
  }
}
