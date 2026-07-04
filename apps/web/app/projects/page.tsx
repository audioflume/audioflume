"use client";

import DropdownShell from "@/components/DropdownShell";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import SortIcon from "@/components/icons/SortIcon";
import { FolderGlyph } from "@/components/project-browser/ProjectBrowserGlyphs";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import type { Project } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProjectSortMode = "newest" | "oldest" | "alphabetical";

function formatProjectDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.4 5.4a1.2 1.2 0 0 1 1.2-1.2h8.8a1.2 1.2 0 0 1 1.2 1.2v8.8a1.2 1.2 0 1 1-2.4 0V8.3l-9.05 9.05a1.2 1.2 0 0 1-1.7-1.7L14.5 6.6H8.6a1.2 1.2 0 0 1-1.2-1.2Z"
      />
    </svg>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="projects-card">
      <div className="projects-card-icon">
        <span className="projects-card-icon-inner">
          <FolderGlyph />
        </span>
      </div>

      <div className="projects-card-copy">
        <span className="projects-card-kicker">Project</span>
        <h3>{project.name}</h3>
        <p>{project.description?.trim() || "No description yet"}</p>
      </div>

      <div className="projects-card-bottom">
        <span>{formatProjectDate(project.created_at)}</span>
        <span className="projects-card-arrow">
          <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}

function ProjectSkeletonGrid() {
  return (
    <div className="projects-grid">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="projects-card projects-card-skeleton">
          <div className="projects-skeleton-block projects-skeleton-icon" />
          <div className="projects-skeleton-copy">
            <div className="projects-skeleton-block projects-skeleton-kicker" />
            <div className="projects-skeleton-block projects-skeleton-title" />
            <div className="projects-skeleton-block projects-skeleton-line" />
            <div className="projects-skeleton-block projects-skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const { currentSong } = usePlayer();
  const { projects, loading, error, refetchProjects } = useProjectsContext();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<ProjectSortMode>("newest");
  const [sortOpen, setSortOpen] = useState(false);

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

  return (
    <>
      <style>{`
        .projects-page { position: relative; margin-left: var(--sidebar-width); margin-top: 56px; min-height: calc(100vh - 56px); overflow-x: hidden; overflow-y: visible; background: var(--bg-primary); color: var(--text-primary); transition: margin-left 0.2s ease; }
        .projects-shell { position: relative; z-index: 1; padding: 0 32px; }
        .projects-hero { display: block; padding: 88px 0 0; }
        .projects-kicker { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
        .projects-title { margin-top: 8px; max-width: 640px; font-family: var(--font-instrument-sans); font-size: 56px; font-weight: 500; line-height: 0.94; letter-spacing: -0.055em; color: var(--text-primary); }
        .projects-meta { margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11px; color: var(--text-secondary); }
        .projects-dot { color: var(--text-muted); }
        .projects-control-bar { min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 28px; margin-bottom: 32px; }
        .projects-search { display: flex; min-width: 260px; width: min(420px, 100%); height: 34px; align-items: center; gap: 9px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg-secondary); padding: 0 12px; color: var(--text-muted); }
        .projects-search input { min-width: 0; flex: 1 1 auto; border: 0; outline: 0; background: transparent; color: var(--text-primary); font-family: inherit; font-size: 12px; }
        .projects-search input::placeholder { color: var(--text-muted); }
        .projects-search-clear { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; border: 0; border-radius: 999px; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 15px; line-height: 1; }
        .projects-search-clear:hover { background: var(--bg-hover); color: var(--text-primary); }
        .projects-control-right { display: flex; align-items: center; gap: 8px; }
        .projects-sort-button { height: 34px; display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg-secondary); padding: 0 12px; color: var(--text-secondary); cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 500; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
        .projects-sort-button:hover, .projects-sort-button.is-open { background: var(--icon-button-hover); border-color: var(--border-hover); color: var(--text-primary); }
        .projects-sort-dropdown { min-width: 154px; }
        .projects-sort-dropdown button.is-active { background: var(--bg-hover); color: var(--text-primary); }
        .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
        .projects-card { min-height: 190px; display: flex; flex-direction: column; justify-content: space-between; gap: 18px; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--bg-card); padding: 16px; color: inherit; text-decoration: none; cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease; }
        .projects-card:hover { border-color: var(--border); background: var(--bg-hover); transform: translateY(-1px); }
        .projects-card-icon { display: flex; height: 42px; width: 42px; align-items: center; justify-content: center; overflow: visible; border-radius: 12px; background: var(--bg-secondary); color: var(--text-primary); }
        .projects-card-icon-inner { display: block; transform: translateY(-2px) scale(0.64); transform-origin: center; }
        .projects-card-copy { min-width: 0; }
        .projects-card-kicker { display: block; font-size: 10px; font-weight: 500; letter-spacing: 0.11em; text-transform: uppercase; color: var(--text-muted); }
        .projects-card h3 { margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-instrument-sans); font-size: 22px; font-weight: 500; line-height: 1.08; letter-spacing: -0.045em; color: var(--text-primary); }
        .projects-card p { margin-top: 10px; display: -webkit-box; min-height: 34px; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 11px; line-height: 1.55; color: var(--text-secondary); }
        .projects-card-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid var(--border-subtle); padding-top: 12px; font-size: 11px; color: var(--text-muted); }
        .projects-card-arrow { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 999px; background: var(--bg-secondary); color: var(--text-secondary); transition: background 0.15s ease, color 0.15s ease; }
        .projects-card:hover .projects-card-arrow { background: var(--text-primary); color: var(--bg-primary); }
        .projects-empty, .projects-error { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; color: var(--text-secondary); }
        .projects-empty h2, .projects-error h2 { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .projects-empty p, .projects-error p { max-width: 320px; font-size: 12px; line-height: 1.6; }
        .projects-retry-button { height: 30px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg-secondary); padding: 0 12px; color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 500; }
        .projects-retry-button:hover { background: var(--bg-hover); }
        .projects-skeleton-block { position: relative; overflow: hidden; background: var(--bg-tertiary); }
        .projects-skeleton-block::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--bg-hover) 72%, transparent), transparent); animation: projects-skeleton-shimmer 1.6s ease-in-out infinite; }
        @keyframes projects-skeleton-shimmer { 100% { transform: translateX(100%); } }
        .projects-card-skeleton { cursor: default; transform: none !important; }
        .projects-skeleton-icon { width: 42px; height: 42px; border-radius: 12px; }
        .projects-skeleton-copy { display: flex; flex-direction: column; gap: 10px; }
        .projects-skeleton-kicker { width: 54px; height: 8px; }
        .projects-skeleton-title { width: 72%; height: 18px; }
        .projects-skeleton-line { width: 100%; height: 9px; }
        .projects-skeleton-line.short { width: 58%; }
        @media (max-width: 720px) {
          .projects-control-bar { align-items: stretch; flex-direction: column; }
          .projects-search { width: 100%; }
          .projects-control-right { justify-content: flex-end; }
          .projects-title { font-size: 48px; }
        }
      `}</style>

      <main className="projects-page">
        <div className="projects-shell">
          <section className="projects-hero">
            <div className="projects-kicker">Project Library</div>
            <h1 className="projects-title">Projects</h1>
            <div className="projects-meta">
              <span>{projects.length} projects</span>
              <span className="projects-dot">·</span>
              <span>{displayedProjects.length} shown</span>
            </div>
          </section>

          <section className="projects-control-bar">
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
                    <SortIcon />
                    <SortLabel sortMode={sortMode} />
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
            </div>
          </section>

          {error && !loading ? (
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
          ) : loading ? (
            <ProjectSkeletonGrid />
          ) : displayedProjects.length > 0 ? (
            <section className="projects-grid">
              {displayedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </section>
          ) : (
            <div className="projects-empty">
              <h2>{cleanQuery ? "No matching projects" : "No projects yet"}</h2>
              <p>
                {cleanQuery
                  ? "Try searching for a different project name."
                  : "Create a project from the sidebar, then it will appear here."}
              </p>
            </div>
          )}

          <div
            className="pt-12 pb-1"
            style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
          >
            <Footer />
          </div>
        </div>
      </main>
    </>
  );
}
