import type { ReactNode } from "react";
import PlaylistDetailBackButton from "./PlaylistDetailBackButton";
import PlaylistTopControls from "./PlaylistTopControls";
import "./playlists-tabs-rail.css";

export default function PlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="playlists-route-shell">
      <PlaylistDetailBackButton />
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
          --playlist-detail-featured-card-gap: clamp(10px, 1.25vw, 18px);
          --playlist-detail-featured-hero-height: clamp(500px, 69vh, 760px);
          --playlist-detail-featured-padding-top: calc(
            var(--filmwave-header-height, 75px) + 86px
          );
          --playlist-detail-featured-padding-bottom: 76px;
          --playlist-detail-featured-cover-size: calc(
            (
                100vw - var(--playlist-detail-page-gutter) -
                  var(--playlist-detail-page-gutter) -
                  var(--playlist-detail-featured-card-gap) -
                  var(--playlist-detail-featured-card-gap) -
                  var(--playlist-detail-featured-card-gap) -
                  var(--playlist-detail-featured-card-gap)
              ) /
              5
          );
          --playlist-detail-featured-content-top: calc(
            var(--playlist-detail-featured-padding-top) +
              (
                  var(--playlist-detail-featured-hero-height) -
                    var(--playlist-detail-featured-padding-top) -
                    var(--playlist-detail-featured-padding-bottom) -
                    var(--playlist-detail-featured-cover-size)
                ) /
                2
          );
          --playlist-detail-featured-flow-top: 162px;
          --playlist-detail-featured-offset: max(
            0px,
            calc(
              var(--playlist-detail-featured-content-top) -
                var(--playlist-detail-featured-flow-top)
            )
          );
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
          grid-template-columns: minmax(0, 1fr) 42px;
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
          display: none !important;
        }

        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell) {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }

        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell)
          .playlist-detail-kicker {
          grid-column: 1;
          grid-row: 1;
        }

        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell)
          .playlist-detail-title,
        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell)
          .playlist-detail-rename-shell {
          grid-column: 1;
          grid-row: 2;
        }

        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell)
          .playlist-detail-title {
          display: block !important;
          visibility: hidden !important;
        }

        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell)
          .playlist-detail-rename-shell {
          order: 0 !important;
          box-sizing: border-box;
          width: min(640px, 100%) !important;
          max-width: 640px !important;
          height: 52.64px !important;
          min-height: 52.64px !important;
          margin-top: 8px !important;
        }

        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell)
          .playlist-detail-rename-input {
          width: 100% !important;
          height: 52.64px !important;
          min-height: 52.64px !important;
          font-size: 56px !important;
          font-weight: 500 !important;
          letter-spacing: -0.055em !important;
          line-height: 0.94 !important;
        }

        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell)
          .playlist-detail-meta {
          grid-column: 1;
          grid-row: 3;
        }

        .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0:has(.playlist-detail-rename-shell)
          .playlist-detail-actions {
          grid-column: 1;
          grid-row: 4;
        }

        .playlist-detail-page .playlist-detail-search-sticky {
          position: static !important;
          top: auto !important;
          z-index: auto !important;
          grid-column: 1;
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
          grid-column: 2;
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

        .playlist-detail-page .playlist-detail-browser-back {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 3;
          display: inline-flex;
          box-sizing: border-box;
          min-width: 82px;
          height: 42px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: 0;
          background: var(--bg-secondary);
        }
      `}</style>
      {children}
    </div>
  );
}
