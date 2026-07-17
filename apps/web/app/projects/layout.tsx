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
          --projects-content-gutter: clamp(28px, 5.2vw, 82px);
          --projects-shell-gutter: 32px;
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
          border-top-color: var(--border-subtle) !important;
        }

        .projects-page .projects-row {
          border-bottom-color: var(--border-subtle) !important;
        }

        .projects-page .projects-row:not(.projects-row-skeleton) {
          grid-template-columns: minmax(0, 1fr) minmax(84px, 120px) 50px !important;
          gap: 0 !important;
        }

        .projects-page .projects-row-count {
          grid-column: 2;
          justify-self: end;
          text-align: right;
          font-size: 11.5px;
          font-weight: 400;
          line-height: 1.35;
          color: var(--text-subtle);
        }

        .projects-page .projects-row-actions {
          grid-column: 3;
          justify-self: end !important;
          padding-left: 0 !important;
        }

        .projects-page .projects-row-main small,
        .projects-page .projects-skeleton-line {
          display: none !important;
        }

        .projects-page .projects-skeleton-copy {
          gap: 0 !important;
        }

        .projects-page .projects-title {
          color: var(--text-primary) !important;
          font-family: var(--filmwave-ui-title-font-family) !important;
          font-size: var(--filmwave-ui-title-font-size) !important;
          font-weight: var(--filmwave-ui-title-font-weight) !important;
          letter-spacing: var(--filmwave-ui-title-letter-spacing) !important;
          line-height: var(--filmwave-ui-title-line-height) !important;
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

        @media (max-width: 720px) {
          body:has(.projects-page) {
            --projects-content-gutter: 20px;
          }
        }

        @media (max-width: 640px) {
          body:has(.projects-page) {
            --projects-shell-gutter: 20px;
          }

          .projects-page .projects-row:not(.projects-row-skeleton) {
            grid-template-columns: minmax(0, 1fr) minmax(70px, 96px) 50px !important;
            gap: 0 !important;
            padding: 0 18px !important;
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
