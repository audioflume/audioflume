import {
  exists,
  mkdir,
  readTextFile,
  remove,
  rename,
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
  manifestFileCount: number;
};

function sanitizeFolderName(name: string) {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeRelativePath(path: string) {
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

export function getProjectFolderPath(syncFolder: string, project: Project) {
  return `${syncFolder}/${sanitizeFolderName(project.name)}`;
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

function fileVersionMatches({
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
    (previousFile.downloadUrl ?? "") === (currentFile.downloadUrl ?? "") &&
    (previousFile.path ?? "") === (currentFile.path ?? "")
  );
}

function getRemovedFilePath(removedPath: string, relativePath: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = relativePath.split("/").pop() ?? "removed-file";

  return `${removedPath}/${timestamp}-${filename}`;
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

export function formatSyncReport(result: SyncResult) {
  const projectLabel = result.projectCount === 1 ? "project" : "projects";
  const createdFileLabel = result.createdFileCount === 1 ? "file" : "files";
  const updatedFileLabel = result.updatedFileCount === 1 ? "file" : "files";
  const skippedFileLabel = result.skippedFileCount === 1 ? "file" : "files";
  const downloadedFileLabel = result.downloadedFileCount === 1 ? "file" : "files";
  const placeholderFileLabel = result.placeholderFileCount === 1 ? "placeholder" : "placeholders";
  const staleFileLabel = result.staleFileCount === 1 ? "stale file" : "stale files";
  const folderLabel = result.checkedFolderCount === 1 ? "folder" : "folders";
  const manifestLabel = result.manifestFileCount === 1 ? "manifest" : "manifests";

  return `Synced ${result.projectCount} ${projectLabel}. Created ${result.createdFileCount} ${createdFileLabel}, updated ${result.updatedFileCount} ${updatedFileLabel}, skipped ${result.skippedFileCount} existing ${skippedFileLabel}, downloaded ${result.downloadedFileCount} ${downloadedFileLabel}, wrote ${result.placeholderFileCount} ${placeholderFileLabel}, moved ${result.staleFileCount} ${staleFileLabel}, checked ${result.checkedFolderCount} ${folderLabel}, and wrote ${result.manifestFileCount} ${manifestLabel}.`;
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
      const canSkipExistingFile =
        fileAlreadyExists &&
        fileVersionMatches({
          currentFile: file,
          currentUpdatedAt,
          previousFile,
        });

      if (parentPath) {
        await mkdir(`${projectPath}/${parentPath}`, { recursive: true });
      }

      if (wasMoved && previousFile) {
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
