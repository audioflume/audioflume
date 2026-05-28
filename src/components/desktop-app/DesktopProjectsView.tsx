import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Project, ProjectFileNode } from "../../lib/mockFilmwaveApi";
import { getProjectNodeLocalPath } from "../../lib/syncEngine";
import {
  DesktopFolderGlyph,
  DesktopMusicGlyph,
} from "./DesktopProjectBrowserGlyphs";
import "./DesktopProjectsView.css";
import "./DesktopProjectsViewOverrides.css";
import "./DesktopProjectGridTight.css";

type ProjectTab = "overview" | "music" | "sound-fx" | "licenses";
type ProjectFileView = "grid" | "list";
type ProjectSyncState = "success" | "syncing" | "error";

type DragGhost = {
  name: string;
  type: "file" | "folder";
  x: number;
  y: number;
};

type DesktopProjectsViewProps = {
  activeProjectId: string | null;
  projects: Project[];
  projectsLoading: boolean;
  syncFolder: string | null;
  syncStatus: string;
  onActiveProjectIdChange: (projectId: string | null) => void;
};

const TABS: Array<{ label: string; value: ProjectTab }> = [
  { label: "All Files", value: "overview" },
  { label: "Music", value: "music" },
  { label: "Sound FX", value: "sound-fx" },
  { label: "Licenses", value: "licenses" },
];

const ERROR_SYNC_PATTERNS = ["failed", "error", "could not"];
const SYNCING_PATTERNS = ["syncing", "refreshing", "checking", "applying", "updating"];

function GridViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ListViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8 12H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8 18H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4.5 6H4.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4.5 12H4.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4.5 18H4.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function formatFileCount(count: number) {
  return `${count} ${count === 1 ? "file" : "files"}`;
}

function getProjectSyncState(syncStatus: string): ProjectSyncState {
  const normalizedStatus = syncStatus.toLowerCase();

  if (ERROR_SYNC_PATTERNS.some((pattern) => normalizedStatus.includes(pattern))) {
    return "error";
  }

  if (SYNCING_PATTERNS.some((pattern) => normalizedStatus.includes(pattern))) {
    return "syncing";
  }

  return "success";
}

function getLatestProjectFileDate(project: Project) {
  const timestamps = project.files
    .map((node) => node.updatedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}

function formatSyncTime(project: Project, syncState: ProjectSyncState) {
  if (syncState === "syncing") return "Syncing now";
  if (syncState === "error") return "Sync error";

  const latestFileDate = getLatestProjectFileDate(project);

  if (!latestFileDate) return "Last synced status ready";

  return `Last synced at ${latestFileDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getNodeDepth(node: ProjectFileNode) {
  return node.path.split("/").filter(Boolean).length;
}

function getNodeParentPath(node: ProjectFileNode) {
  const parts = node.path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function getNodeChildren(project: Project, folder: ProjectFileNode | null) {
  const folderPath = folder?.path ?? "";
  const expectedDepth = folder ? getNodeDepth(folder) + 1 : 1;

  return project.files
    .filter((node) => {
      if (node.id === folder?.id) return false;
      const parentPath = getNodeParentPath(node);
      return parentPath === folderPath && getNodeDepth(node) === expectedDepth;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}

function getFolderFileCount(project: Project, folder: ProjectFileNode) {
  const prefix = `${folder.path}/`;
  return project.files.filter(
    (node) => node.type === "file" && node.path.startsWith(prefix),
  ).length;
}

function getFolderChain(project: Project, activeFolder: ProjectFileNode | null) {
  if (!activeFolder) return [];

  const chain: ProjectFileNode[] = [];
  const pathParts = activeFolder.path.split("/").filter(Boolean);

  pathParts.forEach((_, index) => {
    const path = pathParts.slice(0, index + 1).join("/");
    const folder = project.files.find(
      (node) => node.type === "folder" && node.path === path,
    );
    if (folder) chain.push(folder);
  });

  return chain;
}

function getFileArtist(node: ProjectFileNode) {
  return node.path.includes("/") ? getNodeParentPath(node).split("/").pop() : "Filmwave";
}

async function startNativeProjectNodeDrag({
  node,
  project,
  syncFolder,
  onGhostStart,
  onGhostEnd,
  pointerX,
  pointerY,
}: {
  node: ProjectFileNode;
  project: Project;
  syncFolder: string | null;
  onGhostStart: (ghost: DragGhost) => void;
  onGhostEnd: () => void;
  pointerX: number;
  pointerY: number;
}) {
  if (!syncFolder) {
    console.warn("Choose a sync folder before dragging project files.");
    return;
  }

  const localPath = getProjectNodeLocalPath({ node, project, syncFolder });

  if (!(await exists(localPath))) {
    console.warn(`Synced path does not exist yet: ${localPath}`);
    return;
  }

  onGhostStart({ name: node.name, type: node.type, x: pointerX, y: pointerY });

  try {
    await invoke("start_native_file_drag", { path: localPath });
  } finally {
    onGhostEnd();
  }
}

// Drag ghost rendered into document.body so it floats above everything,
// including the Tauri title bar and any z-index stacking contexts.
function DragGhostOverlay({ ghost }: { ghost: DragGhost }) {
  const isFolder = ghost.type === "folder";
  const displayName = isFolder
    ? ghost.name
    : ghost.name.replace(/\.[^/.]+$/, "");

  const style: React.CSSProperties = {
    position: "fixed",
    left: ghost.x + 12,
    top: ghost.y - 16,
    pointerEvents: "none",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px 6px 8px",
    borderRadius: 8,
    background: "rgba(30, 30, 34, 0.88)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    maxWidth: 260,
    userSelect: "none",
    opacity: 0.96,
  };

  const iconStyle: React.CSSProperties = {
    flexShrink: 0,
    width: 18,
    height: 18,
    opacity: 0.85,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const nameStyle: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return createPortal(
    <div style={style}>
      <span style={iconStyle}>
        {isFolder ? <DesktopFolderGlyph small /> : <DesktopMusicGlyph small />}
      </span>
      <span style={nameStyle}>{displayName}</span>
    </div>,
    document.body,
  );
}

function ProjectSyncStatus({
  project,
  syncStatus,
}: {
  project: Project;
  syncStatus: string;
}) {
  const syncState = getProjectSyncState(syncStatus);

  return (
    <span className={`project-sync-status is-${syncState}`}>
      <span>{formatSyncTime(project, syncState)}</span>
      <span className="project-sync-status-dot" />
    </span>
  );
}

function ProjectListView({
  projects,
  projectsLoading,
  onOpenProject,
}: {
  projects: Project[];
  projectsLoading: boolean;
  onOpenProject: (projectId: string) => void;
}) {
  return (
    <section className="desktop-projects-page desktop-projects-list-page">
      <div className="desktop-projects-list-header">
        <div>
          <div className="desktop-projects-list-eyebrow">Desktop companion</div>
          <h1 className="desktop-projects-list-title">Projects</h1>
          <p className="desktop-projects-list-copy">
            Select a project to browse its synced file structure.
          </p>
        </div>
      </div>

      <div className="desktop-project-list-shell">
        {projectsLoading ? (
          <div className="desktop-project-list-button" role="status">
            <div>
              <div className="desktop-project-list-name">Loading projects...</div>
              <div className="desktop-project-list-meta">Fetching your Filmwave project list.</div>
            </div>
          </div>
        ) : projects.length > 0 ? (
          projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="desktop-project-list-button"
              onClick={() => onOpenProject(project.id)}
            >
              <div>
                <div className="desktop-project-list-name">{project.name}</div>
                <div className="desktop-project-list-meta">
                  {project.fileCount} files · {project.sizeLabel}
                </div>
              </div>
              <span className="desktop-project-list-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))
        ) : (
          <div className="desktop-project-list-button" role="status">
            <div>
              <div className="desktop-project-list-name">No projects loaded</div>
              <div className="desktop-project-list-meta">
                Connect your Filmwave account in Desktop Sync settings.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectGridItem({
  node,
  project,
  syncFolder,
  onOpenFolder,
  onGhostStart,
  onGhostEnd,
}: {
  node: ProjectFileNode;
  project: Project;
  syncFolder: string | null;
  onOpenFolder: (folder: ProjectFileNode) => void;
  onGhostStart: (ghost: DragGhost) => void;
  onGhostEnd: () => void;
}) {
  if (node.type === "folder") {
    return (
      <div
        role="button"
        tabIndex={0}
        className="project-folder-card"
        title={syncFolder ? "Drag synced folder" : "Choose a sync folder before dragging"}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          void startNativeProjectNodeDrag({
            node, project, syncFolder,
            onGhostStart, onGhostEnd,
            pointerX: event.clientX,
            pointerY: event.clientY,
          });
        }}
        onClick={() => onOpenFolder(node)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpenFolder(node);
        }}
      >
        <span className="project-folder-card-icon-wrap">
          <DesktopFolderGlyph />
        </span>
        <span className="project-folder-card-name">{node.name}</span>
        <span className="project-folder-card-meta">
          {formatFileCount(getFolderFileCount(project, node))}
        </span>
      </div>
    );
  }

  return (
    <div
      className="project-file-card"
      title={syncFolder ? "Drag synced file" : "Choose a sync folder before dragging"}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        void startNativeProjectNodeDrag({
          node, project, syncFolder,
          onGhostStart, onGhostEnd,
          pointerX: event.clientX,
          pointerY: event.clientY,
        });
      }}
    >
      <div className="project-file-card-icon-wrap">
        <DesktopMusicGlyph />
      </div>
      <div className="project-file-card-title">{node.name.replace(/\.[^/.]+$/, "")}</div>
      <div className="project-file-card-meta">{getFileArtist(node)}</div>
    </div>
  );
}

function ProjectListItem({
  node,
  project,
  syncFolder,
  onOpenFolder,
  onGhostStart,
  onGhostEnd,
}: {
  node: ProjectFileNode;
  project: Project;
  syncFolder: string | null;
  onOpenFolder: (folder: ProjectFileNode) => void;
  onGhostStart: (ghost: DragGhost) => void;
  onGhostEnd: () => void;
}) {
  if (node.type === "folder") {
    const totalItems = getNodeChildren(project, node).length;

    return (
      <div
        role="button"
        tabIndex={0}
        className="project-browser-row project-folder-row"
        title={syncFolder ? "Drag synced folder" : "Choose a sync folder before dragging"}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          void startNativeProjectNodeDrag({
            node, project, syncFolder,
            onGhostStart, onGhostEnd,
            pointerX: event.clientX,
            pointerY: event.clientY,
          });
        }}
        onClick={() => onOpenFolder(node)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpenFolder(node);
        }}
      >
        <span className="project-browser-row-name">
          <DesktopFolderGlyph small />
          <span className="project-browser-row-title">{node.name}</span>
        </span>
        <span className="project-browser-row-muted">{totalItems || "--"}</span>
        <span className="project-browser-row-muted">Folder</span>
        <span />
      </div>
    );
  }

  return (
    <div
      className="project-browser-row project-file-row"
      title={syncFolder ? "Drag synced file" : "Choose a sync folder before dragging"}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        void startNativeProjectNodeDrag({
          node, project, syncFolder,
          onGhostStart, onGhostEnd,
          pointerX: event.clientX,
          pointerY: event.clientY,
        });
      }}
    >
      <span className="project-browser-row-name">
        <span className="project-file-list-icon-wrap">
          <DesktopMusicGlyph small />
        </span>
        <span className="project-browser-row-title">{node.name.replace(/\.[^/.]+$/, "")}</span>
      </span>
      <span className="project-browser-row-muted">{getFileArtist(node)}</span>
      <span className="project-browser-row-muted">Music</span>
      <span />
    </div>
  );
}

function ProjectDetailView({
  project,
  syncFolder,
  syncStatus,
  onBack,
}: {
  project: Project;
  syncFolder: string | null;
  syncStatus: string;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [activeFolder, setActiveFolder] = useState<ProjectFileNode | null>(null);
  const [viewMode, setViewMode] = useState<ProjectFileView>("grid");
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);

  const visibleNodes = useMemo(() => {
    if (activeTab !== "overview") return [];
    return getNodeChildren(project, activeFolder);
  }, [activeFolder, activeTab, project]);

  const breadcrumbFolders = useMemo(
    () => getFolderChain(project, activeFolder),
    [activeFolder, project],
  );

  function changeTab(nextTab: ProjectTab) {
    setActiveTab(nextTab);
    setActiveFolder(null);
  }

  return (
    <section className="desktop-projects-page is-detail project-detail-page">
      {dragGhost && <DragGhostOverlay ghost={dragGhost} />}

      <div className="project-tabs-row">
        <button type="button" onClick={onBack} aria-label="Back to projects">
          Projects
        </button>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={activeTab === tab.value ? "is-active" : ""}
            onClick={() => changeTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="project-detail-hero">
        <span className="project-detail-kicker">Project</span>
        <h1 className="project-detail-title">{project.name}</h1>
        <div className="project-detail-meta">
          <span>Project workspace</span>
          <span>·</span>
          <span>{project.fileCount} files</span>
          <span>·</span>
          <ProjectSyncStatus project={project} syncStatus={syncStatus} />
        </div>
      </section>

      <section className="project-file-browser">
        <div className="project-file-browser-top">
          <div className="project-breadcrumbs project-path">
            <button
              type="button"
              className={!activeFolder ? "is-current" : ""}
              onClick={() => setActiveFolder(null)}
            >
              All Files
            </button>
            {breadcrumbFolders.map((folder) => (
              <span key={folder.id}>
                <span className="project-path-separator">/</span>
                <button
                  type="button"
                  className={activeFolder?.id === folder.id ? "is-current" : ""}
                  onClick={() => setActiveFolder(folder)}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>

          <div className="project-file-browser-actions">
            <button
              type="button"
              className={`project-toolbar-button ${viewMode === "grid" ? "is-active" : ""}`}
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
            >
              <GridViewIcon />
            </button>
            <button
              type="button"
              className={`project-toolbar-button ${viewMode === "list" ? "is-active" : ""}`}
              aria-label="List view"
              onClick={() => setViewMode("list")}
            >
              <ListViewIcon />
            </button>
          </div>
        </div>

        <div className="project-file-browser-section">
          {activeTab !== "overview" ? (
            <div className="project-empty-state">This tab will mirror website media types next.</div>
          ) : visibleNodes.length > 0 ? (
            viewMode === "grid" ? (
              <div className="project-browser-grid">
                {visibleNodes.map((node) => (
                  <ProjectGridItem
                    key={node.id}
                    node={node}
                    project={project}
                    syncFolder={syncFolder}
                    onOpenFolder={setActiveFolder}
                    onGhostStart={setDragGhost}
                    onGhostEnd={() => setDragGhost(null)}
                  />
                ))}
              </div>
            ) : (
              <div className="project-browser-list">
                {visibleNodes.map((node) => (
                  <ProjectListItem
                    key={node.id}
                    node={node}
                    project={project}
                    syncFolder={syncFolder}
                    onOpenFolder={setActiveFolder}
                    onGhostStart={setDragGhost}
                    onGhostEnd={() => setDragGhost(null)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="project-empty-state">This folder is empty.</div>
          )}
        </div>
      </section>
    </section>
  );
}

export default function DesktopProjectsView({
  activeProjectId,
  projects,
  projectsLoading,
  syncFolder,
  syncStatus,
  onActiveProjectIdChange,
}: DesktopProjectsViewProps) {
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null;

  if (activeProject) {
    return (
      <ProjectDetailView
        project={activeProject}
        syncFolder={syncFolder}
        syncStatus={syncStatus}
        onBack={() => onActiveProjectIdChange(null)}
      />
    );
  }

  return (
    <ProjectListView
      projects={projects}
      projectsLoading={projectsLoading}
      onOpenProject={onActiveProjectIdChange}
    />
  );
}
