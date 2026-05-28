import { exists, readDir, readTextFile, stat } from "@tauri-apps/plugin-fs";
import type {
  DesktopLocalChanges,
  Project,
  ProjectFileNode,
} from "./mockFilmwaveApi";
import {
  getProjectFolderPath,
  sanitizeProjectRelativePath,
  type SyncManifest,
} from "./syncEngine";

type DiskNode = {
  type: "folder" | "file";
  name: string;
  path: string;
  sizeBytes?: number;
};

type FolderWithSafePath = ProjectFileNode & {
  type: "folder";
  safePath: string;
};

type FileWithSafePath = ProjectFileNode & {
  type: "file";
  safePath: string;
};

export type DetectedLocalChanges = {
  changes: DesktopLocalChanges;
  affectedProjectIds: string[];
};

function getNameFromPath(path: string) {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function normalizeRelativePath(path: string) {
  return sanitizeProjectRelativePath(path.replace(/\\/g, "/"));
}

function getParentPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function replacePathPrefix(path: string, fromPrefix: string, toPrefix: string) {
  if (path === fromPrefix) return toPrefix;
  if (!path.startsWith(`${fromPrefix}/`)) return path;

  return `${toPrefix}/${path.slice(fromPrefix.length + 1)}`;
}

function pathIsSameOrDescendant(path: string, possibleParent: string) {
  return path === possibleParent || path.startsWith(`${possibleParent}/`);
}

function hasRemovedAncestor(path: string, removedFolderPaths: Set<string>) {
  for (const removedFolderPath of removedFolderPaths) {
    if (path.startsWith(`${removedFolderPath}/`)) return true;
  }

  return false;
}

function getRelativeDescendantPath(path: string, folderPath: string) {
  if (!path.startsWith(`${folderPath}/`)) return null;
  return path.slice(folderPath.length + 1);
}

function buildDescendantFileFingerprint(
  folderPath: string,
  files: Array<{ path?: string; safePath?: string }>,
) {
  return files
    .map((file) => getRelativeDescendantPath(file.safePath ?? file.path ?? "", folderPath))
    .filter((path): path is string => Boolean(path))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .join("|");
}

function buildDescendantFolderFingerprint(
  folderPath: string,
  folders: Array<{ path?: string; safePath?: string }>,
) {
  return folders
    .map((folder) => getRelativeDescendantPath(folder.safePath ?? folder.path ?? "", folderPath))
    .filter((path): path is string => Boolean(path))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .join("|");
}

async function readProjectDiskTree(rootPath: string) {
  const nodes: DiskNode[] = [];

  async function walk(relativePath = "") {
    const directoryPath = relativePath ? `${rootPath}/${relativePath}` : rootPath;
    const entries = await readDir(directoryPath);

    for (const entry of entries) {
      const name = entry.name;
      if (!name) continue;

      const nextRelativePath = relativePath ? `${relativePath}/${name}` : name;
      const normalizedPath = normalizeRelativePath(nextRelativePath);

      if (normalizedPath === "_filmwave" || normalizedPath.startsWith("_filmwave/")) {
        continue;
      }

      const absolutePath = `${rootPath}/${normalizedPath}`;

      if (entry.isDirectory) {
        nodes.push({
          type: "folder",
          name,
          path: normalizedPath,
        });
        await walk(normalizedPath);
        continue;
      }

      if (entry.isFile) {
        let sizeBytes: number | undefined;

        try {
          const fileInfo = await stat(absolutePath);
          sizeBytes = Number(fileInfo.size || 0);
        } catch {
          sizeBytes = undefined;
        }

        nodes.push({
          type: "file",
          name,
          path: normalizedPath,
          sizeBytes,
        });
      }
    }
  }

  await walk();
  return nodes;
}

async function readLastSyncedManifest(projectPath: string) {
  const manifestPath = `${projectPath}/_filmwave/manifest.json`;

  if (!(await exists(manifestPath))) return null;

  try {
    return JSON.parse(await readTextFile(manifestPath)) as SyncManifest;
  } catch {
    return null;
  }
}

function getLocalChangeBaseline(project: Project, manifest: SyncManifest | null) {
  if (!manifest?.fileTree?.length) return project.files;

  return manifest.fileTree;
}

function localFileMatchesPreviousNode(localFile: DiskNode, previousFile: ProjectFileNode) {
  const sameName = getNameFromPath(localFile.path) === getNameFromPath(previousFile.path);
  const previousSize = Number(previousFile.sizeBytes || 0);
  const sameSize = !previousSize || !localFile.sizeBytes || localFile.sizeBytes === previousSize;

  return sameName && sameSize;
}

function createEmptyChanges(): DesktopLocalChanges {
  return {
    folderCreates: [],
    folderMoves: [],
    fileCreates: [],
    fileMoves: [],
    fileRemovals: [],
    folderRemovals: [],
    ignoredFileAddCount: 0,
  };
}

export function hasDesktopLocalChanges(changes: DesktopLocalChanges) {
  return (
    changes.folderCreates.length > 0 ||
    changes.folderMoves.length > 0 ||
    changes.fileCreates.length > 0 ||
    changes.fileMoves.length > 0 ||
    changes.fileRemovals.length > 0 ||
    changes.folderRemovals.length > 0 ||
    changes.ignoredFileAddCount > 0
  );
}

function detectFolderMoves({
  diskFiles,
  diskFolders,
  previousFiles,
  previousFolders,
  previousFolderPaths,
}: {
  diskFiles: DiskNode[];
  diskFolders: DiskNode[];
  previousFiles: FileWithSafePath[];
  previousFolders: FolderWithSafePath[];
  previousFolderPaths: Set<string>;
}) {
  const diskFolderPaths = new Set(diskFolders.map((folder) => folder.path));
  const missingFolders = previousFolders.filter((folder) => !diskFolderPaths.has(folder.safePath));
  const newFolders = diskFolders.filter((folder) => !previousFolderPaths.has(folder.path));
  const usedNewFolderPaths = new Set<string>();
  const movedFolderMap = new Map<string, string>();

  for (const previousFolder of missingFolders.sort((a, b) => a.safePath.length - b.safePath.length)) {
    if ([...movedFolderMap.keys()].some((oldPath) => previousFolder.safePath.startsWith(`${oldPath}/`))) {
      continue;
    }

    const oldName = getNameFromPath(previousFolder.safePath);
    const oldParentPath = getParentPath(previousFolder.safePath);
    const oldFileFingerprint = buildDescendantFileFingerprint(previousFolder.safePath, previousFiles);
    const oldFolderFingerprint = buildDescendantFolderFingerprint(previousFolder.safePath, previousFolders);
    const oldHasDescendants = Boolean(oldFileFingerprint || oldFolderFingerprint);

    const candidates = newFolders.filter((folder) => {
      if (usedNewFolderPaths.has(folder.path)) return false;
      if ([...usedNewFolderPaths].some((path) => folder.path.startsWith(`${path}/`))) return false;

      const newName = getNameFromPath(folder.path);
      const newParentPath = getParentPath(folder.path);
      const newFileFingerprint = buildDescendantFileFingerprint(folder.path, diskFiles);
      const newFolderFingerprint = buildDescendantFolderFingerprint(folder.path, diskFolders);
      const sameName = newName === oldName;
      const sameTree =
        oldHasDescendants &&
        newFileFingerprint === oldFileFingerprint &&
        newFolderFingerprint === oldFolderFingerprint;

      // Detect an empty folder rename within the same parent directory.
      //
      // Previous code used global counts (missingFolders.length === 1 &&
      // newFolders.length === 1) which broke whenever the project had any
      // other new or missing folder anywhere — even in a completely different
      // part of the tree. This scopes the uniqueness check to the same parent
      // so unrelated changes elsewhere don't suppress rename detection.
      const singleEmptyRenameInSameParent = (() => {
        if (oldHasDescendants) return false;
        if (newParentPath !== oldParentPath) return false;

        // Count empty missing folders in this parent
        const emptyMissingInParent = missingFolders.filter((f) => {
          if (getParentPath(f.safePath) !== oldParentPath) return false;
          return (
            !buildDescendantFileFingerprint(f.safePath, previousFiles) &&
            !buildDescendantFolderFingerprint(f.safePath, previousFolders)
          );
        });

        // Count empty new folders in this parent (excluding already-matched ones)
        const emptyNewInParent = newFolders.filter((f) => {
          if (usedNewFolderPaths.has(f.path)) return false;
          if (getParentPath(f.path) !== newParentPath) return false;
          return (
            !buildDescendantFileFingerprint(f.path, diskFiles) &&
            !buildDescendantFolderFingerprint(f.path, diskFolders)
          );
        });

        return emptyMissingInParent.length === 1 && emptyNewInParent.length === 1;
      })();

      return sameName || sameTree || singleEmptyRenameInSameParent;
    });

    if (candidates.length !== 1) continue;

    const candidate = candidates[0];
    movedFolderMap.set(previousFolder.safePath, candidate.path);
    usedNewFolderPaths.add(candidate.path);
  }

  return movedFolderMap;
}

export async function detectDesktopLocalChanges({
  projects,
  syncFolder,
}: {
  projects: Project[];
  syncFolder: string;
}): Promise<DetectedLocalChanges> {
  const changes = createEmptyChanges();
  const affectedProjectIds = new Set<string>();

  for (const project of projects) {
    const projectPath = getProjectFolderPath(syncFolder, project);
    const manifest = await readLastSyncedManifest(projectPath);
    const baselineFileTree = getLocalChangeBaseline(project, manifest);
    let diskNodes: DiskNode[];

    try {
      diskNodes = await readProjectDiskTree(projectPath);
    } catch {
      continue;
    }

    const diskFolders = diskNodes.filter((node) => node.type === "folder");
    const diskFolderPaths = new Set(diskFolders.map((node) => node.path));
    const diskFiles = diskNodes.filter((node) => node.type === "file");
    const diskFilePathMap = new Map(diskFiles.map((node) => [node.path, node]));

    const previousFolders = baselineFileTree
      .filter((node): node is ProjectFileNode & { type: "folder" } => node.type === "folder")
      .map((node) => ({
        ...node,
        safePath: normalizeRelativePath(node.path),
      }));
    const previousFiles = baselineFileTree
      .filter((node): node is ProjectFileNode & { type: "file" } => node.type === "file")
      .map((node) => ({
        ...node,
        safePath: normalizeRelativePath(node.path),
      }));
    const previousFolderPaths = new Set(previousFolders.map((node) => node.safePath));
    const previousFilePaths = new Set(previousFiles.map((node) => node.safePath));
    const movedFolderMap = detectFolderMoves({
      diskFiles,
      diskFolders,
      previousFiles,
      previousFolders,
      previousFolderPaths,
    });
    const movedOldFolderPaths = new Set(movedFolderMap.keys());
    const movedNewFolderPaths = new Set(movedFolderMap.values());

    for (const [fromPath, toPath] of movedFolderMap) {
      const folder = previousFolders.find((item) => item.safePath === fromPath);
      if (!folder) continue;

      changes.folderMoves.push({
        projectId: project.id,
        id: folder.id,
        path: toPath,
      });
      affectedProjectIds.add(project.id);
    }

    for (const folder of diskFolders) {
      const belongsToMovedFolder = [...movedNewFolderPaths].some((path) =>
        pathIsSameOrDescendant(folder.path, path),
      );

      if (!previousFolderPaths.has(folder.path) && !belongsToMovedFolder) {
        changes.folderCreates.push({
          projectId: project.id,
          path: folder.path,
        });
        affectedProjectIds.add(project.id);
      }
    }

    const removedFolderPaths = new Set<string>();
    const sortedPreviousFolders = previousFolders.sort(
      (a, b) => a.safePath.length - b.safePath.length,
    );

    for (const folder of sortedPreviousFolders) {
      if (hasRemovedAncestor(folder.safePath, removedFolderPaths)) continue;
      if (diskFolderPaths.has(folder.safePath)) continue;
      if ([...movedOldFolderPaths].some((path) => pathIsSameOrDescendant(folder.safePath, path))) continue;

      removedFolderPaths.add(folder.safePath);
      changes.folderRemovals.push({
        projectId: project.id,
        id: folder.id,
      });
      affectedProjectIds.add(project.id);
    }

    const usedMovedFilePaths = new Set<string>();

    for (const previousFile of previousFiles) {
      if (hasRemovedAncestor(previousFile.safePath, removedFolderPaths)) continue;

      const folderMoveEntry = [...movedFolderMap.entries()].find(([oldFolderPath]) =>
        previousFile.safePath.startsWith(`${oldFolderPath}/`),
      );
      const expectedMovedPath = folderMoveEntry
        ? replacePathPrefix(previousFile.safePath, folderMoveEntry[0], folderMoveEntry[1])
        : null;

      if (expectedMovedPath && diskFilePathMap.has(expectedMovedPath)) {
        usedMovedFilePaths.add(expectedMovedPath);
        continue;
      }

      if (diskFilePathMap.has(previousFile.safePath)) continue;

      const moveCandidates = diskFiles.filter((localFile) => {
        if (usedMovedFilePaths.has(localFile.path)) return false;
        if (previousFilePaths.has(localFile.path)) return false;
        if ([...movedNewFolderPaths].some((path) => pathIsSameOrDescendant(localFile.path, path))) return false;
        return localFileMatchesPreviousNode(localFile, previousFile);
      });

      if (moveCandidates.length === 1) {
        const movedFile = moveCandidates[0];
        usedMovedFilePaths.add(movedFile.path);
        changes.fileMoves.push({
          projectId: project.id,
          id: previousFile.id,
          path: movedFile.path,
        });
        affectedProjectIds.add(project.id);
        continue;
      }

      changes.fileRemovals.push({
        projectId: project.id,
        id: previousFile.id,
      });
      affectedProjectIds.add(project.id);
    }

    for (const localFile of diskFiles) {
      if (usedMovedFilePaths.has(localFile.path)) continue;
      if (previousFilePaths.has(localFile.path)) continue;
      if ([...movedNewFolderPaths].some((path) => pathIsSameOrDescendant(localFile.path, path))) continue;

      changes.fileCreates.push({
        projectId: project.id,
        path: localFile.path,
        sizeBytes: localFile.sizeBytes,
      });
      affectedProjectIds.add(project.id);
    }
  }

  return {
    changes,
    affectedProjectIds: [...affectedProjectIds],
  };
}
