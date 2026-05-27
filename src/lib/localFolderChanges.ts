import { readDir, stat } from "@tauri-apps/plugin-fs";
import type {
  DesktopLocalChanges,
  Project,
  ProjectFileNode,
} from "./mockFilmwaveApi";
import {
  getProjectFolderPath,
  sanitizeProjectRelativePath,
} from "./syncEngine";

type DiskNode = {
  type: "folder" | "file";
  name: string;
  path: string;
  sizeBytes?: number;
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

function isPathInsidePath(path: string, possibleParent: string) {
  return path === possibleParent || path.startsWith(`${possibleParent}/`);
}

function hasRemovedAncestor(path: string, removedFolderPaths: Set<string>) {
  for (const removedFolderPath of removedFolderPaths) {
    if (path.startsWith(`${removedFolderPath}/`)) return true;
  }

  return false;
}

function getNodeUpdatedAt(node: ProjectFileNode) {
  return node.updatedAt ?? "";
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

function localFileMatchesPreviousNode(localFile: DiskNode, previousFile: ProjectFileNode) {
  const sameName = getNameFromPath(localFile.path) === getNameFromPath(previousFile.path);
  const previousSize = Number(previousFile.sizeBytes || 0);
  const sameSize = !previousSize || !localFile.sizeBytes || localFile.sizeBytes === previousSize;

  return sameName && sameSize;
}

function createEmptyChanges(): DesktopLocalChanges {
  return {
    folderCreates: [],
    fileMoves: [],
    fileRemovals: [],
    folderRemovals: [],
    ignoredFileAddCount: 0,
  };
}

export function hasDesktopLocalChanges(changes: DesktopLocalChanges) {
  return (
    changes.folderCreates.length > 0 ||
    changes.fileMoves.length > 0 ||
    changes.fileRemovals.length > 0 ||
    changes.folderRemovals.length > 0 ||
    changes.ignoredFileAddCount > 0
  );
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
    let diskNodes: DiskNode[];

    try {
      diskNodes = await readProjectDiskTree(projectPath);
    } catch {
      continue;
    }

    const diskFolderPaths = new Set(
      diskNodes.filter((node) => node.type === "folder").map((node) => node.path),
    );
    const diskFiles = diskNodes.filter((node) => node.type === "file");
    const diskFilePathMap = new Map(diskFiles.map((node) => [node.path, node]));

    const previousFolders = project.files
      .filter((node) => node.type === "folder")
      .map((node) => ({
        ...node,
        safePath: normalizeRelativePath(node.path),
      }));
    const previousFiles = project.files
      .filter((node) => node.type === "file")
      .map((node) => ({
        ...node,
        safePath: normalizeRelativePath(node.path),
      }));
    const previousFolderPaths = new Set(previousFolders.map((node) => node.safePath));
    const previousFilePaths = new Set(previousFiles.map((node) => node.safePath));

    for (const folder of diskNodes.filter((node) => node.type === "folder")) {
      if (!previousFolderPaths.has(folder.path)) {
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
      if (diskFilePathMap.has(previousFile.safePath)) continue;

      const moveCandidates = diskFiles.filter((localFile) => {
        if (usedMovedFilePaths.has(localFile.path)) return false;
        if (previousFilePaths.has(localFile.path)) return false;
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

    const ignoredFileAdds = diskFiles.filter((localFile) => {
      if (usedMovedFilePaths.has(localFile.path)) return false;
      if (previousFilePaths.has(localFile.path)) return false;
      return ![...previousFiles].some((previousFile) =>
        isPathInsidePath(localFile.path, getParentPath(previousFile.safePath)),
      );
    }).length;

    if (ignoredFileAdds > 0) {
      changes.ignoredFileAddCount += ignoredFileAdds;
      affectedProjectIds.add(project.id);
    }
  }

  return {
    changes,
    affectedProjectIds: [...affectedProjectIds],
  };
}
