import { exists, readDir, readTextFile } from "@tauri-apps/plugin-fs";
import type { DesktopLocalChanges, Project, ProjectFileNode } from "./mockFilmwaveApi";
import { getProjectFolderPath, type SyncManifest } from "./syncEngine";

export type LocalChangesSummary = DesktopLocalChanges & {
  totalChangeCount: number;
};

function cleanPart(value: string) {
  return value.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim();
}

function cleanPath(value: string) {
  return value.split("/").map(cleanPart).filter(Boolean).join("/");
}

function filename(path: string) {
  return path.split("/").pop() || path;
}

function hasAncestor(path: string, ancestors: Set<string>) {
  for (const ancestor of ancestors) {
    if (path === ancestor || path.startsWith(`${ancestor}/`)) return true;
  }
  return false;
}

async function readManifest(projectPath: string) {
  const manifestPath = `${projectPath}/_filmwave/manifest.json`;
  if (!(await exists(manifestPath))) return null;
  try {
    return JSON.parse(await readTextFile(manifestPath)) as SyncManifest;
  } catch {
    return null;
  }
}

async function readTree(rootPath: string) {
  const files = new Map<string, string>();
  const folders = new Set<string>();

  async function walk(path: string, base = "") {
    const entries = await readDir(path);
    for (const entry of entries) {
      if (!entry.name || entry.name === "_filmwave") continue;
      const relativePath = cleanPath(base ? `${base}/${entry.name}` : entry.name);
      const absolutePath = `${path}/${entry.name}`;
      if (entry.isDirectory) {
        folders.add(relativePath);
        await walk(absolutePath, relativePath);
      } else if (entry.isFile) {
        files.set(relativePath, entry.name);
      }
    }
  }

  if (await exists(rootPath)) await walk(rootPath);
  return { files, folders };
}

function splitManifest(manifest: SyncManifest) {
  const files = manifest.fileTree
    .filter((node): node is ProjectFileNode & { type: "file" } => node.type === "file")
    .map((node) => ({ ...node, safePath: cleanPath(node.path), filename: filename(node.path) }));
  const folders = manifest.fileTree
    .filter((node): node is ProjectFileNode & { type: "folder" } => node.type === "folder")
    .map((node) => ({ ...node, safePath: cleanPath(node.path) }))
    .sort((a, b) => a.safePath.length - b.safePath.length);

  return { files, folders };
}

export async function detectLocalChanges({
  projects,
  syncFolder,
}: {
  projects: Project[];
  syncFolder: string;
}): Promise<LocalChangesSummary> {
  const changes: LocalChangesSummary = {
    folderCreates: [],
    folderMoves: [],
    fileCreates: [],
    fileMoves: [],
    fileRemovals: [],
    folderRemovals: [],
    ignoredFileAddCount: 0,
    totalChangeCount: 0,
  };

  for (const project of projects) {
    const projectPath = getProjectFolderPath(syncFolder, project);
    const manifest = await readManifest(projectPath);
    if (!manifest) continue;

    const tree = await readTree(projectPath);
    const { files, folders } = splitManifest(manifest);
    const manifestFilePaths = new Set(files.map((file) => file.safePath));
    const manifestFolderPaths = new Set(folders.map((folder) => folder.safePath));
    const consumedLocalFiles = new Set<string>();
    const removedFolders = new Set<string>();

    for (const localFolderPath of tree.folders) {
      if (!manifestFolderPaths.has(localFolderPath)) {
        changes.folderCreates.push({ projectId: manifest.projectId || project.id, path: localFolderPath });
      }
    }

    for (const folder of folders) {
      if (hasAncestor(folder.safePath, removedFolders)) continue;
      if (tree.folders.has(folder.safePath)) continue;
      const hasDescendant =
        [...tree.folders].some((path) => path.startsWith(`${folder.safePath}/`)) ||
        [...tree.files.keys()].some((path) => path.startsWith(`${folder.safePath}/`));
      if (hasDescendant) continue;
      removedFolders.add(folder.safePath);
      changes.folderRemovals.push({ projectId: manifest.projectId || project.id, id: folder.id });
    }

    for (const file of files) {
      if (hasAncestor(file.safePath, removedFolders)) continue;
      if (tree.files.has(file.safePath)) {
        consumedLocalFiles.add(file.safePath);
        continue;
      }
      const candidates = [...tree.files.entries()]
        .filter(([path, name]) => !consumedLocalFiles.has(path) && !manifestFilePaths.has(path) && name === file.filename)
        .map(([path]) => path);
      if (candidates.length === 1) {
        consumedLocalFiles.add(candidates[0]);
        changes.fileMoves.push({ projectId: manifest.projectId || project.id, id: file.id, path: candidates[0] });
      } else {
        changes.fileRemovals.push({ projectId: manifest.projectId || project.id, id: file.id });
      }
    }

    for (const localFilePath of tree.files.keys()) {
      if (!consumedLocalFiles.has(localFilePath) && !manifestFilePaths.has(localFilePath)) {
        changes.fileCreates.push({ projectId: manifest.projectId || project.id, path: localFilePath });
      }
    }
  }

  changes.totalChangeCount =
    changes.folderCreates.length +
    changes.folderMoves.length +
    changes.fileCreates.length +
    changes.fileMoves.length +
    changes.fileRemovals.length +
    changes.folderRemovals.length +
    changes.ignoredFileAddCount;
  return changes;
}

export function formatLocalChangesSummary(result: {
  createdFolderCount: number;
  movedFolderCount?: number;
  createdFileCount?: number;
  movedFileCount: number;
  removedAssetCount: number;
  removedFolderCount: number;
  ignoredFileAddCount: number;
}) {
  const summary = `${result.createdFolderCount} folders created, ${result.movedFolderCount ?? 0} folders moved, ${result.createdFileCount ?? 0} files created, ${result.movedFileCount} files moved, ${result.removedAssetCount} files removed, ${result.removedFolderCount} folders removed`;
  return result.ignoredFileAddCount > 0 ? `${summary}, ${result.ignoredFileAddCount} added files ignored` : summary;
}
