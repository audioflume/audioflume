"use client";

import MusicHeaderSearch from "@/components/MusicHeaderSearch";
import type { ReactNode } from "react";

export default function MusicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MusicHeaderSearch />
      {children}
      <style jsx global>{`
        main .min-h-\[320px\].rounded-\[18px\] {
          background-size: 100% 100%, 100% 100%, cover !important;
        }

        main [aria-label="Shuffle songs"][style*="--shuffle-icon-color"] svg {
          fill: var(--text-primary) !important;
        }

        main .fw-toolbar-float {
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        main .fw-toolbar-search {
          display: none !important;
        }

        .filmwave-music-header-search-slot {
          position: fixed;
          top: 0;
          right: 76px;
          z-index: 130;
          display: flex;
          height: 56px;
          align-items: center;
          pointer-events: none;
        }

        .filmwave-music-header-search-slot > form {
          pointer-events: auto;
        }
      `}</style>
    </>
  );
}
