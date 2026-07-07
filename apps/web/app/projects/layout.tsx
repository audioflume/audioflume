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

        .projects-page .projects-row-icon {
          width: 62px !important;
          height: 50px !important;
        }

        .projects-page .projects-row-icon-inner {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          transform: none !important;
        }

        .projects-page .projects-row-icon-inner .project-folder-glyph {
          width: 58px !important;
          height: 50px !important;
        }
      `}</style>
      {children}
    </>
  );
}
