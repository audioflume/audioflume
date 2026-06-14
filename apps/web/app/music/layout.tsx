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

        main .fw-toolbar-search {
          flex: 0 0 auto !important;
          width: 356px !important;
          min-width: 356px !important;
          max-width: 356px !important;
          height: 34px !important;
          align-self: center !important;
          gap: 7px !important;
          overflow: visible !important;
          border-color: var(--border) !important;
          border-radius: 999px !important;
          background: transparent !important;
          background-image: none !important;
          padding: 0 4px !important;
          box-shadow: none !important;
        }

        main .fw-toolbar-search:focus-within {
          border-color: var(--border) !important;
          background: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }

        main .fw-toolbar-search-icon {
          width: 24px !important;
          height: 24px !important;
          background: var(--bg-elevated) !important;
          color: var(--text-muted) !important;
        }

        main .fw-toolbar-search:focus-within .fw-toolbar-search-icon {
          color: var(--text-muted) !important;
        }

        main .fw-toolbar-search-icon svg {
          width: 11px !important;
          height: 11px !important;
        }

        main .fw-toolbar-search input {
          font-size: 13px !important;
          font-weight: 400 !important;
          line-height: 1 !important;
          padding: 0 4px 0 0 !important;
          transform: translateY(-1px) !important;
        }

        main .fw-toolbar-search input::placeholder {
          color: var(--text-muted) !important;
        }

        main .fw-toolbar-search-clear {
          width: 20px !important;
          height: 20px !important;
          margin-left: 4px !important;
          background: transparent !important;
          color: var(--text-muted) !important;
          padding: 0 !important;
          transition: color 150ms ease !important;
        }

        main .fw-toolbar-search-clear:hover {
          background: transparent !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </>
  );
}
