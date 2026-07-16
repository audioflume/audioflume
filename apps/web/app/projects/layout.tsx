import Footer from "@/components/Footer";
import type { ReactNode } from "react";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        body:has(.projects-page) {
          --projects-content-gutter: clamp(28px, 5.2vw, 82px);
          --projects-shell-gutter: 32px;
        }

        .projects-page {
          margin-top: var(--filmwave-header-height, 56px) !important;
          min-height: calc(100vh - var(--filmwave-header-height, 56px)) !important;
        }

        .projects-page .projects-shell {
          min-height: calc(100vh - var(--filmwave-header-height, 56px)) !important;
        }

        .projects-page .projects-title,
        .projects-page .projects-list {
          margin-right: calc(var(--projects-content-gutter) - var(--projects-shell-gutter)) !important;
          margin-left: calc(var(--projects-content-gutter) - var(--projects-shell-gutter)) !important;
        }

        .projects-page .projects-list {
          border-top-color: var(--filmwave-ui-divider-color) !important;
        }

        .projects-page .projects-row {
          border-bottom-color: var(--filmwave-ui-divider-color) !important;
        }

        .projects-page .projects-title {
          color: var(--text-primary) !important;
          font-family: var(--filmwave-ui-title-font-family) !important;
          font-size: var(--filmwave-ui-title-font-size) !important;
          font-weight: var(--filmwave-ui-title-font-weight) !important;
          letter-spacing: var(--filmwave-ui-title-letter-spacing) !important;
          line-height: var(--filmwave-ui-title-line-height) !important;
        }

        .projects-route-footer {
          box-sizing: border-box;
          width: 100%;
          padding-right: var(--projects-content-gutter, clamp(28px, 5.2vw, 82px));
          padding-left: var(--projects-content-gutter, clamp(28px, 5.2vw, 82px));
        }

        body:has(.project-detail-page) .projects-route-footer {
          width: auto;
          margin-right: var(--fw-music-content-inset-right, 20px);
          margin-left: calc(
            var(--sidebar-width) + 168px +
              var(--fw-music-content-inset-left, 28px)
          );
          padding-right: 0;
          padding-left: 0;
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
        }

        @media (max-width: 520px) {
          body:has(.project-detail-page) .projects-route-footer {
            width: 100%;
            margin-right: 0;
            margin-left: 0;
            padding-right: 18px;
            padding-left: 18px;
          }
        }
      `}</style>
      {children}
      <div className="projects-route-footer">
        <Footer />
      </div>
    </>
  );
}