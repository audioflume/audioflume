"use client";

import DropdownShell from "@/components/DropdownShell";
import Footer from "@/components/Footer";
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
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.4 5.4a1.2 1.2 0 0 1 1.2-1.2h8.8a1.2 1.2 0 0 1 1.2 1.2v8.8a1.2 1.2 0 1 1-2.4 0V8.3l-9.05 9.05a1.2 1.2 0 0 1-1.7-1.7L14.5 6.6H8.6a1.2 1.2 0 0 1-1.2-1.2Z"
      />
    </svg>
  );
}

function ProjectRow({ project, index }: { project: Project; index: number }) {
  return (
    <Link href={`/projects/${project.id}`} className="projects-row">
      <div className="projects-row-number">{String(index + 1).padStart(2, "0")}</div>

      <div className="projects-row-icon" aria-hidden="true">
        <span className="projects-row-icon-inner">
          <FolderGlyph />
        </span>
      </div>

      <div className="projects-row-main">
        <span>{project.name}</span>
        <small>{project.description?.trim() || "No description"}</small>
      </div>

      <div className="projects-row-date">{formatProjectDate(project.created_at)}</div>

      <div className="projects-row-arrow">
        <ArrowIcon />
      </div>
    </Link>
  );
}

function ProjectSkeletonList() {
  return (
    <div className="projects-list">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="projects-row projects-row-skeleton">
          <div className="projects-skeleton-block projects-skeleton-number" />
          <div className="projects-skeleton-block projects-skeleton-icon" />
          <div className="projects-skeleton-copy">
            <div className="projects-skeleton-block projects-skeleton-title" />
            <div className="projects-skeleton-block projects-skeleton-line" />
          </div>
          <div className="projects-skeleton-block projects-skeleton-date" />
          <div className="projects-skeleton-block projects-skeleton-arrow" />
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
        .projects-shell { position: relative; z-index: 1; padding: 0 24px; }
        .projects-hero { display: flex; min-height: 78px; align-items: flex-end; justify-content: space-between; gap: 20px; border-bottom: 1px solid var(--border); padding: 0 0 16px; }
        .projects-title-wrap { min-width: 0; }
        .projects-kicker { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
        .projects-title { margin-top: 8px; font-family: var(--font-instrument-sans); font-size: 26px; font-weight: 500; line-height: 1; letter-spacing: -0.035em; color: var(--text-primary); }
        .projects-meta { display: flex; flex: 0 0 auto; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; font-size: 11px; color: var(--text-secondary); }
        .projects-dot { color: var(--text-muted); }
        .projects-control-bar { min-height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--border-subtle); padding: 10px 0; }
        .projects-search { display: flex; min-width: 260px; width: min(420px, 100%); height: 30px; align-items: center; gap: 9px; border: 1px solid var(--border); border-radius: 0; background: var(--bg-secondary); padding: 0 10px; color: var(--text-muted); }
        .projects-search input { min-width: 0; flex: 1 1 auto; border: 0; outline: 0; background: transparent; color: var(--text-primary); font-family: inherit; font-size: 12px; }
        .projects-search input::placeholder { color: var(--text-muted); }
        .projects-search-clear { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; border: 0; border-radius: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 15px; line-height: 1; }
        .projects-search-clear:hover { background: var(--bg-hover); color: var(--text-primary); }
        .projects-control-right { display: flex; align-items: center; gap: 8px; }
        .projects-sort-button { height: 30px; display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 0; background: var(--bg-secondary); padding: 0 10px; color: var(--text-secondary); cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 500; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
        .projects-sort-button:hover, .projects-sort-button.is-open { background: var(--bg-hover); border-color: var(--border-hover); color: var(--text-primary); }
        .projects-sort-dropdown { min-width: 154px; }
        .projects-sort-dropdown button.is-active { background: var(--bg-hover); color: var(--text-primary); }
        .projects-list { display: flex; flex-direction: column; }
        .projects-list-head { display: grid; min-height: 34px; grid-template-columns: 42px 44px minmax(180px, 1fr) 132px 28px; align-items: center; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 10px; font-weight: 500; letter-spacing: 0.09em; text-transform: uppercase; }
        .projects-row { display: grid; min-height: 68px; grid-template-columns: 42px 44px minmax(180px, 1fr) 132px 28px; align-items: center; border-bottom: 1px solid var(--border-subtle); background: transparent; color: inherit; text-decoration: none; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
        .projects-row:hover { background: var(--bg-hover); }
        .projects-row-number { color: var(--text-muted); font-size: 10px; font-weight: 600; letter-spacing: 0.05em; }
        .projects-row-icon { display: flex; width: 34px; height: 34px; align-items: center; justify-content: center; overflow: visible; border: 1px solid var(--border-subtle); border-radius: 0; background: var(--bg-secondary); color: var(--text-secondary); }
        .projects-row-icon-inner { display: block; transform: translateY(-2px) scale(0.5); transform-origin: center; }
        .projects-row-main { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
        .projects-row-main span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .projects-row-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-secondary); }
        .projects-row-date { color: var(--text-secondary); font-size: 11px; text-align: right; }
        .projects-row-arrow { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; justify-self: end; color: var(--text-muted); transition: color 0.15s ease; }
        .projects-row:hover .projects-row-arrow { color: var(--text-primary); }
        .projects-empty, .projects-error { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; color: var(--text-secondary); }
        .projects-empty h2, .projects-error h2 { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .projects-empty p, .projects-error p { max-width: 320px; font-size: 12px; line-height: 1.6; }
        .projects-retry-button { height: 30px; border: 1px solid var(--border); border-radius: 0; background: var(--bg-secondary); padding: 0 12px; color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 500; }
        .projects-retry-button:hover { background: var(--bg-hover); }
        .projects-skeleton-block { position: relative; overflow: hidden; background: var(--bg-tertiary); }
        .projects-skeleton-block::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--bg-hover) 72%, transparent), transparent); animation: projects-skeleton-shimmer 1.6s ease-in-out infinite; }
        @keyframes projects-skeleton-shimmer { 100% { transform: translateX(100%); } }
        .projects-row-skeleton { cursor: default; pointer-events: none; }
        .projects-skeleton-number { width: 22px; height: 8px; }
        .projects-skeleton-icon { width: 34px; height: 34px; }
        .projects-skeleton-copy { display: flex; min-width: 0; flex-direction: column; gap: 9px; }
        .projects-skeleton-title { width: min(220px, 52%); height: 9px; }
        .projects-skeleton-line { width: min(360px, 78%); height: 8px; }
        .projects-skeleton-date { justify-self: end; width: 72px; height: 8px; }
        .projects-skeleton-arrow { justify-self: end; width: 18px; height: 18px; }
        @media (max-width: 720px) {
          .projects-hero { align-items: flex-start; flex-direction: column; justify-content: flex-end; gap: 12px; padding-top: 28px; }
          .projects-meta { justify-content: flex-start; }
          .projects-control-bar { align-items: stretch; flex-direction: column; }
          .projects-search { width: 100%; }
          .projects-control-right { justify-content: flex-end; }
          .projects-list-head { display: none; }
          .projects-row { grid-template-columns: 34px minmax(0, 1fr) 28px; gap: 12px; padding: 12px 0; }
          .projects-row-number, .projects-row-date { display: none; }
          .projects-row-icon { width: 34px; }
        }
      `}</style>

      <main className="projects-page">
        <div className="projects-shell">
          <section className="projects-hero">
            <div className="projects-title-wrap">
              <div className="projects-kicker">Project Library</div>
              <h1 className="projects-title">Projects</h1>
            </div>
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
            <ProjectSkeletonList />
          ) : displayedProjects.length > 0 ? (
            <section className="projects-list" aria-label="Projects">
              <div className="projects-list-head" aria-hidden="true">
                <span>No.</span>
                <span />
                <span>Name</span>
                <span style={{ textAlign: "right" }}>Created</span>
                <span />
              </div>
              {displayedProjects.map((project, index) => (
                <ProjectRow key={project.id} project={project} index={index} />
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
