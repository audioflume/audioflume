import type { ReactNode } from "react";

export default function PlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style>{`.playlist-gallery-letters { display: none !important; }`}</style>
    </>
  );
}
