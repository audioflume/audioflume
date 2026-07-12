import type { ReactNode } from "react";
import PlaylistTopControls from "./PlaylistTopControls";
import "./playlists-tabs-rail.css";

export default function PlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PlaylistTopControls />
      <style>{`
        .playlists-page .playlist-gallery-card:not(.is-reordering) .playlist-card-menu-wrap {
          top: auto !important;
          right: 0 !important;
          bottom: 18px !important;
          left: auto !important;
        }

        .playlists-page .playlist-index .playlist-index-row {
          padding-right: 68px !important;
        }

        .playlists-page .playlist-index .playlist-index-row.is-reordering {
          padding-right: 18px !important;
        }

        .playlists-page .playlist-gallery-content h3,
        .playlists-page .playlist-row-main span {
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.25;
          letter-spacing: normal;
        }

        .playlists-page .playlist-gallery-content p,
        .playlists-page .playlist-row-count {
          font-size: 11.5px;
          font-weight: 400;
          line-height: 1.45;
        }
      `}</style>
      {children}
    </>
  );
}
