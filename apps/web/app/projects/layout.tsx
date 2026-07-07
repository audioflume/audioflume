import type { ReactNode } from "react";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        .projects-page {
          margin-top: var(--filmwave-header-height, 56px) !important;
          min-height: calc(100vh - var(--filmwave-header-height, 56px)) !important;
        }

        .projects-page .projects-shell {
          min-height: calc(100vh - var(--filmwave-header-height, 56px)) !important;
        }

        .projects-page .projects-row-icon-inner {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          transform: none !important;
        }

        .projects-page .projects-row-icon-inner .project-folder-glyph {
          width: 19px !important;
          height: 16px !important;
        }
      `}</style>
      {children}
    </>
  );
}
