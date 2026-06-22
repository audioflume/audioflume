"use client";

import { type ReactNode } from "react";

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

        body:has(.filmwave-music-player) main .fw-song-list {
          margin-bottom: calc(var(--filmwave-player-height, 72px) + 28px) !important;
        }

        @media (max-width: 640px) {
          main .fw-song-list {
            margin-left: 20px !important;
            margin-right: 20px !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
