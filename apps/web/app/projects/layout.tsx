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
      `}</style>
      {children}
    </>
  );
}
