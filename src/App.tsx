import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import {
  DEFAULT_MOCK_UPDATED_AT,
  getMockProjects,
  type Project,
  type ProjectFileNode,
} from "./lib/mockFilmwaveApi";
import "./App.css";

const SETTINGS_STORE = "filmwave-settings.json";

type SyncManifest = {
  projectId: string;
  projectName: string;
  syncedAt: string;
  source: "mock-all-files";
  fileTree: ProjectFileNode[];
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

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [syncFolder, setSyncFolder] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState("Not connected");
  const [lastSyncReport, setLastSyncReport] = useState<string | null>(null);

  const hasSelectedProjects = selectedProjectIds.length > 0;
  const canSync = Boolean(syncFolder) && hasSelectedProjects && !projectsLoading;

  const selectedSummary = useMemo(() => {
    if (projectsLoading) {
      return "Loading projects...";
    }

    if (!hasSelectedProjects) {
      return "No projects selected";
    }

    const selectedCount = selectedProjectIds.length;
    const label = selectedCount === 1 ? "project" : "projects";

    return `${selectedCount} ${label} selected`;
  }, [hasSelectedProjects, projectsLoading, selectedProjectIds.length]);

  useEffect(() => {
    async function loadSavedSettings() {
      const store = await load(SETTINGS_STORE);
      const savedFolder = await store.get<string>("syncFolder");

      if (savedFolder) {
        setSyncFolder(savedFolder);
        setSyncStatus("Folder ready");
      }
    }

    async function loadProjects() {
      setProjectsLoading(true);

      try {
        const nextProjects = await getMockProjects();
        setProjects(nextProjects);
      } catch (error) {
        console.error(error);
        setSyncStatus("Could not load projects");
      } finally {
        setProjectsLoading(false);
      }
    }

    loadSavedSettings();
    loadProjects();
  }, []);

  async function chooseSyncFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose Filmwave sync folder",
    });

    if (typeof selected === "string") {
      const store = await load(SETTINGS_STORE);

      setSyncFolder(selected);
      setSyncStatus("Folder ready");

      await store.set("syncFolder", selected);
      await store.save();
    }
  }

  function toggleProject(projectId: string) {
    setSelectedProjectIds((current) => {
      if (current.includes(projectId)) {
        return current.filter((id) => id !== projectId);
      }

      return [...current, projectId];
    });
  }

  async function syncSelectedProjects() {
    if (!syncFolder) {
      setSyncStatus("Choose a sync folder first");
      return;
    }

    if (selectedProjectIds.length === 0) {
      setSyncStatus("Select a project first");
      return;
    }

    try {
      setSyncStatus("Checking files...");
      setLastSyncReport(null);

      const selectedProjects = projects.filter((project) =>
        selectedProjectIds.includes(project.id),
      );

      let checkedFolderCount = 0;
      let createdFileCount = 0;
      let updatedFileCount = 0;
      let skippedFileCount = 0;
      let manifestFileCount = 0;

      for (const project of selectedProjects) {
        const projectFolderName = sanitizeFolderName(project.name);
        const projectPath = `${syncFolder}/${projectFolderName}`;
        const manifestPath = `${projectPath}/_filmwave`;
        const manifestFilePath = `${manifestPath}/manifest.json`;
        const previousManifest = await readProjectManifest(manifestFilePath);
        const nextManifest = buildManifest(project);

        await mkdir(projectPath, { recursive: true });
        await mkdir(manifestPath, { recursive: true });
        checkedFolderCount += 2;

        const folderNodes = project.files.filter(
          (node) => node.type === "folder",
        );
        const fileNodes = project.files.filter((node) => node.type === "file");

        for (const folder of folderNodes) {
          const safePath = sanitizeRelativePath(folder.path);

          await mkdir(`${projectPath}/${safePath}`, { recursive: true });
          checkedFolderCount += 1;
        }

        for (const file of fileNodes) {
          const safePath = sanitizeRelativePath(file.path);
          const filePath = `${projectPath}/${safePath}`;
          const parentPath = safePath.split("/").slice(0, -1).join("/");
          const previousFile = previousManifest?.fileTree.find(
            (node) => node.id === file.id && node.type === "file",
          );
          const currentUpdatedAt = getNodeUpdatedAt(file);
          const previousUpdatedAt = previousFile?.updatedAt ?? null;
          const fileAlreadyExists = await exists(filePath);

          if (parentPath) {
            await mkdir(`${projectPath}/${parentPath}`, { recursive: true });
          }

          if (fileAlreadyExists && previousUpdatedAt === currentUpdatedAt) {
            skippedFileCount += 1;
            continue;
          }

          await writeTextFile(
            filePath,
            [
              `Filmwave placeholder file`,
              ``,
              `Project: ${project.name}`,
              `File: ${file.name}`,
              `Path: ${file.path}`,
              `Size: ${file.sizeLabel ?? "Unknown"}`,
              `Updated at: ${currentUpdatedAt}`,
              ``,
              `This placeholder represents a future synced file from Filmwave's All Files section.`,
            ].join("\n"),
          );

          if (fileAlreadyExists) {
            updatedFileCount += 1;
          } else {
            createdFileCount += 1;
          }
        }

        await writeTextFile(
          manifestFilePath,
          JSON.stringify(nextManifest, null, 2),
        );

        manifestFileCount += 1;
      }

      const projectLabel =
        selectedProjects.length === 1 ? "project" : "projects";
      const createdFileLabel = createdFileCount === 1 ? "file" : "files";
      const updatedFileLabel = updatedFileCount === 1 ? "file" : "files";
      const skippedFileLabel = skippedFileCount === 1 ? "file" : "files";
      const folderLabel = checkedFolderCount === 1 ? "folder" : "folders";
      const manifestLabel = manifestFileCount === 1 ? "manifest" : "manifests";

      setSyncStatus("Synced");
      setLastSyncReport(
        `Synced ${selectedProjects.length} ${projectLabel}. Created ${createdFileCount} ${createdFileLabel}, updated ${updatedFileCount} ${updatedFileLabel}, skipped ${skippedFileCount} existing ${skippedFileLabel}, checked ${checkedFolderCount} ${folderLabel}, and wrote ${manifestFileCount} ${manifestLabel}.`,
      );
    } catch (error) {
      console.error(error);
      setSyncStatus("Sync failed");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "An unknown sync error occurred.",
      );
    }
  }

  return (
    <main className="app-shell">
      <section className="sync-card">
        <div className="eyebrow">Filmwave Desktop</div>

        <div className="header-row">
          <div>
            <h1>Sync your project music</h1>
            <p>
              Keep selected Filmwave project files available locally for
              editing, dragging, and offline access.
            </p>
          </div>

          <div className="status-pill">
            <span className="status-dot" />
            {syncStatus}
          </div>
        </div>

        <div className="section-block">
          <div>
            <h2>Account</h2>
            <p>Connect your Filmwave account to access your projects.</p>
          </div>

          <button type="button" className="primary-button">
            Sign in
          </button>
        </div>

        <div className="section-block">
          <div>
            <h2>Sync folder</h2>
            <p className="folder-path">{syncFolder ?? "No folder selected"}</p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={chooseSyncFolder}
          >
            Choose folder
          </button>
        </div>

        <div className="projects-panel">
          <div className="projects-header">
            <div>
              <h2>Projects</h2>
              <p>{selectedSummary}</p>
            </div>

            <button
              type="button"
              className="secondary-button"
              disabled={!canSync}
              onClick={syncSelectedProjects}
            >
              Sync selected
            </button>
          </div>

          {lastSyncReport && (
            <div className="sync-report">
              <span className="sync-report-dot" />
              <p>{lastSyncReport}</p>
            </div>
          )}

          <div className="project-list">
            {projectsLoading ? (
              <div className="project-row is-loading">
                <span className="project-check" aria-hidden="true" />
                <span className="project-main">
                  <span className="project-name">Loading Filmwave projects</span>
                  <span className="project-description">
                    Fetching your project file trees...
                  </span>
                </span>
              </div>
            ) : (
              projects.map((project) => {
                const selected = selectedProjectIds.includes(project.id);

                return (
                  <button
                    key={project.id}
                    type="button"
                    className={`project-row ${selected ? "is-selected" : ""}`}
                    onClick={() => toggleProject(project.id)}
                  >
                    <span className="project-check" aria-hidden="true">
                      {selected ? "✓" : ""}
                    </span>

                    <span className="project-main">
                      <span className="project-name">{project.name}</span>
                      <span className="project-description">
                        {project.description}
                      </span>
                    </span>

                    <span className="project-meta">
                      <span>{project.fileCount} files</span>
                      <span>{project.sizeLabel}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
