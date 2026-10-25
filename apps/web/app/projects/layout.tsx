import type { ReactNode } from "react";
import ProjectsRouteFooter from "./ProjectsRouteFooter";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="projects-route-shell">
      <style>{`
        .projects-route-shell {
          display: flex;
          min-height: 100vh;
          flex-direction: column;
        }

        body:has(.projects-page) {
          --projects-content-gutter: var(--filmwave-page-gutter);
          --projects-shell-gutter: 32px;
          --fw-header-search-row-height: 50px;
        }

        .projects-route-shell > .projects-page {
          min-height: 0 !important;
          flex: 1 1 auto;
        }

        .projects-page {
          margin-top: var(--filmwave-header-height, 56px) !important;
          min-height: 0 !important;
        }

        .projects-page .projects-shell {
          min-height: 0 !important;
        }

        .projects-page .projects-title,
        .projects-page .projects-list {
          margin-right: calc(var(--projects-content-gutter) - var(--projects-shell-gutter)) !important;
          margin-left: calc(var(--projects-content-gutter) - var(--projects-shell-gutter)) !important;
        }

        .projects-page .projects-list {
          border-top: 0 !important;
        }

        .projects-page .projects-row:not(.projects-row-skeleton) {
          border-bottom: 0 !important;
          border-bottom-color: transparent !important;
        }

        .projects-page .projects-row.is-renaming .projects-row-rename,
        .projects-page .projects-row.is-renaming .projects-row-rename-input {
          box-sizing: border-box;
          height: 18.225px !important;
          min-height: 18.225px !important;
          max-height: 18.225px !important;
          line-height: 1.35 !important;
        }

        .projects-page .projects-row:not(.projects-row-skeleton) > .projects-row-actions {
          right: 18px !important;
        }

        .projects-page .projects-row-main small {
          display: block !important;
          margin-top: 2px !important;
          color: var(--text-muted) !important;
          font-size: 11.5px !important;
          font-weight: 400 !important;
          line-height: 1.45 !important;
        }

        .projects-page .projects-title {
          color: var(--text-primary) !important;
          font-family: var(--filmwave-section-title-font-family) !important;
          font-size: var(--filmwave-section-title-font-size) !important;
          font-weight: var(--filmwave-section-title-font-weight) !important;
          letter-spacing: var(--filmwave-section-title-letter-spacing) !important;
          line-height: var(--filmwave-section-title-line-height) !important;
          text-transform: none !important;
        }

        .projects-page .projects-row-actions .project-toolbar-icon-button {
          display: inline-flex !important;
          width: 32px !important;
          min-width: 32px !important;
          height: 32px !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          color: var(--icon-color) !important;
          opacity: 1 !important;
        }

        .projects-page .projects-row-actions .project-toolbar-icon-button:hover,
        .projects-page .projects-row-actions .project-toolbar-icon-button.is-active {
          border-color: transparent !important;
          background: var(--icon-button-hover) !important;
          color: var(--text-primary) !important;
        }

        .projects-page .projects-row-rename-input,
        .project-detail-page .project-detail-rename-input {
          border: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .projects-page .projects-row-rename-input {
          transform: translateY(-1px);
        }

        .project-detail-page .project-detail-rename-row,
        .project-detail-page .project-detail-rename-input {
          box-sizing: border-box;
          height: 28px !important;
          min-height: 28px !important;
          max-height: 28px !important;
        }

        .projects-page .projects-row-rename-input:focus,
        .project-detail-page .project-detail-rename-input:focus {
          border-color: transparent !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .projects-route-footer {
          box-sizing: border-box;
          width: 100%;
          margin-top: auto;
          padding-right: 32px;
          padding-left: 32px;
        }

        .project-detail-page > .project-detail-shell {
          grid-template-rows: auto auto minmax(0, 1fr) auto !important;
        }

        .project-detail-page .project-detail-hero {
          grid-row: 1 !important;
        }

        .project-detail-page .project-sort-row {
          grid-row: 2 !important;
        }

        .project-detail-page .project-tab-panel {
          grid-row: 3 !important;
        }

        .project-detail-page .project-footer-wrap {
          display: none !important;
        }

        .project-detail-content-footer {
          grid-column: 2 !important;
          grid-row: 4 !important;
          order: 999;
          align-self: end !important;
          box-sizing: border-box;
          min-width: 0;
          width: auto;
          margin-right: var(--project-detail-content-inset-right, 20px);
          margin-left: var(--project-detail-content-inset-left, 28px);
        }

        @media (max-width: 940px) {
          .projects-page .projects-control-bar {
            grid-template-columns: 126px minmax(0, 1fr) auto !important;
            align-items: center !important;
            column-gap: 16px !important;
            row-gap: 0 !important;
          }

          .projects-page .projects-status-pill {
            width: 126px !important;
            min-width: 126px !important;
          }

          .projects-page .projects-control-right {
            justify-content: flex-end !important;
            flex-wrap: nowrap !important;
            gap: 8px !important;
          }

          .projects-page .projects-sort-button,
          .projects-page .projects-new-button {
            box-sizing: border-box !important;
            width: 40px !important;
            min-width: 40px !important;
            height: 40px !important;
            min-height: 40px !important;
            flex: 0 0 40px !important;
            padding: 0 !important;
            border: 1.25px solid var(--border) !important;
            border-radius: 4px !important;
            background: transparent !important;
          }

          .projects-page .projects-sort-button {
            gap: 0 !important;
          }

          .projects-page .projects-sort-button:hover,
          .projects-page .projects-sort-button:focus-visible,
          .projects-page .projects-sort-button.is-open {
            border-color: var(--text-muted) !important;
            background: transparent !important;
          }

          .projects-page .projects-new-button:hover {
            border-color: var(--text-primary) !important;
            background: var(--text-primary) !important;
            color: var(--bg-primary) !important;
          }

          .projects-page .projects-sort-button-icon {
            display: inline-flex !important;
          }

          .projects-page .projects-sort-button-label,
          .projects-page .projects-sort-button-chevron,
          .projects-page .projects-new-button-label {
            display: none !important;
          }
        }

        @media (max-width: 620px) {
          body:has(.projects-page) {
            --projects-shell-gutter: var(--filmwave-page-gutter);
          }

          .projects-page .projects-control-bar {
            grid-template-columns: 112px minmax(0, 1fr) auto !important;
            row-gap: 0 !important;
          }

          .projects-page .projects-status-pill {
            width: 112px !important;
            min-width: 112px !important;
            padding-right: 10px !important;
            padding-left: 10px !important;
          }

          .projects-page .projects-control-right {
            flex-wrap: nowrap !important;
            gap: 6px !important;
          }

        }

        @media (max-width: 520px) {
          .project-detail-content-footer {
            grid-column: auto !important;
            width: 100%;
            margin-right: 0;
            margin-left: 0;
          }
        }
      `}</style>
      {children}
      <ProjectsRouteFooter />
    </div>
  );
}
