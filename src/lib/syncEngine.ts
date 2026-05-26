import {
  exists,
  mkdir,
  readTextFile,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
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

export type SyncResult = {
  projectCount: number;
  checkedFolderCount: number;
  createdFileCount: number;
  updatedFileCount: number;
  skippedFileCount: number;
  downloadedFileCount: number;
  placeholderFileCount: number;
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

async function downloadFileToPath(url: string, filePath: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const data = new Uint8Array(await response.arrayBuffer());
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
  const folderLabel = result.checkedFolderCount === 1 ? "folder" : "folders";
  const manifestLabel = result.manifestFileCount === 1 ? "manifest" : "manifests";

  return `Synced ${result.projectCount} ${projectLabel}. Created ${result.createdFileCount} ${createdFileLabel}, updated ${result.updatedFileCount} ${updatedFileLabel}, skipped ${result.skippedFileCount} existing ${skippedFileLabel}, downloaded ${result.downloadedFileCount} ${downloadedFileLabel}, wrote ${result.placeholderFileCount} ${placeholderFileLabel}, checked ${result.checkedFolderCount} ${folderLabel}, and wrote ${result.manifestFileCount} ${manifestLabel}.`;
}

export async function syncProjectsToFolder({
  projects,
  syncFolder,
}: {
  projects: Project[];
  syncFolder: string;
}): Promise<SyncResult> {
  const result: SyncResult = {
    projectCount: projects.length,
    checkedFolderCount: 0,
    createdFileCount: 0,
    updatedFileCount: 0,
    skippedFileCount: 0,
    downloadedFileCount: 0,
    placeholderFileCount: 0,
    manifestFileCount: 0,
  };

  for (const project of projects) {
    const projectFolderName = sanitizeFolderName(project.name);
    const projectPath = `${syncFolder}/${projectFolderName}`;
    const manifestPath = `${projectPath}/_filmwave`;
    const manifestFilePath = `${manifestPath}/manifest.json`;
    const previousManifest = await readProjectManifest(manifestFilePath);
    const nextManifest = buildManifest(project);

    await mkdir(projectPath, { recursive: true });
    await mkdir(manifestPath, { recursive: true });
    result.checkedFolderCount += 2;

    const folderNodes = project.files.filter((node) => node.type === "folder");
    const fileNodes = project.files.filter((node) => node.type === "file");

    for (const folder of folderNodes) {
      const safePath = sanitizeRelativePath(folder.path);

      await mkdir(`${projectPath}/${safePath}`, { recursive: true });
      result.checkedFolderCount += 1;
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

      if (canSkipExistingFile) {
        result.skippedFileCount += 1;
        continue;
      }

      if (file.downloadUrl) {
        await downloadFileToPath(file.downloadUrl, filePath);
        result.downloadedFileCount += 1;
      } else {
        await writePlaceholderFile({
          file,
          filePath,
          project,
          updatedAt: currentUpdatedAt,
        });
        result.placeholderFileCount += 1;
      }

      if (fileAlreadyExists) {
        result.updatedFileCount += 1;
      } else {
        result.createdFileCount += 1;
      }
    }

    await writeTextFile(manifestFilePath, JSON.stringify(nextManifest, null, 2));

    result.manifestFileCount += 1;
  }

  return result;
}
