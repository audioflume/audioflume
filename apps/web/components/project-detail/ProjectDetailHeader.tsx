"use client";

import SearchIcon from "@/components/icons/SearchIcon";
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

export default function ProjectDetailHeader({
  project,
}: ProjectDetailHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

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
          flex-direction: column;
          justify-content: center;
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
          <h1 className="project-detail-title">{project.name}</h1>
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
