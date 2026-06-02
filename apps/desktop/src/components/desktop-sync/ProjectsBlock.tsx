import "./SyncProjectsBlock.css";
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
  return `Last refreshed ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
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
    <div className="dss-projects">
      <div className="dss-projects-header">
        <div className="dss-projects-header-label">
          <h2 className="dss-projects-title">Projects</h2>
          <p className="dss-projects-meta">{selectedSummary}</p>
          <p className="dss-projects-meta">{formatRefreshTime(lastRefreshedAt)}</p>
        </div>
        <div className="dss-projects-actions">
          <button
            type="button"
            className="dss-btn"
            disabled={syncing || projectsLoading}
            onClick={onRefreshProjects}
          >
            {projectsLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            className="dss-btn"
            disabled={syncing || projectsLoading || checkingLocalRemovals || !syncFolder || !hasSelectedProjects || projectSource !== "local-api"}
            onClick={onCheckLocalRemovals}
          >
            {checkingLocalRemovals ? "Checking..." : "Check local removals"}
          </button>
          <button
            type="button"
            className="dss-btn"
            disabled={!canSync}
            onClick={onSyncSelectedProjects}
          >
            {syncing ? "Syncing..." : "Sync selected"}
          </button>
        </div>
      </div>

      {localRemovals.length > 0 && (
        <div className="dss-removals">
          <p className="dss-removals-count">
            {localRemovals.length} local removal{localRemovals.length === 1 ? "" : "s"} detected.
          </p>
          <div className="dss-removals-list">
            {localRemovals.slice(0, 5).map((removal) => (
              <span key={`${removal.projectId}-${removal.id}`}>
                {removal.type === "folder" ? "Folder" : "File"}: {removal.path}
              </span>
            ))}
            {localRemovals.length > 5 && <span>+{localRemovals.length - 5} more</span>}
          </div>
          <div className="dss-removals-actions">
            <button type="button" className="dss-btn" disabled={applyingLocalRemovals || syncing} onClick={onApplyLocalRemovals}>
              {applyingLocalRemovals ? "Applying..." : "Apply to Filmwave"}
            </button>
            <button type="button" className="dss-btn" disabled={applyingLocalRemovals || syncing} onClick={onIgnoreLocalRemovals}>
              Ignore
            </button>
          </div>
        </div>
      )}

      {syncProgress && (
        <div className="dss-progress">
          <div className="dss-progress-header">
            <span>{syncProgress.message}</span>
            <span>{syncProgress.completedFiles}/{syncProgress.totalFiles} files</span>
          </div>
          <div className="dss-progress-track">
            <div className="dss-progress-fill" style={{ width: `${syncProgressPercent}%` }} />
          </div>
        </div>
      )}

      {lastSyncReport && (
        <div className="dss-report">
          <span className="dss-report-dot" />
          <p>{lastSyncReport}</p>
        </div>
      )}

      <div className="dss-project-list">
        {projectsLoading ? (
          <div className="dss-project-row">
            <span className="dss-project-check" />
            <span className="dss-project-name">Loading Filmwave projects</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="dss-project-row">
            <span className="dss-project-check" />
            <span className="dss-project-name">No projects found</span>
          </div>
        ) : (
          projects.map((project) => {
            const selected = selectedProjectIds.includes(project.id);
            return (
              <button
                key={project.id}
                type="button"
                className={`dss-project-row${selected ? " is-selected" : ""}`}
                onClick={() => onToggleProject(project.id)}
              >
                <span className="dss-project-check">{selected ? "✓" : ""}</span>
                <span className="dss-project-info">
                  <span className="dss-project-name">{project.name}</span>
                  <span className="dss-project-desc">{project.description || "No description"}</span>
                </span>
                <span className="dss-project-tags">
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
