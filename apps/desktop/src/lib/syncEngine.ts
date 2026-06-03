import {
  exists,
  mkdir,
  readTextFile,
  remove,
  rename,
  stat,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  DEFAULT_MOCK_UPDATED_AT,
  type Project,
  type ProjectFileNode,
} from "./mockFilmwaveApi";

export type SyncManifest = {
  projectId: string;
  projectName: string;
  syncedAt: string;
  source: "mock-all-files";
  fileTree: ProjectFileNode[];
};

export type LocalRemoval = {
  projectId: string;
  projectName: string;
  id: string;
  type: "file" | "folder";
  name: string;
  path: string;
};

export type SyncProgress = {
  phase:
    | "preparing"
    | "checking"
    | "downloading"
    | "writing-placeholder"
    | "stale"
    | "manifest"
    | "complete";
  message: string;
  projectName?: string;
  fileName?: string;
  completedFiles: number;
  totalFiles: number;
};

export type SyncResult = {
  projectCount: number;
  checkedFolderCount: number;
  createdFileCount: number;
  updatedFileCount: number;
  skippedFileCount: number;
  downloadedFileCount: number;
  placeholderFileCount: number;
  staleFileCount: number;
  staleFolderCount: number;
  manifestFileCount: number;
};

function sanitizeFolderName(name: string) {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeProjectRelativePath(path: string) {
  const cleanedPath = path
    .split("/")
    .map((part) => sanitizeFolderName(part))
    .filter(Boolean)
    .join("/");

  if (
    !cleanedPath ||
    cleanedPath.startsWith("/") ||
    cleanedPath.includes("..")
  ) {
    throw new Error(`Unsafe file path: ${path}`);
  }

  return cleanedPath;
}

function sanitizeRelativePath(path: string) {
  return sanitizeProjectRelativePath(path);
}

const PROJECTS_SYNC_FOLDER_NAME = "Projects";

export function getProjectFolderPath(syncFolder: string, project: Project) {
  return `${syncFolder}/${PROJECTS_SYNC_FOLDER_NAME}/${sanitizeFolderName(project.name)}`;
}

export function getProjectNodeLocalPath({
  node,
  project,
  syncFolder,
}: {
  node: ProjectFileNode;
  project: Project;
  syncFolder: string;
}) {
  return `${getProjectFolderPath(syncFolder, project)}/${sanitizeProjectRelativePath(node.path)}`;
}

function getManifestFilePath(syncFolder: string, project: Project) {
  return `${getProjectFolderPath(syncFolder, project)}/_filmwave/manifest.json`;
}

function getNodeUpdatedAt(node: ProjectFileNode) {
  return node.updatedAt ?? DEFAULT_MOCK_UPDATED_AT;
}

function buildManifest(project: Project): SyncManifest {
  return {
    projectId: project.id,
    projectName: project.name,
    syncedAt: new Date().toISOString(),
    source: "mock-all-files",
    fileTree: project.files.map((node) => ({
      ...node,
      updatedAt: getNodeUpdatedAt(node),
    })),
  };
}

async function readProjectManifest(manifestFilePath: string) {
  const hasManifest = await exists(manifestFilePath);

  if (!hasManifest) {
    return null;
  }

  try {
    const rawManifest = await readTextFile(manifestFilePath);
    return JSON.parse(rawManifest) as SyncManifest;
  } catch (error) {
    console.warn("Could not read existing Filmwave manifest.", error);
    return null;
  }
}

function fileContentVersionMatches({
  currentFile,
  currentUpdatedAt,
  previousFile,
}: {
  currentFile: ProjectFileNode;
  currentUpdatedAt: string;
  previousFile: ProjectFileNode | undefined;
}) {
  if (!previousFile) {
    return false;
  }

  return (
    previousFile.updatedAt === currentUpdatedAt &&
    (previousFile.downloadUrl ?? "") === (currentFile.downloadUrl ?? "")
  );
}

async function localFileSizeMatches(filePath: string, expectedSizeBytes?: number) {
  if (!expectedSizeBytes || expectedSizeBytes <= 0) {
    return true;
  }

  try {
    const fileInfo = await stat(filePath);
    return Number(fileInfo.size) === Number(expectedSizeBytes);
  } catch {
    return false;
  }
}

async function canSkipLocalFile({
  currentFile,
  currentUpdatedAt,
  filePath,
  previousFile,
}: {
  currentFile: ProjectFileNode;
  currentUpdatedAt: string;
  filePath: string;
  previousFile: ProjectFileNode | undefined;
}) {
  if (!(await exists(filePath))) {
    return false;
  }

  if (
    !fileContentVersionMatches({
      currentFile,
      currentUpdatedAt,
      previousFile,
    })
  ) {
    return false;
  }

  return localFileSizeMatches(filePath, currentFile.sizeBytes);
}

function getRemovedFilePath(removedPath: string, relativePath: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = relativePath.split("/").pop() ?? "removed-file";

  return `${removedPath}/${timestamp}-${filename}`;
}

function getRemovedFolderPath(removedPath: string, relativePath: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const folderName = relativePath.split("/").pop() ?? "removed-folder";

  return `${removedPath}/folders/${timestamp}-${folderName}`;
}

async function moveExistingFileToRemoved({
  fromPath,
  removedPath,
  relativePath,
}: {
  fromPath: string;
  removedPath: string;
  relativePath: string;
}) {
  if (!(await exists(fromPath))) {
    return false;
  }

  const destinationPath = getRemovedFilePath(removedPath, relativePath);

  await mkdir(removedPath, { recursive: true });

  if (await exists(destinationPath)) {
    await remove(destinationPath);
  }

  await rename(fromPath, destinationPath);
  return true;
}

async function moveExistingFolderToRemoved({
  fromPath,
  removedPath,
  relativePath,
}: {
  fromPath: string;
  removedPath: string;
  relativePath: string;
}) {
  if (!(await exists(fromPath))) {
    return false;
  }

  const destinationPath = getRemovedFolderPath(removedPath, relativePath);

  await mkdir(`${removedPath}/folders`, { recursive: true });

  if (await exists(destinationPath)) {
    await remove(destinationPath, { recursive: true });
  }

  await rename(fromPath, destinationPath);
  return true;
}

function isPathOrAncestorOfPath(path: string, possibleAncestor: string) {
  return path === possibleAncestor || path.startsWith(`${possibleAncestor}/`);
}

function hasAncestorPath(path: string, possibleAncestors: Set<string>) {
  for (const ancestor of possibleAncestors) {
    if (path.startsWith(`${ancestor}/`)) {
      return true;
    }
  }

  return false;
}

function folderIsStillNeeded({
  currentFilePaths,
  currentFolderPaths,
  folderPath,
}: {
  currentFilePaths: Set<string>;
  currentFolderPaths: Set<string>;
  folderPath: string;
}) {
  if (currentFolderPaths.has(folderPath)) {
    return true;
  }

  for (const currentFolderPath of currentFolderPaths) {
    if (isPathOrAncestorOfPath(currentFolderPath, folderPath)) {
      return true;
    }
  }

  for (const currentFilePath of currentFilePaths) {
    if (isPathOrAncestorOfPath(currentFilePath, folderPath)) {
      return true;
    }
  }

  return false;
}

async function downloadFileToPath(url: string, filePath: string) {
  const response = await tauriFetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = new Uint8Array(await response.arrayBuffer());

  if (data.byteLength < 1024 && contentType.includes("text/html")) {
    throw new Error(`Download returned HTML instead of audio: ${url}`);
  }

  await writeFile(filePath, data);
}

async function writePlaceholderFile({
  file,
  filePath,
  project,
  updatedAt,
}: {
  file: ProjectFileNode;
  filePath: string;
  project: Project;
  updatedAt: string;
}) {
  await writeTextFile(
    filePath,
    [
      `Filmwave placeholder file`,
      ``,
      `Project: ${project.name}`,
      `File: ${file.name}`,
      `Path: ${file.path}`,
      `Size: ${file.sizeLabel ?? "Unknown"}`,
      `Updated at: ${updatedAt}`,
      `Download URL: ${file.downloadUrl ?? "None"}`,
      ``,
      `This placeholder represents a future synced file from Filmwave's All Files section.`,
    ].join("\n"),
  );
}

export async function detectLocalRemovals({
  projects,
  syncFolder,
}: {
  projects: Project[];
  syncFolder: string;
}) {
  const removals: LocalRemoval[] = [];

  for (const project of projects) {
    const projectPath = getProjectFolderPath(syncFolder, project);
    const manifest = await readProjectManifest(getManifestFilePath(syncFolder, project));

    if (!manifest) continue;

    const removedFolderPaths = new Set<string>();
    const previousFolders = manifest.fileTree
      .filter((node) => node.type === "folder")
      .map((node) => ({
        ...node,
        safePath: sanitizeRelativePath(node.path),
      }))
      .sort((a, b) => a.safePath.length - b.safePath.length);

    for (const folder of previousFolders) {
      if (hasAncestorPath(folder.safePath, removedFolderPaths)) continue;

      const folderPath = `${projectPath}/${folder.safePath}`;

      if (await exists(folderPath)) continue;

      removedFolderPaths.add(folder.safePath);
      removals.push({
        projectId: manifest.projectId || project.id,
        projectName: manifest.projectName || project.name,
        id: folder.id,
        type: "folder",
        name: folder.name,
        path: folder.safePath,
      });
    }

    const previousFiles = manifest.fileTree
      .filter((node) => node.type === "file")
      .map((node) => ({
        ...node,
        safePath: sanitizeRelativePath(node.path),
      }));

    for (const file of previousFiles) {
      if (hasAncestorPath(file.safePath, removedFolderPaths)) continue;

      const filePath = `${projectPath}/${file.safePath}`;

      if (await exists(filePath)) continue;

      removals.push({
        projectId: manifest.projectId || project.id,
        projectName: manifest.projectName || project.name,
        id: file.id,
        type: "file",
        name: file.name,
        path: file.safePath,
      });
    }
  }

  return removals;
}

export function formatSyncReport(result: SyncResult) {
  const projectLabel = result.projectCount === 1 ? "project" : "projects";
  const createdFileLabel = result.createdFileCount === 1 ? "file" : "files";
  const updatedFileLabel = result.updatedFileCount === 1 ? "file" : "files";
  const skippedFileLabel = result.skippedFileCount === 1 ? "file" : "files";
  const downloadedFileLabel = result.downloadedFileCount === 1 ? "file" : "files";
  const placeholderFileLabel = result.placeholderFileCount === 1 ? "placeholder" : "placeholders";
  const staleFileLabel = result.staleFileCount === 1 ? "stale file" : "stale files";
  const staleFolderLabel = result.staleFolderCount === 1 ? "stale folder" : "stale folders";
  const folderLabel = result.checkedFolderCount === 1 ? "folder" : "folders";
  const manifestLabel = result.manifestFileCount === 1 ? "manifest" : "manifests";

  return `Synced ${result.projectCount} ${projectLabel}. Created ${result.createdFileCount} ${createdFileLabel}, updated ${result.updatedFileCount} ${updatedFileLabel}, skipped ${result.skippedFileCount} existing ${skippedFileLabel}, downloaded ${result.downloadedFileCount} ${downloadedFileLabel}, wrote ${result.placeholderFileCount} ${placeholderFileLabel}, moved ${result.staleFileCount} ${staleFileLabel}, moved ${result.staleFolderCount} ${staleFolderLabel}, checked ${result.checkedFolderCount} ${folderLabel}, and wrote ${result.manifestFileCount} ${manifestLabel}.`;
}

export async function syncProjectsToFolder({
  onProgress,
  projects,
  syncFolder,
}: {
  onProgress?: (progress: SyncProgress) => void;
  projects: Project[];
  syncFolder: string;
}): Promise<SyncResult> {
  const totalFiles = projects.reduce(
    (total, project) =>
      total + project.files.filter((node) => node.type === "file").length,
    0,
  );
  let completedFiles = 0;

  const result: SyncResult = {
    projectCount: projects.length,
    checkedFolderCount: 0,
    createdFileCount: 0,
    updatedFileCount: 0,
    skippedFileCount: 0,
    downloadedFileCount: 0,
    placeholderFileCount: 0,
    staleFileCount: 0,
    staleFolderCount: 0,
    manifestFileCount: 0,
  };

  onProgress?.({
    phase: "preparing",
    message: "Preparing sync...",
    completedFiles,
    totalFiles,
  });

  for (const project of projects) {
    const projectPath = getProjectFolderPath(syncFolder, project);
    const manifestPath = `${projectPath}/_filmwave`;
    const removedPath = `${manifestPath}/removed`;
    const manifestFilePath = `${manifestPath}/manifest.json`;
    const previousManifest = await readProjectManifest(manifestFilePath);
    const nextManifest = buildManifest(project);

    onProgress?.({
      phase: "checking",
      message: `Checking ${project.name}...`,
      projectName: project.name,
      completedFiles,
      totalFiles,
    });

    await mkdir(projectPath, { recursive: true });
    await mkdir(manifestPath, { recursive: true });
    result.checkedFolderCount += 2;

    const folderNodes = project.files.filter((node) => node.type === "folder");
    const fileNodes = project.files.filter((node) => node.type === "file");
    const currentFileIds = new Set(fileNodes.map((node) => node.id));
    const currentFilePaths = new Set(
      fileNodes.map((node) => sanitizeRelativePath(node.path)),
    );
    const currentFolderPaths = new Set(
      folderNodes.map((node) => sanitizeRelativePath(node.path)),
    );

    for (const folder of folderNodes) {
      const safePath = sanitizeRelativePath(folder.path);

      await mkdir(`${projectPath}/${safePath}`, { recursive: true });
      result.checkedFolderCount += 1;
    }

    for (const previousFile of previousManifest?.fileTree.filter(
      (node) => node.type === "file",
    ) ?? []) {
      if (currentFileIds.has(previousFile.id)) continue;

      const safePath = sanitizeRelativePath(previousFile.path);
      const oldFilePath = `${projectPath}/${safePath}`;

      onProgress?.({
        phase: "stale",
        message: `Moving removed file: ${previousFile.name}`,
        projectName: project.name,
        fileName: previousFile.name,
        completedFiles,
        totalFiles,
      });

      const moved = await moveExistingFileToRemoved({
        fromPath: oldFilePath,
        removedPath,
        relativePath: safePath,
      });

      if (moved) {
        result.staleFileCount += 1;
      }
    }

    const previousFolders = previousManifest?.fileTree
      .filter((node) => node.type === "folder")
      .map((node) => ({
        ...node,
        safePath: sanitizeRelativePath(node.path),
      }))
      .sort((a, b) => b.safePath.length - a.safePath.length) ?? [];

    for (const previousFolder of previousFolders) {
      if (
        folderIsStillNeeded({
          currentFilePaths,
          currentFolderPaths,
          folderPath: previousFolder.safePath,
        })
      ) {
        continue;
      }

      const oldFolderPath = `${projectPath}/${previousFolder.safePath}`;

      onProgress?.({
        phase: "stale",
        message: `Moving removed folder: ${previousFolder.name}`,
        projectName: project.name,
        fileName: previousFolder.name,
        completedFiles,
        totalFiles,
      });

      const moved = await moveExistingFolderToRemoved({
        fromPath: oldFolderPath,
        removedPath,
        relativePath: previousFolder.safePath,
      });

      if (moved) {
        result.staleFolderCount += 1;
      }
    }

    for (const file of fileNodes) {
      const safePath = sanitizeRelativePath(file.path);
      const filePath = `${projectPath}/${safePath}`;
      const parentPath = safePath.split("/").slice(0, -1).join("/");
      const previousFile = previousManifest?.fileTree.find(
        (node) => node.id === file.id && node.type === "file",
      );
      const currentUpdatedAt = getNodeUpdatedAt(file);
      const fileAlreadyExists = await exists(filePath);
      const wasMoved = Boolean(previousFile && previousFile.path !== file.path);
      const canSkipExistingFile = await canSkipLocalFile({
        currentFile: file,
        currentUpdatedAt,
        filePath,
        previousFile,
      });

      if (parentPath) {
        await mkdir(`${projectPath}/${parentPath}`, { recursive: true });
      }

      if (wasMoved && previousFile && !canSkipExistingFile) {
        const previousSafePath = sanitizeRelativePath(previousFile.path);
        const previousFilePath = `${projectPath}/${previousSafePath}`;
        const moved = await moveExistingFileToRemoved({
          fromPath: previousFilePath,
          removedPath,
          relativePath: previousSafePath,
        });

        if (moved) {
          result.staleFileCount += 1;
        }
      }

      if (canSkipExistingFile) {
        result.skippedFileCount += 1;
        completedFiles += 1;
        onProgress?.({
          phase: "checking",
          message: `Skipped ${completedFiles} of ${totalFiles}: ${file.name}`,
          projectName: project.name,
          fileName: file.name,
          completedFiles,
          totalFiles,
        });
        continue;
      }

      if (file.downloadUrl) {
        onProgress?.({
          phase: "downloading",
          message: `Downloading ${completedFiles + 1} of ${totalFiles}: ${file.name}`,
          projectName: project.name,
          fileName: file.name,
          completedFiles,
          totalFiles,
        });
        await downloadFileToPath(file.downloadUrl, filePath);
        result.downloadedFileCount += 1;
      } else {
        onProgress?.({
          phase: "writing-placeholder",
          message: `Writing placeholder ${completedFiles + 1} of ${totalFiles}: ${file.name}`,
          projectName: project.name,
          fileName: file.name,
          completedFiles,
          totalFiles,
        });
        await writePlaceholderFile({
          file,
          filePath,
          project,
          updatedAt: currentUpdatedAt,
        });
        result.placeholderFileCount += 1;
      }

      completedFiles += 1;

      if (fileAlreadyExists) {
        result.updatedFileCount += 1;
      } else {
        result.createdFileCount += 1;
      }
    }

    onProgress?.({
      phase: "manifest",
      message: `Writing manifest for ${project.name}...`,
      projectName: project.name,
      completedFiles,
      totalFiles,
    });

    await writeTextFile(manifestFilePath, JSON.stringify(nextManifest, null, 2));

    result.manifestFileCount += 1;
  }

  onProgress?.({
    phase: "complete",
    message: "Sync complete",
    completedFiles,
    totalFiles,
  });

  return result;
}
