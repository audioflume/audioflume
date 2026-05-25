import type { ReactNode } from "react";

export default function MusicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style jsx global>{`
        .music-page-banner {
          background-size: 100% 100%, 100% 100%, cover !important;
        }
      `}</style>
    </>
  );
}
