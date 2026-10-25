import type { ReactNode } from "react";
import PlaylistDetailBackdropEnhancer from "@/components/PlaylistDetailBackdropEnhancer";
import PlaylistDetailBackButton from "./PlaylistDetailBackButton";
import PlaylistRouteRefresh from "./PlaylistRouteRefresh";
import PlaylistTopControls from "./PlaylistTopControls";
import "./playlists-tabs-rail.css";

export default function PlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="playlists-route-shell">
      <PlaylistRouteRefresh />
      <PlaylistDetailBackdropEnhancer />
      <PlaylistDetailBackButton />
      <PlaylistTopControls />
      <style>{`
        .playlists-route-shell {
          display: flex;
          min-height: 100vh;
          flex-direction: column;
        }

        body:has(.playlists-page) {
          --playlists-content-gutter: var(--filmwave-page-gutter);
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

        .playlists-page .playlist-index .playlist-index-row {
          padding-right: 68px !important;
        }

        .playlists-page .playlist-index .playlist-index-row.is-reordering {
          padding-right: 18px !important;
        }

        @media (max-width: 620px) {
          body:has(.playlists-page) {
            --playlists-shell-gutter: 16px;
          }

          .playlists-page .playlists-shell {
            padding-right: 16px !important;
            padding-left: 16px !important;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
