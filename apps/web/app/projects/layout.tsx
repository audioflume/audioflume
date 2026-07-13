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

        .projects-page .projects-title {
          color: var(--text-primary) !important;
          font-family: var(--font-instrument-sans), var(--font-satoshi), sans-serif !important;
          font-size: clamp(18px, 1.45vw, 24px) !important;
          font-weight: 400 !important;
          letter-spacing: -0.045em !important;
          line-height: 1.1 !important;
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
      `}</style>
      {children}
    </>
  );
}
