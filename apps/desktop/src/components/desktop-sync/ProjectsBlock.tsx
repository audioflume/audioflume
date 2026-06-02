import type { Project } from "../../lib/mockFilmwaveApi";
import type { LocalRemoval, SyncProgress } from "../../lib/syncEngine";

type ProjectSource = "mock" | "local-api";

type ProjectsBlockProps = {
  applyingLocalRemovals: boolean;
  canSync: boolean;
  checkingLocalRemovals: boolean;
  hasSelectedProjects: boolean;
  lastRefreshedAt: Date | null;
  lastSyncReport: string | null;
  localRemovals: LocalRemoval[];
  projectSource: ProjectSource;
  projects: Project[];
  projectsLoading: boolean;
  selectedProjectIds: string[];
  selectedSummary: string;
  syncFolder: string | null;
  syncProgress: SyncProgress | null;
  syncProgressPercent: number;
  syncing: boolean;
  onApplyLocalRemovals: () => void;
  onCheckLocalRemovals: () => void;
  onIgnoreLocalRemovals: () => void;
  onRefreshProjects: () => void;
  onSyncSelectedProjects: () => void;
  onToggleProject: (projectId: string) => void;
};

function formatRefreshTime(date: Date | null) {
  if (!date) return "Not refreshed yet";

  return `Last refreshed ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export default function ProjectsBlock({
  applyingLocalRemovals,
  canSync,
  checkingLocalRemovals,
  hasSelectedProjects,
  lastRefreshedAt,
  lastSyncReport,
  localRemovals,
  projectSource,
  projects,
  projectsLoading,
  selectedProjectIds,
  selectedSummary,
  syncFolder,
  syncProgress,
  syncProgressPercent,
  syncing,
  onApplyLocalRemovals,
  onCheckLocalRemovals,
  onIgnoreLocalRemovals,
  onRefreshProjects,
  onSyncSelectedProjects,
  onToggleProject,
}: ProjectsBlockProps) {
  return (
    <div className="projects-panel">
      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p>{selectedSummary}</p>
          <p className="refresh-meta">{formatRefreshTime(lastRefreshedAt)}</p>
        </div>

        <div className="button-group">
          <button
            type="button"
            className="secondary-button"
            disabled={syncing || projectsLoading}
            onClick={onRefreshProjects}
          >
            {projectsLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={
              syncing ||
              projectsLoading ||
              checkingLocalRemovals ||
              !syncFolder ||
              !hasSelectedProjects ||
              projectSource !== "local-api"
            }
            onClick={onCheckLocalRemovals}
          >
            {checkingLocalRemovals ? "Checking..." : "Check local removals"}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!canSync}
            onClick={onSyncSelectedProjects}
          >
            {syncing ? "Syncing..." : "Sync selected"}
          </button>
        </div>
      </div>

      {localRemovals.length > 0 && (
        <div className="sync-report local-removals-report">
          <span className="sync-report-dot" />
          <div>
            <p>
              {localRemovals.length} local removal
              {localRemovals.length === 1 ? "" : "s"} detected. Applying will
              remove these items from the Filmwave project only.
            </p>
            <div className="local-removal-list">
              {localRemovals.slice(0, 5).map((removal) => (
                <span key={`${removal.projectId}-${removal.id}`}>
                  {removal.type === "folder" ? "Folder" : "File"}:{" "}
                  {removal.path}
                </span>
              ))}
              {localRemovals.length > 5 && (
                <span>+{localRemovals.length - 5} more</span>
              )}
            </div>
            <div className="local-removal-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={applyingLocalRemovals || syncing}
                onClick={onApplyLocalRemovals}
              >
                {applyingLocalRemovals ? "Applying..." : "Apply to Filmwave"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={applyingLocalRemovals || syncing}
                onClick={onIgnoreLocalRemovals}
              >
                Ignore
              </button>
            </div>
          </div>
        </div>
      )}

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
              <span className="project-name">Loading Filmwave projects</span>
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
                onClick={() => onToggleProject(project.id)}
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
  );
}
