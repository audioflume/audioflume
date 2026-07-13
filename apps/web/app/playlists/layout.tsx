import type { ReactNode } from "react";
import PlaylistTopControls from "./PlaylistTopControls";
import "./playlists-tabs-rail.css";

export default function PlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PlaylistTopControls />
      <style>{`
        body:has(.playlists-page) {
          --playlists-page-gutter: clamp(28px, 5.2vw, 82px);
        }

        .playlists-top-controls {
          width: calc(100% - var(--playlists-page-gutter) - var(--playlists-page-gutter)) !important;
          margin-right: var(--playlists-page-gutter) !important;
          margin-left: var(--playlists-page-gutter) !important;
        }

        .playlists-page .playlists-shell {
          padding-right: var(--playlists-page-gutter) !important;
          padding-left: var(--playlists-page-gutter) !important;
        }

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

        @media (max-width: 720px) {
          body:has(.playlists-page) {
            --playlists-page-gutter: 20px;
          }
        }
      `}</style>
      {children}
    </>
  );
}
