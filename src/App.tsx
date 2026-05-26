import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";
import { getMockProjects, type Project } from "./lib/mockFilmwaveApi";
import { formatSyncReport, syncProjectsToFolder } from "./lib/syncEngine";
import "./App.css";

const SETTINGS_STORE = "filmwave-settings.json";

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

      const result = await syncProjectsToFolder({
        projects: selectedProjects,
        syncFolder,
      });

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
