import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDesktopUserIdFromRequest } from "@/lib/desktopAuth";
import { normalizeProject } from "@/lib/projects";
import {
  normalizeProjectAsset,
  normalizeProjectFolder,
} from "@/lib/projectFolders";
import { normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";
import type { ProjectAsset, ProjectFolder, Song } from "@/lib/types";

type DesktopFileNode = {
  id: string;
  type: "folder" | "file";
  name: string;
  path: string;
  parentId: string | null;
  sortOrder: number;
  downloadUrl?: string;
  sizeBytes?: number;
  updatedAt: string;
};

type SongRow = Record<string, unknown> & {
  id?: string;
  updated_at?: string;
  created_at?: string;
  size_bytes?: number | string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function sanitizeFilenamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getUrlFilename(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const filename = decodeURIComponent(pathname.split("/").pop() || "").trim();
    return filename || null;
  } catch {
    return null;
  }
}

function getFilenameExtension(filename: string | null) {
  if (!filename) return null;

  const match = filename.match(/\.[a-z0-9]{2,8}$/i);
  return match?.[0] ?? null;
}

function getSongFilename(song: Song) {
  const urlFilename = getUrlFilename(song.audioUrl || song.playbackUrl || "");
  const extension = getFilenameExtension(urlFilename) ?? ".mp3";
  const title = sanitizeFilenamePart(song.title || "Untitled");
  const artist = sanitizeFilenamePart(song.artist || "Filmwave");

  return `${title} - ${artist}${extension}`;
}

function joinPath(parts: string[]) {
  return parts.filter(Boolean).join("/");
}

function buildFolderPaths(folders: ProjectFolder[]) {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const cache = new Map<number, string>();

  function getFolderPath(folder: ProjectFolder): string {
    const cached = cache.get(folder.id);
    if (cached) return cached;

    const folderName = sanitizeFilenamePart(folder.name || "Folder") || "Folder";
    const parent =
      folder.parent_folder_id == null
        ? null
        : foldersById.get(folder.parent_folder_id) ?? null;
    const path = parent ? joinPath([getFolderPath(parent), folderName]) : folderName;

    cache.set(folder.id, path);

    return path;
  }

  folders.forEach(getFolderPath);

  return cache;
}

function getFallbackAssetFilename(asset: ProjectAsset) {
  const metadata = asset.metadata ?? {};
  const rawFilename =
    typeof metadata.filename === "string" && metadata.filename.trim()
      ? metadata.filename.trim()
      : `${asset.asset_type}-${asset.id}.txt`;

  return sanitizeFilenamePart(rawFilename) || `${asset.asset_type}-${asset.id}.txt`;
}

function getSongSizeBytes(song: Song, songRow: SongRow | undefined) {
  const normalizedSizeBytes = Number(song.sizeBytes || 0);
  if (normalizedSizeBytes > 0) return normalizedSizeBytes;

  const rowSizeBytes = Number(songRow?.size_bytes || 0);
  return rowSizeBytes > 0 ? rowSizeBytes : undefined;
}

function buildDesktopFileTree({
  assets,
  folders,
  songsById,
  songRowsById,
}: {
  assets: ProjectAsset[];
  folders: ProjectFolder[];
  songsById: Map<string, Song>;
  songRowsById: Map<string, SongRow>;
}) {
  const folderPaths = buildFolderPaths(folders);
  const fileTree: DesktopFileNode[] = [];

  folders.forEach((folder) => {
    const path = folderPaths.get(folder.id);

    if (!path) return;

    fileTree.push({
      id: `folder:${folder.id}`,
      type: "folder",
      name: folder.name,
      path,
      parentId:
        folder.parent_folder_id == null ? null : `folder:${folder.parent_folder_id}`,
      sortOrder: folder.position ?? 0,
      updatedAt: folder.updated_at || folder.created_at,
    });
  });

  assets.forEach((asset) => {
    const parentPath =
      asset.folder_id == null ? "" : folderPaths.get(asset.folder_id) ?? "";

    if (asset.asset_type === "song") {
      const song = songsById.get(String(asset.asset_id));
      const songRow = songRowsById.get(String(asset.asset_id));

      if (!song) return;

      const filename = getSongFilename(song);
      const sizeBytes = getSongSizeBytes(song, songRow);

      fileTree.push({
        id: `asset:${asset.id}`,
        type: "file",
        name: filename,
        path: joinPath([parentPath, filename]),
        parentId: asset.folder_id == null ? null : `folder:${asset.folder_id}`,
        sortOrder: asset.position ?? 0,
        downloadUrl: song.audioUrl || song.playbackUrl,
        sizeBytes,
        updatedAt:
          typeof songRow?.updated_at === "string" && songRow.updated_at
            ? songRow.updated_at
            : asset.created_at,
      });

      return;
    }

    const filename = getFallbackAssetFilename(asset);

    // Expose sizeBytes from metadata so the desktop sync engine can use it
    // for accurate move-vs-delete detection.
    const metadata = asset.metadata ?? {};
    const sizeBytes = Number(metadata.sizeBytes || 0) || undefined;

    fileTree.push({
      id: `asset:${asset.id}`,
      type: "file",
      name: filename,
      path: joinPath([parentPath, filename]),
      parentId: asset.folder_id == null ? null : `folder:${asset.folder_id}`,
      sortOrder: asset.position ?? 0,
      sizeBytes,
      updatedAt: asset.created_at,
    });
  });

  return fileTree.sort((a, b) => {
    if (a.path === b.path) return a.sortOrder - b.sortOrder;
    return a.path.localeCompare(b.path, undefined, { sensitivity: "base" });
  });
}

async function getDesktopRequestUserId(req: Request) {
  const tokenUserId = getDesktopUserIdFromRequest(req);

  if (tokenUserId) return tokenUserId;

  const { userId } = await auth();

  return userId;
}

export async function GET(req: Request) {
  const userId = await getDesktopRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: projectRows, error: projectsError } = await supabaseServer
      .from("projects")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("position", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (projectsError) throw projectsError;

    const projects = (projectRows ?? []).map(normalizeProject);

    // NOTE: ensureDefaultProjectFolders is intentionally NOT called here.
    // The desktop API must return the exact Supabase state without
    // auto-creating folders — if we recreate default folders here, any
    // folder the user deletes locally gets immediately restored on the next
    // getFilmwaveProjects call, causing syncProjectsToFolder to write it
    // back to disk. Default folder creation belongs only in the web UI.

    const projectIds = projects.map((project) => project.id);

    if (projectIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    const [{ data: folderRows, error: foldersError }, { data: assetRows, error: assetsError }] =
      await Promise.all([
        // No clerk_user_id filter — project ownership is already verified
        // above via the projects query. Filtering by clerk_user_id excluded
        // folders created from the website or with a null clerk_user_id,
        // causing path errors in the manifest and breaking detection.
        supabaseServer
          .from("project_folders")
          .select("*")
          .in("project_id", projectIds)
          .order("position", { ascending: true })
          .order("name", { ascending: true }),
        supabaseServer
          .from("project_assets")
          .select("*")
          .in("project_id", projectIds)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

    if (foldersError) throw foldersError;
    if (assetsError) throw assetsError;

    const folders = (folderRows ?? []).map(normalizeProjectFolder);
    const assets = (assetRows ?? []).map(normalizeProjectAsset);
    const songIds = [
      ...new Set(
        assets
          .filter((asset) => asset.asset_type === "song")
          .map((asset) => String(asset.asset_id || ""))
          .filter(isUuid),
      ),
    ];

    const { data: songRows, error: songsError } =
      songIds.length > 0
        ? await supabaseServer.from("songs").select("*").in("id", songIds)
        : { data: [], error: null };

    if (songsError) throw songsError;

    const normalizedSongs = (songRows ?? []).map(normalizeSongRow);
    const songsById = new Map(normalizedSongs.map((song) => [String(song.id), song]));
    const songRowsById = new Map(
      ((songRows ?? []) as SongRow[]).map((row) => [String(row.id), row]),
    );

    const foldersByProjectId = new Map<number, ProjectFolder[]>();
    const assetsByProjectId = new Map<number, ProjectAsset[]>();

    folders.forEach((folder) => {
      const current = foldersByProjectId.get(folder.project_id) ?? [];
      current.push(folder);
      foldersByProjectId.set(folder.project_id, current);
    });

    assets.forEach((asset) => {
      const current = assetsByProjectId.get(asset.project_id) ?? [];
      current.push(asset);
      assetsByProjectId.set(asset.project_id, current);
    });

    return NextResponse.json({
      projects: projects.map((project) => {
        const fileTree = buildDesktopFileTree({
          folders: foldersByProjectId.get(project.id) ?? [],
          assets: assetsByProjectId.get(project.id) ?? [],
          songsById,
          songRowsById,
        });

        const totalSizeBytes = fileTree.reduce(
          (total, node) => total + (node.sizeBytes ?? 0),
          0,
        );

        return {
          id: String(project.id),
          name: project.name,
          description: project.description ?? "",
          fileCount: fileTree.filter((node) => node.type === "file").length,
          sizeBytes: totalSizeBytes,
          files: fileTree,
          updatedAt: project.created_at,
        };
      }),
    });
  } catch (err) {
    console.error("Desktop projects fetch error:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load desktop project data",
      },
      { status: 500 },
    );
  }
}