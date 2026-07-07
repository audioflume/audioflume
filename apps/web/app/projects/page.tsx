"use client";

import CreateProjectModal from "@/components/CreateProjectModal";
import DropdownShell from "@/components/DropdownShell";
import EditProjectModal from "@/components/EditProjectModal";
import { FolderGlyph } from "@/components/project-browser/ProjectBrowserGlyphs";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import type { Project } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProjectSortMode = "newest" | "oldest" | "alphabetical";
type ProjectStatusMode = "active" | "all" | "archived";

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
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.5 3a7.5 7.5 0 1 0 4.71 13.33l4.13 4.13a1.4 1.4 0 0 0 1.98-1.98l-4.13-4.13A7.5 7.5 0 0 0 10.5 3ZM5.8 10.5a4.7 4.7 0 1 1 9.4 0 4.7 4.7 0 0 1-9.4 0Z"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.4 5.4a1.2 1.2 0 0 1 1.2-1.2h8.8a1.2 1.2 0 0 1 1.2 1.2v8.8a1.2 1.2 0 1 1-2.4 0V8.3l-9.05 9.05a1.2 1.2 0 0 1-1.7-1.7L14.5 6.6H8.6a1.2 1.2 0 0 1-1.2-1.2Z"
      />
    </svg>
  );
}

function ProjectRow({
  project,
  onEdit,
}: {
  project: Project;
  onEdit: (project: Project) => void;
}) {
  return (
    <div className="projects-row">
      <Link href={`/projects/${project.id}`} className="projects-row-link">
        <div className="projects-row-icon" aria-hidden="true">
          <span className="projects-row-icon-inner">
            <FolderGlyph />
          </span>
        </div>

        <div className="projects-row-main">
          <span>{project.name}</span>
          <small>{project.description?.trim() || "No description"}</small>
        </div>
      </Link>

      <div className="projects-row-actions">
        <button
          type="button"
          className="projects-row-edit"
          onClick={() => onEdit(project)}
        >
          Edit
        </button>

        <Link href={`/projects/${project.id}`} className="projects-row-view">
          View Project
          <ArrowIcon />
        </Link>
      </div>
    </div>
  );
}

function ProjectSkeletonList() {
  return (
    <div className="projects-list">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="projects-row projects-row-skeleton">
          <div className="projects-skeleton-block projects-skeleton-icon" />
          <div className="projects-skeleton-copy">
            <div className="projects-skeleton-block projects-skeleton-title" />
            <div className="projects-skeleton-block projects-skeleton-line" />
          </div>
          <div className="projects-skeleton-block projects-skeleton-button" />
        </div>
      ))}
    </div>
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
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);

  const playerVisible = Boolean(currentSong);
  const cleanQuery = query.trim().toLowerCase();

  const displayedProjects = useMemo(() => {
    const filtered = cleanQuery
      ? projects.filter((project) =>
          project.name.toLowerCase().includes(cleanQuery),
        )
      : projects;

    return sortProjects(filtered, sortMode);
  }, [projects, cleanQuery, sortMode]);

  function openEditProject(project: Project) {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
  }

  async function handleSaveEdit() {
    if (!editingProject || isSavingProject) return;

    const cleanName = editName.trim();
    const cleanDescription = editDescription.trim();

    if (!cleanName) return;

    setIsSavingProject(true);

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          description: cleanDescription || null,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || "Failed to save project");

      setProjects((current) =>
        current.map((project) =>
          project.id === editingProject.id
            ? data || {
                ...project,
                name: cleanName,
                description: cleanDescription || null,
              }
            : project,
        ),
      );
      setEditingProject(null);
    } catch (err) {
      console.error("Failed to save project", err);
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleDeleteProject() {
    if (!editingProject || deletingProjectId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${editingProject.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    const projectIdToDelete = editingProject.id;

    setDeletingProjectId(projectIdToDelete);

    try {
      const res = await fetch(`/api/projects/${projectIdToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete project");

      setProjects((current) =>
        current.filter((project) => project.id !== projectIdToDelete),
      );
      setEditingProject(null);
    } catch (err) {
      console.error("Failed to delete project", err);
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <>
      <style>{`
        .projects-page { position: relative; margin-left: 0; margin-top: 56px; min-height: calc(100vh - 56px); overflow-x: hidden; overflow-y: visible; background: var(--bg-primary); color: var(--text-primary); }
        .projects-shell { position: relative; z-index: 1; display: flex; min-height: calc(100vh - 56px); flex-direction: column; padding: 22px 32px 0 32px; }
        .projects-control-bar { display: grid; min-height: 54px; grid-template-columns: 160px minmax(300px, 640px) minmax(270px, auto); align-items: start; gap: 24px; }
        .projects-status-pill { display: inline-flex; width: 150px; height: 42px; align-items: center; justify-content: space-between; border: 1px solid var(--border); border-radius: 0; background: var(--bg-secondary); padding: 0 14px; color: var(--text-secondary); cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 500; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
        .projects-status-pill:hover, .projects-status-pill.is-open { background: var(--bg-hover); border-color: var(--border-hover); color: var(--text-primary); }
        .projects-status-dropdown { min-width: 150px; }
        .projects-status-dropdown button.is-active { background: var(--filmwave-menu-hover); color: var(--filmwave-menu-text); }
        .projects-search { display: flex; width: 100%; height: 42px; align-items: center; gap: 12px; border: 1px solid color-mix(in srgb, var(--filmwave-header-border-color) 50%, transparent); border-radius: 0; background: var(--bg-primary); padding: 0 14px; color: var(--text-muted); box-shadow: none; }
        .projects-search input { min-width: 0; flex: 1 1 auto; border: 0; outline: 0; background: transparent; color: var(--text-primary); font-family: inherit; font-size: 12px; font-style: italic; }
        .projects-search input::placeholder { color: var(--text-muted); }
        .projects-search-clear { display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; border: 0; border-radius: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 15px; line-height: 1; }
        .projects-search-clear:hover { background: var(--bg-hover); color: var(--text-primary); }
        .projects-control-right { display: flex; justify-content: flex-end; align-items: center; gap: 18px; }
        .projects-sort-button { height: 42px; display: inline-flex; align-items: center; gap: 9px; border: 1px solid var(--border); border-radius: 0; background: var(--bg-secondary); padding: 0 16px; color: var(--text-secondary); cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 500; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
        .projects-sort-button:hover, .projects-sort-button.is-open { background: var(--bg-hover); border-color: var(--border-hover); color: var(--text-primary); }
        .projects-sort-dropdown { min-width: 154px; }
        .projects-sort-dropdown button.is-active { background: var(--bg-hover); color: var(--text-primary); }
        .projects-new-button { height: 42px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--text-primary); border-radius: 0; background: var(--text-primary); padding: 0 22px; color: var(--bg-primary); cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 500; transition: opacity 0.15s ease; }
        .projects-new-button:hover { opacity: 0.82; }
        .projects-title { margin: 36px 0 20px; max-width: 640px; font-size: 1.6em; font-weight: 500; line-height: 1; letter-spacing: -0.035em; color: var(--text-primary); }
        .projects-empty-space { flex: 1 1 auto; display: flex; min-height: 340px; align-items: center; justify-content: center; }
        .projects-list { display: flex; flex: 0 0 auto; flex-direction: column; margin-top: 12px; border-top: 1px solid var(--border-subtle); }
        .projects-row { display: grid; min-height: 72px; grid-template-columns: minmax(0, 1fr) auto; align-items: center; border-bottom: 1px solid var(--border-subtle); background: transparent; color: inherit; padding: 0 18px; transition: background 0.15s ease, color 0.15s ease; }
        .projects-row:hover { background: var(--bg-hover); }
        .projects-row-link { display: grid; min-width: 0; min-height: 72px; grid-template-columns: 62px minmax(180px, 1fr); align-items: center; color: inherit; text-decoration: none; }
        .projects-row-icon { display: flex; width: 42px; height: 42px; align-items: center; justify-content: center; overflow: visible; border: 0; border-radius: 0; background: transparent; color: var(--text-primary); }
        .projects-row-icon-inner { display: block; transform: translateY(-2px) scale(0.58); transform-origin: center; }
        .projects-row-main { min-width: 0; display: flex; flex-direction: column; gap: 0; }
        .projects-row-main span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13.5px; font-weight: 500; line-height: 1.35; color: var(--text-primary); }
        .projects-row-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 2px 0 0; font-size: 11.5px; line-height: 1.35; color: var(--text-subtle); }
        .projects-row-actions { display: inline-flex; justify-self: end; align-items: center; gap: 8px; }
        .projects-row-edit,
        .projects-row-view { display: inline-flex; width: fit-content; height: 32px; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 0; background: var(--bg-primary); padding: 0 12px; color: var(--text-primary); font-family: inherit; font-size: 11px; font-weight: 500; text-decoration: none; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
        .projects-row-view { min-width: 112px; gap: 7px; }
        .projects-row-edit { min-width: 58px; cursor: pointer; }
        .projects-row-edit:hover,
        .projects-row-view:hover,
        .projects-row:hover .projects-row-view { border-color: var(--text-primary); background: var(--text-primary); color: var(--bg-primary); }
        .projects-empty, .projects-error { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; color: var(--text-secondary); }
        .projects-empty h2, .projects-error h2 { font-size: 18px; font-weight: 700; color: var(--text-primary); }
        .projects-empty p, .projects-error p { max-width: 360px; font-size: 13px; line-height: 1.5; color: var(--text-muted); }
        .projects-retry-button { height: 36px; border: 1px solid var(--text-primary); border-radius: 0; background: var(--text-primary); padding: 0 14px; color: var(--bg-primary); cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 500; }
        .projects-skeleton-block { position: relative; overflow: hidden; background: var(--bg-tertiary); }
        .projects-skeleton-block::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--bg-hover) 72%, transparent), transparent); animation: projects-skeleton-shimmer 1.6s ease-in-out infinite; }
        @keyframes projects-skeleton-shimmer { 100% { transform: translateX(100%); } }
        .projects-row-skeleton { grid-template-columns: 42px minmax(0, 1fr) 128px; cursor: default; pointer-events: none; }
        .projects-skeleton-icon { width: 42px; height: 42px; }
        .projects-skeleton-copy { display: flex; min-width: 0; flex-direction: column; gap: 9px; }
        .projects-skeleton-title { width: min(220px, 52%); height: 9px; }
        .projects-skeleton-line { width: min(360px, 78%); height: 8px; }
        .projects-skeleton-button { justify-self: end; width: 128px; height: 32px; }
        @media (max-width: 940px) {
          .projects-shell { padding-left: 32px; padding-right: 32px; }
          .projects-control-bar { grid-template-columns: 1fr; gap: 12px; }
          .projects-status-pill { width: 100%; }
          .projects-control-right { justify-content: space-between; }
          .projects-title { margin-top: 36px; }
          .projects-list { margin-top: 12px; }
        }
        @media (max-width: 640px) {
          .projects-shell { padding-left: 20px; padding-right: 20px; }
          .projects-row { grid-template-columns: minmax(0, 1fr); gap: 10px; padding: 12px; }
          .projects-row-link { min-height: 42px; grid-template-columns: 46px minmax(0, 1fr); }
          .projects-row-actions { justify-self: start; padding-left: 46px; }
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
                  {option.label}
                </button>
              ))}
            </DropdownShell>

            <label className="projects-search">
              <SearchIcon />
              <input
                type="text"
                value={query}
                placeholder="Search projects"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  className="projects-search-clear"
                  aria-label="Clear project search"
                  onClick={() => setQuery("")}
                >
                  ×
                </button>
              )}
            </label>

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
                  onClick={() => {
                    setSortMode("newest");
                    setSortOpen(false);
                  }}
                >
                  Newest first
                </button>
                <button
                  type="button"
                  className={sortMode === "oldest" ? "is-active" : ""}
                  onClick={() => {
                    setSortMode("oldest");
                    setSortOpen(false);
                  }}
                >
                  Oldest first
                </button>
                <button
                  type="button"
                  className={sortMode === "alphabetical" ? "is-active" : ""}
                  onClick={() => {
                    setSortMode("alphabetical");
                    setSortOpen(false);
                  }}
                >
                  Alphabetical
                </button>
              </DropdownShell>

              <button
                type="button"
                className="projects-new-button"
                onClick={() => setCreateProjectOpen(true)}
              >
                + New Project
              </button>
            </div>
          </section>

          <h1 className="projects-title">Projects</h1>

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
          ) : displayedProjects.length > 0 ? (
            <section className="projects-list" aria-label="Projects">
              {displayedProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onEdit={openEditProject}
                />
              ))}
            </section>
          ) : (
            <div className="projects-empty-space">
              <div className="projects-empty">
                <h2>{cleanQuery ? "No matching projects" : "Stay organized with Projects"}</h2>
                <p>
                  {cleanQuery
                    ? "Try searching for a different project name."
                    : "Save songs, organize files, and keep every project workspace in one place."}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onProjectCreated={(project) => {
          setProjects((current) => [project, ...current]);
          setCreateProjectOpen(false);
        }}
      />

      <EditProjectModal
        isOpen={Boolean(editingProject)}
        project={editingProject}
        name={editName}
        description={editDescription}
        isSaving={isSavingProject || deletingProjectId === editingProject?.id}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onSave={handleSaveEdit}
        onDelete={handleDeleteProject}
        onClose={() => {
          if (isSavingProject || deletingProjectId) return;
          setEditingProject(null);
        }}
      />
    </>
  );
}
