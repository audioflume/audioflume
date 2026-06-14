"use client";

import type { ReactNode } from "react";

export default function MusicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style jsx global>{`
        main .min-h-\[320px\].rounded-\[18px\] {
          background-size: 100% 100%, 100% 100%, cover !important;
        }

        main [aria-label="Shuffle songs"][style*="--shuffle-icon-color"] svg {
          fill: var(--text-primary) !important;
        }

        main .fw-toolbar-sticky > .fw-toolbar-float {
          display: none !important;
        }

        main .fw-toolbar-search {
          display: none !important;
        }

        main .fw-hero-section {
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        main > section > .overflow-hidden {
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        main .fw-song-list {
          margin-top: 16px !important;
        }

        .filmwave-header-actions > form:first-child {
          position: fixed !important;
          top: 10.5px !important;
          left: 50% !important;
          z-index: 40 !important;
          width: clamp(320px, 42vw, 640px) !important;
          max-width: calc(100vw - 420px) !important;
          margin-right: 0 !important;
          transform: translateX(-50%) !important;
        }

        .filmwave-header-actions > form:first-child .filmwave-search-pill,
        .filmwave-header-actions > form:first-child .filmwave-search-pill-expanded,
        .filmwave-header-actions > form:first-child .filmwave-search-pill-collapsed {
          width: 100% !important;
          max-width: 100% !important;
        }

        .filmwave-header-actions > form:first-child .filmwave-search-pill-input {
          width: 100% !important;
        }

        @media (max-width: 900px) {
          .filmwave-header-actions > form:first-child {
            left: calc(50% + 32px) !important;
            width: min(420px, calc(100vw - 300px)) !important;
            max-width: calc(100vw - 300px) !important;
          }
        }
      `}</style>
    </>
  );
}
