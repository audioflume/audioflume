import type { ReactNode } from "react";

export default function PlaylistDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style>{`
        .playlist-detail-meta > .playlist-public-icon-separator {
          order: 98;
        }

        .playlist-detail-meta > .playlist-public-icon-host.is-detail {
          order: 99;
        }
      `}</style>
      {children}
    </>
  );
}
