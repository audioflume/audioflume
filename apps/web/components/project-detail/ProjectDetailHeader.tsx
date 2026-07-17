"use client";

import SearchIcon from "@/components/icons/SearchIcon";
import { useProjectsContext } from "@/context/ProjectsContext";
import type { ProjectSyncState } from "@/lib/project-detail/projectDetailUtils";
import type { Project } from "@/lib/types";
import { useEffect, useState } from "react";

type ProjectDetailHeaderProps = {
  assetsLoaded: boolean;
  project: Project;
  syncLabel: string;
  syncState: ProjectSyncState;
  totalFileCount: number;
};

type ProjectRenameRequestDetail = {
  projectId?: number | string;
};

export default function ProjectDetailHeader({
  project,
}: ProjectDetailHeaderProps) {
  const { setProjects } = useProjectsContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(project.name);
  const [isSavingRename, setIsSavingRename] = useState(false);

  useEffect(() => {
    function handleRenameRequest(event: Event) {
      const renameEvent = event as CustomEvent<ProjectRenameRequestDetail>;

      if (String(renameEvent.detail?.projectId) !== String(project.id)) return;

      renameEvent.preventDefault();
      setRenameName(project.name);
      setIsRenaming(true);
    }

    window.addEventListener("filmwave:project-rename-request", handleRenameRequest);

    return () => {
      window.removeEventListener(
        "filmwave:project-rename-request",
        handleRenameRequest,
      );
    };
  }, [project.id, project.name]);

  useEffect(() => {
    const projectPage = document.querySelector<HTMLElement>(
      ".project-detail-page",
    );

    if (!projectPage) return;

    function applySearchFilter() {
      const cleanQuery = searchQuery.trim().toLowerCase();
      const items = projectPage.querySelectorAll<HTMLElement>(
        ".project-browser-grid > div, .project-browser-list > :not(.project-browser-list-head)",
      );

      items.forEach((item) => {
        const itemText = item.textContent?.toLowerCase() ?? "";
        item.hidden = Boolean(cleanQuery) && !itemText.includes(cleanQuery);
      });
    }

    applySearchFilter();

    const observer = new MutationObserver(applySearchFilter);
    observer.observe(projectPage, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      projectPage
        .querySelectorAll<HTMLElement>(
          ".project-browser-grid > div, .project-browser-list > :not(.project-browser-list-head)",
        )
        .forEach((item) => {
          item.hidden = false;
        });
    };
  }, [searchQuery]);

  async function handleSaveRename() {
    const cleanName = renameName.trim();

    if (!cleanName || isSavingRename) return;

    if (cleanName === project.name) {
      setIsRenaming(false);
      return;
    }

    setIsSavingRename(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to rename project");
      }

      setProjects((current) =>
        current.map((item) =>
          item.id === project.id ? data || { ...item, name: cleanName } : item,
        ),
      );
      setIsRenaming(false);
    } catch (error) {
      console.error("Failed to rename project", error);
    } finally {
      setIsSavingRename(false);
    }
  }

  return (
    <section className="project-detail-hero">
      <style>{`
        .project-detail-page .project-detail-hero {
          min-height: 64px !important;
          align-items: center !important;
          border-bottom: 0 !important;
          padding-top: 22px !important;
          padding-bottom: 0 !important;
        }

        .project-detail-page .project-detail-header-row {
          min-height: 42px !important;
          align-items: center !important;
        }

        .project-detail-page .project-detail-heading-copy {
          display: flex;
          min-height: 42px;
          min-width: 0;
          flex-direction: column;
          justify-content: center;
        }

        .project-detail-page .project-detail-rename-row {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 8px;
        }

        .project-detail-page .project-detail-rename-input {
          box-sizing: border-box;
          width: min(360px, 100%);
          min-width: 0;
          height: 32px;
          border: 1px solid var(--border);
          border-radius: 0;
          background: var(--bg-primary);
          padding: 0 10px;
          color: var(--text-primary);
          font-family: var(--filmwave-ui-title-font-family);
          font-size: var(--filmwave-ui-title-font-size);
          font-weight: var(--filmwave-ui-title-font-weight);
          letter-spacing: var(--filmwave-ui-title-letter-spacing);
          line-height: var(--filmwave-ui-title-line-height);
          outline: none;
        }

        .project-detail-page .project-detail-rename-input:focus {
          border-color: var(--text-primary);
        }

        .project-detail-page .project-detail-rename-save {
          display: inline-flex;
          height: 32px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--text-primary);
          border-radius: 0;
          background: var(--text-primary);
          padding: 0 12px;
          color: var(--bg-primary);
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
        }

        .project-detail-page .project-detail-rename-save:disabled {
          cursor: default;
          opacity: 0.55;
        }

        .project-detail-page .project-detail-description {
          margin-top: 4px !important;
        }

        .project-detail-page .project-detail-controls {
          align-self: center !important;
          margin-top: 0 !important;
        }

        @media (max-width: 520px) {
          .project-detail-page .project-detail-hero {
            display: block !important;
            padding-top: 22px !important;
          }

          .project-detail-page .project-detail-controls {
            width: 100% !important;
            margin-top: 12px !important;
          }
        }
      `}</style>

      <div className="project-detail-header-row">
        <div className="project-detail-heading-copy">
          {isRenaming ? (
            <div className="project-detail-rename-row">
              <input
                className="project-detail-rename-input"
                type="text"
                value={renameName}
                autoFocus
                aria-label="Project name"
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setRenameName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSaveRename();
                  }

                  if (event.key === "Escape") {
                    setRenameName(project.name);
                    setIsRenaming(false);
                  }
                }}
              />
              <button
                type="button"
                className="project-detail-rename-save"
                disabled={!renameName.trim() || isSavingRename}
                onClick={() => void handleSaveRename()}
              >
                {isSavingRename ? "Saving" : "Save"}
              </button>
            </div>
          ) : (
            <h1 className="project-detail-title">{project.name}</h1>
          )}
          {project.description && (
            <p className="project-detail-description">{project.description}</p>
          )}
        </div>
      </div>

      <div className="project-detail-controls">
        <label className="project-detail-search">
          <SearchIcon />
          <input
            type="text"
            value={searchQuery}
            placeholder="Search project files"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              className="project-detail-search-clear"
              aria-label="Clear project search"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </label>

        <div
          id="project-detail-toolbar-slot"
          className="project-detail-toolbar-slot"
        />
      </div>
    </section>
  );
}
