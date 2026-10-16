"use client";

import { HeaderSearchBar } from "@filmwave/shared";
import CreateProjectModal from "@/components/CreateProjectModal";
import DropdownShell from "@/components/DropdownShell";
import MoreIcon from "@/components/icons/MoreIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import ListRowStatusCount from "@/components/ListRowStatusCount";
import { FolderGlyph } from "@/components/project-browser/ProjectBrowserGlyphs";
import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import type { Project } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProjectSortMode = "newest" | "oldest" | "alphabetical";
type ProjectStatusMode = "active" | "all" | "archived";
type ProjectWithFileCount = Project & { file_count?: number };

const PROJECT_STATUS_OPTIONS: Array<{
  value: ProjectStatusMode;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "all", label: "All Projects" },
  { value: "archived", label: "Archived" },
];

function getProjectTimestamp(project: Project) {
  const time = new Date(project.created_at).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getProjectFileCount(project: Project) {
  const count = Number((project as ProjectWithFileCount).file_count ?? 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function formatFileCount(count: number) {
  return `${count} file${count === 1 ? "" : "s"}`;
}

function sortProjects(projects: Project[], sortMode: ProjectSortMode) {
  const indexed = projects.map((project, index) => ({ project, index }));

  return indexed
    .sort((a, b) => {
      if (sortMode === "alphabetical") {
        return (
          a.project.name.localeCompare(b.project.name, undefined, {
            sensitivity: "base",
          }) || a.index - b.index
        );
      }

      const aTime = getProjectTimestamp(a.project);
      const bTime = getProjectTimestamp(b.project);

      if (sortMode === "oldest") return aTime - bTime || a.index - b.index;

      return bTime - aTime || a.index - b.index;
    })
    .map(({ project }) => project);
}

function SortLabel({ sortMode }: { sortMode: ProjectSortMode }) {
  if (sortMode === "alphabetical") return <>Alphabetical</>;
  if (sortMode === "oldest") return <>Oldest first</>;
  return <>Newest first</>;
}

function StatusLabel({ statusMode }: { statusMode: ProjectStatusMode }) {
  return (
    PROJECT_STATUS_OPTIONS.find((option) => option.value === statusMode)?.label ||
    "Active"
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle
        cx="11"
        cy="11"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="m16 16 4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.5 6.25 8 9.75l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 9V19H19V9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 5H20V9H4V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 13H14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

type ProjectRowProps = {
  project: Project;
  isRenaming: boolean;
  renameName: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onRenameNameChange: (name: string) => void;
  onStartRename: (project: Project) => void;
  onCancelRename: () => void;
  onSaveRename: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onToggleArchive: (project: Project) => void;
};

function ProjectCard({
  project,
  isRenaming,
  renameName,
  menuOpen,
  onMenuOpenChange,
  onRenameNameChange,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onDeleteProject,
  onToggleArchive,
}: ProjectRowProps) {
  const fileCount = formatFileCount(getProjectFileCount(project));

  return (
    <article className={`project-grid-card${isRenaming ? " is-renaming" : ""}`}>
      {isRenaming ? (
        <div className="project-grid-card-link project-grid-card-link-static">
          <div className="project-grid-card-icon" aria-hidden="true">
            <FolderGlyph />
          </div>
          <div className="project-grid-card-copy">
            <div className="project-grid-card-rename">
              <input
                className="project-grid-card-rename-input"
                type="text"
                value={renameName}
                autoFocus
                aria-label={`Rename ${project.name}`}
                onFocus={(event) => event.currentTarget.select()}
                onBlur={(event) => {
                  if (event.currentTarget.dataset.cancelRename === "true") {
                    delete event.currentTarget.dataset.cancelRename;
                    onCancelRename();
                    return;
                  }

                  onSaveRename(project);
                }}
                onChange={(event) => onRenameNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.currentTarget.dataset.cancelRename = "true";
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
            <span className="project-grid-card-meta">{fileCount}</span>
          </div>
        </div>
      ) : (
        <Link href={`/projects/${project.id}`} className="project-grid-card-link">
          <div className="project-grid-card-icon" aria-hidden="true">
            <FolderGlyph />
          </div>
          <div className="project-grid-card-copy">
            <span className="project-grid-card-title">{project.name}</span>
            <span className="project-grid-card-meta">{fileCount}</span>
          </div>
        </Link>
      )}

      {project.is_archived ? (
        <span className="project-grid-card-status" aria-label="Archived project">
          <ArchiveIcon />
        </span>
      ) : null}

      <div className="project-grid-card-actions">
        <DropdownShell
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          placement="bottom-end"
          offsetAmount={8}
          collisionPadding={{
            top: 72,
            right: 16,
            bottom: 88,
            left: 16,
          }}
          trigger={({ open }) => (
            <button
              type="button"
              className={`project-toolbar-icon-button ${open ? "is-active" : ""}`}
              aria-label={`More actions for ${project.name}`}
              aria-expanded={open}
              title="More"
            >
              <MoreIcon />
            </button>
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onMenuOpenChange(false);
              onStartRename(project);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onMenuOpenChange(false);
              onToggleArchive(project);
            }}
          >
            {project.is_archived ? "Restore project" : "Archive project"}
          </button>
          <button
            type="button"
            className="danger-hover"
            role="menuitem"
            onClick={() => {
              onMenuOpenChange(false);
              onDeleteProject(project);
            }}
          >
            Delete project
          </button>
        </DropdownShell>
      </div>
    </article>
  );
}

function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="project-grid-create-card" onClick={onClick}>
      <span className="project-grid-create-icon" aria-hidden="true">
        <PlusIcon size={20} />
      </span>
      <span className="project-grid-create-copy">
        <strong>New Project</strong>
        <span>Create a workspace</span>
      </span>
    </button>
  );
}

function ProjectSkeletonList() {
  return (
    <section className="projects-grid" aria-label="Loading projects">
      <div className="project-grid-create-card project-grid-card-skeleton">
        <div className="projects-skeleton-block project-grid-skeleton-icon" />
        <div className="project-grid-create-copy">
          <div className="projects-skeleton-block project-grid-skeleton-title" />
          <div className="projects-skeleton-block project-grid-skeleton-meta" />
        </div>
      </div>
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="project-grid-card project-grid-card-skeleton">
          <div className="projects-skeleton-block project-grid-skeleton-folder" />
          <div className="project-grid-card-copy">
            <div className="projects-skeleton-block project-grid-skeleton-title" />
            <div className="projects-skeleton-block project-grid-skeleton-meta" />
          </div>
        </div>
      ))}
    </section>
  );
}

export default function ProjectsPage() {
  const { currentSong } = usePlayer();
  const { projects, setProjects, loading, error, refetchProjects } =
    useProjectsContext();
  const [query, setQuery] = useState("");
  const [projectStatusMode, setProjectStatusMode] =
    useState<ProjectStatusMode>("active");
  const [statusOpen, setStatusOpen] = useState(false);
  const [sortMode, setSortMode] = useState<ProjectSortMode>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [openProjectMenuId, setOpenProjectMenuId] = useState<number | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");
  const [savingProjectId, setSavingProjectId] = useState<number | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
  const [archivingProjectId, setArchivingProjectId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const playerVisible = Boolean(currentSong);
  const cleanQuery = query.trim().toLowerCase();

  const displayedProjects = useMemo(() => {
    const statusFiltered = projects.filter((project) => {
      if (projectStatusMode === "all") return true;
      if (projectStatusMode === "archived") return project.is_archived;
      return !project.is_archived;
    });

    const queryFiltered = cleanQuery
      ? statusFiltered.filter((project) =>
          project.name.toLowerCase().includes(cleanQuery),
        )
      : statusFiltered;

    return sortProjects(queryFiltered, sortMode);
  }, [projects, cleanQuery, projectStatusMode, sortMode]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function startRename(project: Project) {
    setOpenProjectMenuId(null);
    setRenamingProjectId(project.id);
    setRenameName(project.name);
  }

  function cancelRename() {
    setRenamingProjectId(null);
    setRenameName("");
  }

  async function handleSaveRename(project: Project) {
    if (savingProjectId || renamingProjectId !== project.id) return;

    const cleanName = renameName.trim();

    if (!cleanName) {
      cancelRename();
      return;
    }

    if (cleanName === project.name) {
      cancelRename();
      return;
    }

    setSavingProjectId(project.id);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || "Failed to rename project");

      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? {
                ...item,
                ...(data || {}),
                name: data?.name || cleanName,
              }
            : item,
        ),
      );
      cancelRename();
      showToast("Project renamed");
    } catch (err) {
      console.error("Failed to rename project", err);
      showToast("Couldn't rename project");
    } finally {
      setSavingProjectId(null);
    }
  }

  async function handleToggleArchive(project: Project) {
    if (archivingProjectId) return;

    const nextArchived = !project.is_archived;
    setArchivingProjectId(project.id);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: nextArchived }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update project archive state");
      }

      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? { ...item, ...(data || {}), is_archived: nextArchived }
            : item,
        ),
      );
      showToast(nextArchived ? "Project archived" : "Project restored");
    } catch (err) {
      console.error("Failed to update project archive state", err);
      showToast(nextArchived ? "Couldn't archive project" : "Couldn't restore project");
    } finally {
      setArchivingProjectId(null);
    }
  }

  async function handleDeleteProject(project: Project) {
    if (deletingProjectId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingProjectId(project.id);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete project");

      setProjects((current) =>
        current.filter((item) => item.id !== project.id),
      );

      if (renamingProjectId === project.id) cancelRename();
      showToast("Project deleted");
    } catch (err) {
      console.error("Failed to delete project", err);
      showToast("Couldn't delete project");
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <>
      <style>{`
        .projects-page { position: relative; margin-left: 0; margin-top: 56px; min-height: calc(100vh - 56px); overflow-x: hidden; overflow-y: visible; background: var(--bg-primary); color: var(--text-primary); }
        .projects-shell { position: relative; z-index: 1; display: flex; min-height: calc(100vh - 56px); flex-direction: column; padding: 22px 32px 0 32px; }
        .projects-control-bar {
          --fw-header-search-row-height: 51px;
          --projects-control-gutter: clamp(28px, 5.2vw, 82px);
          box-sizing: border-box !important;
          display: grid !important;
          width: auto !important;
          min-height: 51px !important;
          margin-right: calc(var(--projects-control-gutter) - 32px) !important;
          margin-left: calc(var(--projects-control-gutter) - 32px) !important;
          grid-template-columns: max-content minmax(320px, 1fr) max-content !important;
          align-items: center !important;
          gap: 18px !important;
        }
        .projects-status-pill {
          display: inline-flex !important;
          width: auto !important;
          min-width: 126px !important;
          height: 51px !important;
          min-height: 51px !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 6px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          color: var(--text-primary) !important;
          cursor: pointer !important;
          font-family: var(--font-aktiv-grotesk) !important;
          font-size: 14px !important;
          font-weight: 400 !important;
          letter-spacing: normal !important;
          line-height: 1 !important;
        }
        .projects-status-pill:hover,
        .projects-status-pill.is-open {
          background: transparent !important;
          color: var(--text-primary) !important;
        }
        .projects-status-pill > svg {
          display: block !important;
          width: 14px !important;
          height: 14px !important;
          flex: 0 0 14px !important;
          margin-left: 0 !important;
        }
        .projects-status-dropdown { min-width: 150px; }
        .projects-status-dropdown button.is-active {
          background: transparent !important;
          color: var(--filmwave-menu-text) !important;
        }
        .projects-status-dropdown button.is-active:hover {
          background: var(--filmwave-menu-hover) !important;
        }
        .projects-status-selected-check,
        .projects-sort-selected-check {
          width: 14px;
          height: 14px;
          flex: 0 0 14px;
          margin-left: auto;
        }
        .projects-control-bar > .fw-toolbar-header-search-row {
          height: 51px !important;
          min-height: 51px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: var(--filmwave-neutral-surface) !important;
          background-color: var(--filmwave-neutral-surface) !important;
          padding: 0 16px !important;
        }
        :where(html.light, html[data-theme="light"])
          .projects-control-bar
          > .fw-toolbar-header-search-row {
          --fw-header-search-muted-color: #a3a3a3;
          background: #f3f3f3 !important;
          background-color: #f3f3f3 !important;
        }
        :where(html.dark, html[data-theme="dark"])
          .projects-control-bar
          > .fw-toolbar-header-search-row {
          --fw-header-search-muted-color: #5a5a5a;
        }
        .projects-control-bar .fw-toolbar-search-static {
          gap: 12px !important;
        }
        .projects-control-bar .fw-toolbar-search-static-icon,
        .projects-control-bar .fw-toolbar-search-static-icon svg {
          width: 22px !important;
          height: 22px !important;
          flex-basis: 22px !important;
        }
        .projects-control-bar .fw-toolbar-search-static-input {
          color: var(--text-primary) !important;
          font-family: inherit !important;
          font-size: 15px !important;
          font-style: normal !important;
          font-weight: 300 !important;
          letter-spacing: 0 !important;
          line-height: normal !important;
        }
        .projects-control-bar .fw-toolbar-search-static-input::placeholder {
          font-family: inherit !important;
          font-size: 16px !important;
          font-style: normal !important;
          font-weight: 300 !important;
          letter-spacing: 0 !important;
          line-height: normal !important;
          opacity: 1 !important;
        }
        :where(html.light, html[data-theme="light"])
          .projects-control-bar
          .fw-toolbar-search-static-input::placeholder {
          color: #a3a3a3 !important;
        }
        :where(html.dark, html[data-theme="dark"])
          .projects-control-bar
          .fw-toolbar-search-static-input::placeholder {
          color: #5a5a5a !important;
        }
        .projects-control-right {
          display: flex !important;
          justify-content: flex-end !important;
          align-items: center !important;
          gap: 4px !important;
        }
        .projects-sort-button,
        .projects-new-button {
          box-sizing: border-box !important;
          height: 51px !important;
          min-height: 51px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          border-radius: 0 !important;
          color: var(--text-primary) !important;
          cursor: pointer !important;
          font-family: var(--font-aktiv-grotesk) !important;
          font-size: 14px !important;
          font-weight: 400 !important;
          letter-spacing: normal !important;
          line-height: 1 !important;
          transition: background 0.15s ease, color 0.15s ease !important;
        }
        .projects-sort-button {
          gap: 6px !important;
          background: transparent !important;
          padding: 0 12px !important;
        }
        .projects-sort-button:hover,
        .projects-sort-button.is-open {
          background: transparent !important;
          color: var(--text-primary) !important;
        }
        .projects-sort-dropdown { min-width: 154px; }
        .projects-sort-dropdown button.is-active {
          background: transparent !important;
          color: var(--filmwave-menu-text) !important;
        }
        .projects-sort-dropdown button.is-active:hover {
          background: var(--filmwave-menu-hover) !important;
        }
        .projects-new-button {
          gap: 8px !important;
          background: transparent !important;
          padding: 0 22px 0 18px !important;
          color: var(--text-primary) !important;
        }
        .projects-new-button:hover {
          background: var(--bg-hover) !important;
          color: var(--text-primary) !important;
        }
        :where(html.light, html[data-theme="light"]) .projects-new-button:hover {
          background: var(--text-primary) !important;
          color: var(--bg-primary) !important;
        }
        .projects-new-button-icon {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .projects-title {
          margin-top: 36px;
          margin-right: calc(var(--projects-control-gutter, clamp(28px, 5.2vw, 82px)) - 32px);
          margin-bottom: 20px;
          margin-left: calc(var(--projects-control-gutter, clamp(28px, 5.2vw, 82px)) - 32px);
          max-width: 640px;
          color: var(--text-primary);
          font-family: var(--filmwave-section-title-font-family);
          font-size: var(--filmwave-section-title-font-size);
          font-weight: var(--filmwave-section-title-font-weight);
          letter-spacing: var(--filmwave-section-title-letter-spacing);
          line-height: var(--filmwave-section-title-line-height);
          text-transform: none;
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          margin-top: 28px;
          margin-right: calc(var(--projects-control-gutter, clamp(28px, 5.2vw, 82px)) - 32px);
          margin-left: calc(var(--projects-control-gutter, clamp(28px, 5.2vw, 82px)) - 32px);
        }
        .project-grid-card,
        .project-grid-create-card {
          position: relative;
          box-sizing: border-box;
          min-width: 0;
          min-height: 184px;
          border: 0;
          border-radius: 0;
          background: #e5e5dd;
          color: var(--text-primary);
          text-align: left;
          transition: background 0.15s ease;
        }
        .project-grid-card:hover,
        .project-grid-create-card:hover {
          background: var(--bg-hover);
        }
        .project-grid-card-link,
        .project-grid-create-card {
          display: flex;
          width: 100%;
          min-height: 184px;
          flex-direction: column;
          align-items: flex-start;
          justify-content: space-between;
          padding: 22px;
          color: inherit;
          text-decoration: none;
        }
        .project-grid-card-link-static {
          cursor: default;
        }
        .project-grid-card-icon {
          display: flex;
          width: 74px;
          height: 64px;
          align-items: center;
          justify-content: flex-start;
          color: var(--text-primary);
        }
        .project-grid-card-icon > svg {
          width: 74px;
          height: auto;
        }
        .project-grid-card-copy,
        .project-grid-create-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 3px;
        }
        .project-grid-card-title,
        .project-grid-create-copy strong {
          overflow: hidden;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .project-grid-card-meta,
        .project-grid-create-copy span {
          color: var(--text-muted);
          font-size: 11.5px;
          font-weight: 400;
          line-height: 1.4;
        }
        .project-grid-card-actions {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 3;
          display: inline-flex;
        }
        .project-grid-card-actions .project-toolbar-icon-button {
          display: inline-flex;
          width: 32px;
          min-width: 32px;
          height: 32px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0;
          color: var(--icon-color);
          cursor: pointer;
        }
        .project-grid-card-actions .project-toolbar-icon-button:hover,
        .project-grid-card-actions .project-toolbar-icon-button.is-active {
          background: var(--icon-button-hover);
          color: var(--text-primary);
        }
        .project-grid-card-status {
          position: absolute;
          right: 21px;
          bottom: 18px;
          display: inline-flex;
          width: 14px;
          height: 14px;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .project-grid-card-rename {
          min-width: 0;
        }
        .project-grid-card-rename-input {
          box-sizing: border-box;
          width: 100%;
          height: 24px;
          border: 0;
          border-radius: 0;
          outline: 0;
          background: transparent;
          padding: 0;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.25;
        }
        .project-grid-create-card {
          cursor: pointer;
          font-family: inherit;
        }
        .project-grid-create-icon {
          display: inline-flex;
          width: 54px;
          height: 54px;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--text-primary) 8%, transparent);
          color: var(--text-primary);
        }
        .project-grid-card-skeleton {
          pointer-events: none;
        }
        .project-grid-skeleton-folder {
          width: 74px;
          height: 58px;
        }
        .project-grid-skeleton-icon {
          width: 54px;
          height: 54px;
        }
        .project-grid-skeleton-title {
          width: 120px;
          height: 10px;
        }
        .project-grid-skeleton-meta {
          width: 58px;
          height: 8px;
        }
        @media (max-width: 760px) {
          .projects-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
        }
        @media (max-width: 520px) {
          .projects-grid {
            grid-template-columns: 1fr;
          }
        }
        .projects-empty-space { flex: 1 1 auto; display: flex; min-height: 340px; align-items: center; justify-content: center; }
        .projects-list { display: flex; flex: 0 0 auto; flex-direction: column; margin-top: 12px; border-top: 1px solid var(--border-subtle); }
        .projects-row { display: grid; min-height: 72px; grid-template-columns: minmax(0, 1fr) 12px minmax(84px, 120px) 32px; column-gap: 14px; align-items: center; border-bottom: 1px solid var(--border-subtle); background: transparent; color: inherit; padding: 0 18px; transition: background 0.15s ease, color 0.15s ease; }
        .projects-row:hover { background: var(--bg-hover); }
        .projects-row-link { display: grid; min-width: 0; min-height: 72px; grid-template-columns: 62px minmax(180px, 1fr); align-items: center; color: inherit; text-decoration: none; }
        .projects-row-link-static { cursor: default; }
        .projects-row-icon { display: flex; width: 42px; height: 42px; align-items: center; justify-content: center; overflow: visible; border: 0; border-radius: 0; background: transparent; color: var(--text-primary); }
        .projects-row-icon-inner { display: block; transform: translateY(-2px) scale(0.58); transform-origin: center; }
        .projects-row-main { min-width: 0; display: flex; flex-direction: column; gap: 0; }
        .projects-row-main > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13.5px; font-weight: 500; line-height: 1.35; color: var(--text-primary); }
        .projects-row-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 2px 0 0; font-size: 11.5px; line-height: 1.35; color: var(--text-subtle); }
        .projects-row-rename { display: flex; min-width: 0; align-items: center; }
        .projects-row-rename-input { box-sizing: border-box; width: min(360px, 100%); min-width: 0; height: 32px; border: 1px solid var(--border); border-radius: 0; background: var(--bg-primary); padding: 0 10px; color: var(--text-primary); font-family: inherit; font-size: 13.5px; font-weight: 500; outline: none; }
        .projects-row-rename-input:focus { border-color: var(--text-primary); }
        .projects-row-archive-status { display: inline-flex; width: 12px; justify-self: end; align-items: center; justify-content: center; transform: translateX(12px); color: var(--text-muted); line-height: 0; }
        .projects-row-archive-icon { display: inline-flex; width: 12px; height: 13px; align-items: center; justify-content: center; color: inherit; line-height: 0; }
        .projects-row-count { justify-self: start; width: 64px; text-align: left; font-size: 11.5px; font-weight: 400; line-height: 1.35; color: var(--text-subtle); }
        .projects-row-actions { display: inline-flex; justify-self: end; align-items: center; gap: 8px; }
        .projects-row-actions > .project-toolbar-icon-button { flex: 0 0 auto; }
        .projects-empty, .projects-error { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; color: var(--text-secondary); }
        .projects-empty h2, .projects-error h2 { font-size: 18px; font-weight: 700; color: var(--text-primary); }
        .projects-empty p, .projects-error p { max-width: 360px; font-size: 13px; line-height: 1.5; color: var(--text-muted); }
        .projects-retry-button { height: 36px; border: 1px solid var(--text-primary); border-radius: 0; background: var(--text-primary); padding: 0 14px; color: var(--bg-primary); cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 500; }
        .projects-skeleton-block { position: relative; overflow: hidden; background: var(--bg-tertiary); }
        .projects-skeleton-block::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--bg-hover) 72%, transparent), transparent); animation: projects-skeleton-shimmer 1.6s ease-in-out infinite; }
        @keyframes projects-skeleton-shimmer { 100% { transform: translateX(100%); } }
        .projects-row-skeleton { grid-template-columns: 42px minmax(0, 1fr) 12px minmax(84px, 120px) 32px; column-gap: 14px; cursor: default; pointer-events: none; }
        .projects-skeleton-icon { width: 42px; height: 42px; }
        .projects-skeleton-copy { display: flex; min-width: 0; flex-direction: column; gap: 9px; }
        .projects-skeleton-title { width: min(220px, 52%); height: 9px; }
        .projects-skeleton-line { width: min(360px, 78%); height: 8px; }
        .projects-skeleton-count { justify-self: end; width: 58px; height: 8px; }
        .projects-skeleton-button { justify-self: end; width: 32px; height: 32px; }
        @media (max-width: 940px) {
          .projects-shell { padding-left: 32px; padding-right: 32px; }
          .projects-control-bar { grid-template-columns: 126px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
          .projects-status-pill { width: 126px; min-width: 126px; }
          .projects-control-right { justify-content: flex-end; flex-wrap: nowrap; gap: 8px; }
          .projects-sort-button, .projects-new-button { width: 44px; min-width: 44px; padding: 0; }
          .projects-sort-button > span:first-child, .projects-sort-button > svg, .projects-new-button > span:last-child { display: none; }
          .projects-title { margin-top: 36px; }
          .projects-list { margin-top: 12px; }
        }
        @media (max-width: 640px) {
          .projects-shell { padding-left: 20px; padding-right: 20px; }
          .projects-row { grid-template-columns: minmax(0, 1fr) 12px minmax(70px, 96px) 32px; column-gap: 14px; padding: 0 18px; }
          .projects-row-link { min-height: 72px; grid-template-columns: 46px minmax(0, 1fr); }
          .projects-row-actions { justify-self: end; padding-left: 0; }
          .projects-row-rename { width: 100%; }
          .projects-row-skeleton { grid-template-columns: 42px minmax(0, 1fr) 12px minmax(70px, 96px) 32px; column-gap: 14px; }
        }
      `}</style>

      <main className="projects-page">
        <div className="projects-shell">
          <section className="projects-control-bar">
            <DropdownShell
              open={statusOpen}
              onOpenChange={setStatusOpen}
              placement="bottom-start"
              className="projects-status-dropdown"
              offsetAmount={6}
              flippedOffsetAmount={6}
              collisionPadding={{
                top: 112,
                right: 16,
                bottom: playerVisible ? 96 : 24,
                left: 16,
              }}
              trigger={({ open }) => (
                <button
                  type="button"
                  className={`projects-status-pill${open ? " is-open" : ""}`}
                  aria-label="Project status filter"
                >
                  <span>
                    <StatusLabel statusMode={projectStatusMode} />
                  </span>
                  <ChevronIcon />
                </button>
              )}
            >
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={projectStatusMode === option.value ? "is-active" : ""}
                  aria-checked={projectStatusMode === option.value}
                  onClick={() => {
                    setProjectStatusMode(option.value);
                    setStatusOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {projectStatusMode === option.value ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      focusable="false"
                      className="projects-status-selected-check"
                    >
                      <path
                        d="m3.5 8.2 2.8 2.8 6.2-6.2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  ) : null}
                </button>
              ))}
            </DropdownShell>

            <HeaderSearchBar
              variant="control"
              renderForm={false}
              searchIcon={<SearchIcon />}
              searchValue={query}
              searchPlaceholder="Search projects"
              searchAriaLabel="Search projects"
              clearAriaLabel="Clear project search"
              onSearchChange={setQuery}
            />

            <div className="projects-control-right">
              <DropdownShell
                open={sortOpen}
                onOpenChange={setSortOpen}
                placement="bottom-end"
                className="projects-sort-dropdown"
                offsetAmount={6}
                flippedOffsetAmount={6}
                collisionPadding={{
                  top: 112,
                  right: 16,
                  bottom: playerVisible ? 96 : 24,
                  left: 16,
                }}
                trigger={({ open }) => (
                  <button
                    type="button"
                    className={`projects-sort-button${open ? " is-open" : ""}`}
                    aria-label="Sort projects"
                  >
                    <span>Sort By</span>
                    <ChevronIcon />
                    <span className="sr-only">
                      <SortLabel sortMode={sortMode} />
                    </span>
                  </button>
                )}
              >
                <button
                  type="button"
                  className={sortMode === "newest" ? "is-active" : ""}
                  aria-checked={sortMode === "newest"}
                  onClick={() => {
                    setSortMode("newest");
                    setSortOpen(false);
                  }}
                >
                  <span>Newest first</span>
                  {sortMode === "newest" ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      focusable="false"
                      className="projects-sort-selected-check"
                    >
                      <path
                        d="m3.5 8.2 2.8 2.8 6.2-6.2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={sortMode === "oldest" ? "is-active" : ""}
                  aria-checked={sortMode === "oldest"}
                  onClick={() => {
                    setSortMode("oldest");
                    setSortOpen(false);
                  }}
                >
                  <span>Oldest first</span>
                  {sortMode === "oldest" ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      focusable="false"
                      className="projects-sort-selected-check"
                    >
                      <path
                        d="m3.5 8.2 2.8 2.8 6.2-6.2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={sortMode === "alphabetical" ? "is-active" : ""}
                  aria-checked={sortMode === "alphabetical"}
                  onClick={() => {
                    setSortMode("alphabetical");
                    setSortOpen(false);
                  }}
                >
                  <span>Alphabetical</span>
                  {sortMode === "alphabetical" ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      focusable="false"
                      className="projects-sort-selected-check"
                    >
                      <path
                        d="m3.5 8.2 2.8 2.8 6.2-6.2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  ) : null}
                </button>
              </DropdownShell>

              <button
                type="button"
                className="projects-new-button"
                onClick={() => setCreateProjectOpen(true)}
              >
                <span className="projects-new-button-icon" aria-hidden="true">
                  <PlusIcon size={16} />
                </span>
                <span>New Project</span>
              </button>
            </div>
          </section>

          <h1 className="projects-title">My Projects</h1>

          {error && !loading ? (
            <div className="projects-empty-space">
              <div className="projects-error">
                <h2>Couldn&apos;t load projects</h2>
                <p>{error}</p>
                <button
                  type="button"
                  className="projects-retry-button"
                  onClick={refetchProjects}
                >
                  Try again
                </button>
              </div>
            </div>
          ) : loading ? (
            <ProjectSkeletonList />
          ) : displayedProjects.length > 0 || !cleanQuery ? (
            <section className="projects-grid" aria-label="Projects">
              {!cleanQuery ? (
                <NewProjectCard onClick={() => setCreateProjectOpen(true)} />
              ) : null}
              {displayedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isRenaming={renamingProjectId === project.id}
                  renameName={
                    renamingProjectId === project.id ? renameName : project.name
                  }
                  menuOpen={openProjectMenuId === project.id}
                  onMenuOpenChange={(open) =>
                    setOpenProjectMenuId(open ? project.id : null)
                  }
                  onRenameNameChange={setRenameName}
                  onStartRename={startRename}
                  onCancelRename={cancelRename}
                  onSaveRename={(targetProject) => {
                    void handleSaveRename(targetProject);
                  }}
                  onDeleteProject={(targetProject) => {
                    void handleDeleteProject(targetProject);
                  }}
                  onToggleArchive={(targetProject) => {
                    void handleToggleArchive(targetProject);
                  }}
                />
              ))}
            </section>
          ) : (
            <div className="projects-empty-space">
              <div className="projects-empty">
                <h2>No matching projects</h2>
                <p>Try searching for a different project name.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "88px" : "24px"}
      />

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onProjectCreated={(project) => {
          setProjects((current) => [project, ...current]);
          setCreateProjectOpen(false);
        }}
      />
    </>
  );
}
