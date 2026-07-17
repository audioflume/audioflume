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

        body:has(.playlist-detail-page) {
          --playlist-detail-page-gutter: clamp(28px, 5.2vw, 82px);
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

        .playlist-detail-page .playlist-detail-shell {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) 42px;
          column-gap: 18px;
          align-items: center;
          padding-top: 22px;
          padding-right: var(--playlist-detail-page-gutter) !important;
          padding-left: var(--playlist-detail-page-gutter) !important;
        }

        .playlist-detail-page .playlist-detail-top-actions {
          display: contents;
        }

        .playlist-detail-page .playlist-detail-top-actions > button:first-child {
          grid-column: 1;
          grid-row: 1;
          align-self: center;
        }

        .playlist-detail-page .playlist-detail-search-sticky {
          position: static !important;
          top: auto !important;
          z-index: auto !important;
          grid-column: 2;
          grid-row: 1;
          box-sizing: border-box;
          width: min(640px, 100%);
          justify-self: end;
          margin: 0 !important;
          background: transparent !important;
        }

        .playlist-detail-page .playlist-detail-search-row {
          display: flex;
          width: 100%;
          height: 42px;
          min-height: 42px;
          align-items: center;
          gap: 12px;
          border: 1px solid color-mix(in srgb, var(--filmwave-header-border-color) 50%, transparent);
          border-radius: 0;
          background: var(--bg-primary);
          padding: 0 14px;
          color: var(--text-muted);
          box-shadow: none;
        }

        .playlist-detail-page .playlist-detail-search-inner {
          display: flex;
          width: auto;
          min-width: 0;
          flex: 1 1 auto;
          align-items: center;
          gap: 12px;
          padding: 0;
        }

        .playlist-detail-page .playlist-detail-search-input {
          min-width: 0;
          flex: 1 1 auto;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 12px;
          font-style: italic;
        }

        .playlist-detail-page .playlist-detail-search-input::placeholder {
          color: var(--text-muted);
        }

        .playlist-detail-page .playlist-detail-top-actions > button:last-child {
          display: inline-flex !important;
          grid-column: 3;
          grid-row: 1;
          width: 42px !important;
          min-width: 42px !important;
          height: 42px !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid var(--border) !important;
          border-radius: 0 !important;
          background: var(--bg-secondary) !important;
          padding: 0 !important;
          color: var(--text-secondary) !important;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .playlist-detail-page .playlist-detail-top-actions > button:last-child:hover {
          border-color: var(--border-hover) !important;
          background: var(--bg-hover) !important;
          color: var(--text-primary) !important;
        }

        .playlist-detail-page .playlist-detail-top-actions > button:last-child svg {
          width: 14px;
          height: 14px;
        }

        .playlist-detail-page .playlist-detail-hero,
        .playlist-detail-page .playlist-detail-quick-row,
        .playlist-detail-page .playlist-detail-section,
        .playlist-detail-page .playlist-detail-shell > .playlist-detail-empty,
        .playlist-detail-page .playlist-detail-shell > div:has(> footer) {
          grid-column: 1 / -1;
        }

        .playlist-detail-page .playlist-detail-hero,
        .playlist-detail-page .playlist-detail-shell > .playlist-detail-empty {
          grid-row: 2;
        }

        .playlist-detail-page .playlist-detail-cover {
          border-radius: 0 !important;
        }

        .playlist-detail-page .playlist-detail-quick-row,
        .playlist-detail-page .playlist-detail-section {
          margin-right: 0 !important;
          margin-left: 0 !important;
        }

        .playlist-detail-page .playlist-detail-quick-row {
          padding-right: 0 !important;
          padding-left: 0 !important;
        }

        .playlist-detail-page .playlist-detail-section > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .playlist-detail-page .playlist-detail-section .filmwave-song-card {
          --filmwave-song-card-padding-y: 12px !important;
          --filmwave-song-card-padding-left: 12px !important;
          --filmwave-song-card-padding-right: 16px !important;
          --filmwave-song-card-hover-bg: var(--bg-hover);
          border-bottom: 0 !important;
          border-radius: 0 !important;
          padding: 12px 16px 12px 12px !important;
        }

        .playlist-detail-page .playlist-detail-shell > div:has(> footer) {
          margin-right: calc(32px - var(--playlist-detail-page-gutter)) !important;
          margin-left: calc(32px - var(--playlist-detail-page-gutter)) !important;
          padding-top: 64px !important;
        }

        .playlist-detail-page .playlist-detail-actions > button,
        .playlist-detail-page .playlist-detail-skeleton-button {
          border-radius: 0 !important;
        }

        @media (max-width: 760px) {
          .playlist-detail-page .playlist-detail-shell {
            grid-template-columns: minmax(0, 1fr) 42px;
            row-gap: 12px;
          }

          .playlist-detail-page .playlist-detail-top-actions > button:first-child {
            grid-column: 1 / -1;
            grid-row: 1;
            justify-self: start;
          }

          .playlist-detail-page .playlist-detail-search-sticky {
            grid-column: 1;
            grid-row: 2;
            width: 100%;
          }

          .playlist-detail-page .playlist-detail-top-actions > button:last-child {
            grid-column: 2;
            grid-row: 2;
          }

          .playlist-detail-page .playlist-detail-hero,
          .playlist-detail-page .playlist-detail-shell > .playlist-detail-empty {
            grid-row: 3;
          }
        }

        @media (max-width: 720px) {
          body:has(.playlists-page) {
            --playlists-content-gutter: 20px;
          }

          body:has(.playlist-detail-page) {
            --playlist-detail-page-gutter: 20px;
          }

          .playlist-detail-page .playlist-detail-shell > div:has(> footer) {
            margin-right: 12px !important;
            margin-left: 12px !important;
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
