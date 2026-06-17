import { auth } from "@clerk/nextjs/server";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

type ProjectAssetSizeRow = {
  id: number;
  asset_type: string | null;
  asset_id: string | number | null;
  metadata: Record<string, unknown> | null;
};

type SongSizeRow = {
  id: string | number;
  audio_url: string | null;
  playback_url: string | null;
  size_bytes: number | string | null;
};

async function getProjectId(context: RouteContext) {
  const params = await context.params;
  return params.projectId;
}

async function verifyProject(projectId: string, userId: string) {
  const { data: project, error } = await supabaseServer
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("clerk_user_id", userId)
    .single();

  if (error || !project) return null;

  return project;
}

function getMetadataSizeBytes(metadata: ProjectAssetSizeRow["metadata"]) {
  const sizeBytes = Number(metadata?.sizeBytes || 0);
  return Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : null;
}

function getSongSizeBytes(song: SongSizeRow | null | undefined) {
  const sizeBytes = Number(song?.size_bytes || 0);
  return Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : null;
}

function getSongUrl(song: SongSizeRow | null | undefined) {
  const audioUrl = typeof song?.audio_url === "string" ? song.audio_url.trim() : "";
  const playbackUrl =
    typeof song?.playback_url === "string" ? song.playback_url.trim() : "";
  return audioUrl || playbackUrl || null;
}

function getR2KeyFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function createR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

async function getObjectSizeBytes(song: SongSizeRow) {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const r2Client = createR2Client();
  const url = getSongUrl(song);

  if (!bucketName || !r2Client || !url) return null;

  const key = getR2KeyFromUrl(url);
  if (!key) return null;

  try {
    const head = await r2Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );

    const sizeBytes = Number(head.ContentLength || 0);
    return Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : null;
  } catch (error) {
    console.warn("Failed to read R2 object size", { songId: song.id, error });
    return null;
  }
}

async function updateSongSizeBytes(songId: string | number, sizeBytes: number) {
  const { error } = await supabaseServer
    .from("songs")
    .update({ size_bytes: sizeBytes })
    .eq("id", songId);

  if (error) {
    console.warn("Failed to update song size_bytes", { songId, error });
  }
}

async function updateAssetMetadataSizeBytes(
  asset: ProjectAssetSizeRow,
  sizeBytes: number,
) {
  const metadata = {
    ...(asset.metadata ?? {}),
    sizeBytes,
  };

  const { error } = await supabaseServer
    .from("project_assets")
    .update({ metadata })
    .eq("id", asset.id);

  if (error) {
    console.warn("Failed to update project asset sizeBytes", {
      assetId: asset.id,
      error,
    });
  }
}

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projectId = await getProjectId(context);
    const project = await verifyProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: assetRows, error: assetsError } = await supabaseServer
      .from("project_assets")
      .select("id, asset_type, asset_id, metadata")
      .eq("project_id", projectId);

    if (assetsError) throw assetsError;

    const assets = (assetRows ?? []) as ProjectAssetSizeRow[];
    const songIds = [
      ...new Set(
        assets
          .filter((asset) => asset.asset_type === "song" && asset.asset_id != null)
          .map((asset) => String(asset.asset_id)),
      ),
    ];

    const { data: songRows, error: songsError } = songIds.length
      ? await supabaseServer
          .from("songs")
          .select("id, audio_url, playback_url, size_bytes")
          .in("id", songIds)
      : { data: [], error: null };

    if (songsError) throw songsError;

    const songsById = new Map(
      ((songRows ?? []) as SongSizeRow[]).map((song) => [String(song.id), song]),
    );
    const resolvedSongSizes = new Map<string, number>();

    let sizeBytes = 0;
    let missingSizeCount = 0;

    for (const asset of assets) {
      const metadataSizeBytes = getMetadataSizeBytes(asset.metadata);

      if (metadataSizeBytes) {
        sizeBytes += metadataSizeBytes;
        continue;
      }

      if (asset.asset_type !== "song" || asset.asset_id == null) {
        missingSizeCount += 1;
        continue;
      }

      const songId = String(asset.asset_id);
      const cachedSongSizeBytes = resolvedSongSizes.get(songId);

      if (cachedSongSizeBytes) {
        sizeBytes += cachedSongSizeBytes;
        void updateAssetMetadataSizeBytes(asset, cachedSongSizeBytes);
        continue;
      }

      const song = songsById.get(songId);
      let songSizeBytes = getSongSizeBytes(song);

      if (!songSizeBytes && song) {
        songSizeBytes = await getObjectSizeBytes(song);

        if (songSizeBytes) {
          void updateSongSizeBytes(song.id, songSizeBytes);
        }
      }

      if (songSizeBytes) {
        resolvedSongSizes.set(songId, songSizeBytes);
        sizeBytes += songSizeBytes;
        void updateAssetMetadataSizeBytes(asset, songSizeBytes);
      } else {
        missingSizeCount += 1;
      }
    }

    return NextResponse.json({
      sizeBytes,
      missingSizeCount,
      totalAssetCount: assets.length,
    });
  } catch (error) {
    console.error("Project sync size fetch error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load project sync size",
      },
      { status: 500 },
    );
  }
}
