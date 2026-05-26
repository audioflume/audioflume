import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { load } from "@tauri-apps/plugin-store";
import {
  getFilmwaveProjects,
  getMockProjects,
  type Project,
} from "./lib/mockFilmwaveApi";
import {
  formatSyncReport,
  getProjectFolderPath,
  syncProjectsToFolder,
  type SyncProgress,
} from "./lib/syncEngine";
import "./App.css";

const SETTINGS_STORE = "filmwave-settings.json";

type ProjectSource = "mock" | "local-api";

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectSource, setProjectSource] = useState<ProjectSource>("mock");
  const [syncFolder, setSyncFolder] = useState<string | null>(null);
  const [lastSyncedFolder, setLastSyncedFolder] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState("Not connected");
  const [syncing, setSyncing] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncReport, setLastSyncReport] = useState<string | null>(null);

  const hasSelectedProjects = selectedProjectIds.length > 0;
  const canSync =
    Boolean(syncFolder) && hasSelectedProjects && !projectsLoading && !syncing;

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedProjectIds.includes(project.id)),
    [projects, selectedProjectIds],
  );

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

  const sourceDescription =
    projectSource === "mock"
      ? "Using local sample data"
      : "Using localhost:3000 Filmwave API";

  const syncProgressPercent = syncProgress?.totalFiles
    ? Math.round((syncProgress.completedFiles / syncProgress.totalFiles) * 100)
    : 0;

  useEffect(() => {
    async function loadSavedSettings() {
      const store = await load(SETTINGS_STORE);
      const savedFolder = await store.get<string>("syncFolder");
      const savedProjectSource =
        await store.get<ProjectSource>("projectSource");
      const savedLastSyncedFolder = await store.get<string>("lastSyncedFolder");

      if (savedFolder) {
        setSyncFolder(savedFolder);
        setSyncStatus("Folder ready");
      }

      if (savedLastSyncedFolder) {
        setLastSyncedFolder(savedLastSyncedFolder);
      }

      if (savedProjectSource === "mock" || savedProjectSource === "local-api") {
        setProjectSource(savedProjectSource);
      }
    }

    loadSavedSettings();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setProjectsLoading(true);
      setLastSyncReport(null);

      try {
        const nextProjects =
          projectSource === "local-api"
            ? await getFilmwaveProjects()
            : await getMockProjects();

        if (cancelled) return;

        const nextProjectIds = new Set(
          nextProjects.map((project) => project.id),
        );

        setProjects(nextProjects);
        setSelectedProjectIds((current) =>
          current.filter((projectId) => nextProjectIds.has(projectId)),
        );
        setSyncStatus(
          projectSource === "local-api"
            ? "Local API loaded"
            : "Mock data loaded",
        );
      } catch (error) {
        if (cancelled) return;

        console.error(error);
        setProjects([]);
        setSelectedProjectIds([]);
        setSyncStatus("Could not load projects");
        setLastSyncReport(
          error instanceof Error
            ? error.message
            : "Could not load Filmwave projects.",
        );
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [projectSource]);

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

  async function changeProjectSource(nextSource: ProjectSource) {
    if (nextSource === projectSource) return;

    const store = await load(SETTINGS_STORE);

    setSelectedProjectIds([]);
    setSyncProgress(null);
    setLastSyncReport(null);
    setProjectSource(nextSource);
    await store.set("projectSource", nextSource);
    await store.save();
  }

  function toggleProject(projectId: string) {
    setSelectedProjectIds((current) => {
      if (current.includes(projectId)) {
        return current.filter((id) => id !== projectId);
      }

      return [...current, projectId];
    });
  }

  async function openLastSyncedFolder() {
    if (!lastSyncedFolder || openingFolder) return;

    try {
      setOpeningFolder(true);
      await openPath(lastSyncedFolder);
    } catch (error) {
      console.error(error);
      setSyncStatus("Could not open folder");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "Could not open the synced folder.",
      );
    } finally {
      window.setTimeout(() => setOpeningFolder(false), 500);
    }
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
      setSyncing(true);
      setSyncStatus("Syncing...");
      setLastSyncReport(null);
      setSyncProgress({
        phase: "preparing",
        message: "Preparing sync...",
        completedFiles: 0,
        totalFiles: selectedProjects.reduce(
          (total, project) =>
            total + project.files.filter((node) => node.type === "file").length,
          0,
        ),
      });

      const result = await syncProjectsToFolder({
        projects: selectedProjects,
        syncFolder,
        onProgress: setSyncProgress,
      });

      const nextLastSyncedFolder =
        selectedProjects.length === 1
          ? getProjectFolderPath(syncFolder, selectedProjects[0])
          : syncFolder;
      const store = await load(SETTINGS_STORE);

      setLastSyncedFolder(nextLastSyncedFolder);
      await store.set("lastSyncedFolder", nextLastSyncedFolder);
      await store.save();

      setSyncStatus("Synced");
      setLastSyncReport(formatSyncReport(result));
    } catch (error) {
      console.error(error);
      setSyncStatus("Sync failed");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "An unknown sync error occurred.",
      );
    } finally {
      setSyncing(false);
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

          <div className={`status-pill ${syncing ? "is-syncing" : ""}`}>
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
            <h2>Project source</h2>
            <p>{sourceDescription}</p>
          </div>

          <div className="source-toggle" aria-label="Project data source">
            <button
              type="button"
              className={projectSource === "mock" ? "is-active" : ""}
              onClick={() => changeProjectSource("mock")}
            >
              Mock
            </button>
            <button
              type="button"
              className={projectSource === "local-api" ? "is-active" : ""}
              onClick={() => changeProjectSource("local-api")}
            >
              Local API
            </button>
          </div>
        </div>

        <div className="section-block">
          <div>
            <h2>Sync folder</h2>
            <p className="folder-path">{syncFolder ?? "No folder selected"}</p>
          </div>

          <div className="button-group">
            <button
              type="button"
              className="secondary-button"
              onClick={chooseSyncFolder}
              disabled={syncing}
            >
              Choose folder
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={openLastSyncedFolder}
              disabled={!lastSyncedFolder || syncing || openingFolder}
            >
              {openingFolder ? "Opening..." : "Open folder"}
            </button>
          </div>
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
              {syncing ? "Syncing..." : "Sync selected"}
            </button>
          </div>

          {syncProgress && (
            <div className="progress-panel">
              <div className="progress-header">
                <span>{syncProgress.message}</span>
                <span>
                  {syncProgress.completedFiles}/{syncProgress.totalFiles} files
                </span>
              </div>
              <div className="progress-track" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: `${syncProgressPercent}%` }}
                />
              </div>
            </div>
          )}

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
                  <span className="project-name">
                    Loading Filmwave projects
                  </span>
                  <span className="project-description">
                    Fetching your project file trees...
                  </span>
                </span>
              </div>
            ) : projects.length === 0 ? (
              <div className="project-row is-loading">
                <span className="project-check" aria-hidden="true" />
                <span className="project-main">
                  <span className="project-name">No projects found</span>
                  <span className="project-description">
                    Try switching sources or creating a project on Filmwave.
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
                        {project.description || "No description"}
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
