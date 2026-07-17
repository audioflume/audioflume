import type { ReactNode } from "react";
import PlaylistTopControls from "./PlaylistTopControls";
import "./playlists-tabs-rail.css";

export default function PlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="playlists-route-shell">
      <PlaylistTopControls />
      <style>{`
        .playlists-route-shell {
          display: flex;
          min-height: 100vh;
          flex-direction: column;
        }

        body:has(.playlists-page) {
          --playlists-content-gutter: clamp(28px, 5.2vw, 82px);
          --playlists-shell-gutter: 32px;
        }

        .playlists-route-shell > .playlists-page {
          display: flex !important;
          min-height: 0 !important;
          flex: 1 1 auto;
          flex-direction: column;
        }

        .playlists-page .playlists-shell {
          display: flex !important;
          min-height: 0 !important;
          flex: 1 1 auto;
          flex-direction: column;
        }

        .playlists-page .playlists-shell > div:has(> footer) {
          margin-top: auto;
        }

        .playlists-page .playlists-hero,
        .playlists-page .playlist-library,
        .playlists-page .playlist-skeleton-grid,
        .playlists-page .playlist-skeleton-list,
        .playlists-page .playlist-skeleton-reserve {
          margin-right: calc(var(--playlists-content-gutter) - var(--playlists-shell-gutter)) !important;
          margin-left: calc(var(--playlists-content-gutter) - var(--playlists-shell-gutter)) !important;
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
            --playlists-content-gutter: 20px;
          }
        }

        @media (max-width: 640px) {
          body:has(.playlists-page) {
            --playlists-shell-gutter: 20px;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
