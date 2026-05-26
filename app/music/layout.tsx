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
      `}</style>
    </>
  );
}
