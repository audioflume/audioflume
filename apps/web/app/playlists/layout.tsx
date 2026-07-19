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
          padding: 0 14px;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 12px;
          font-weight: 400;
          line-height: 1;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .playlist-detail-page .playlist-detail-browser-back:hover {
          border-color: var(--border-hover);
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .playlist-detail-page .playlist-detail-browser-back svg {
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

        .playlist-detail-page .playlist-detail-hero {
          position: relative;
          display: flex !important;
          min-height: 0;
          align-items: center !important;
          gap: clamp(24px, 2.8vw, 46px) !important;
          margin-top: 0;
          overflow: visible;
          background: transparent;
          color: var(--text-primary);
          padding:
            var(--playlist-detail-featured-offset)
            0
            30px !important;
        }

        .playlist-detail-page .playlist-detail-cover {
          position: relative;
          z-index: 1;
          display: block !important;
          width: var(--playlist-detail-featured-cover-size) !important;
          height: var(--playlist-detail-featured-cover-size) !important;
          min-height: 0 !important;
          flex: 0 0 var(--playlist-detail-featured-cover-size);
          overflow: hidden;
          border-radius: 0 !important;
          background: var(--bg-secondary);
        }

        .playlist-detail-page .playlist-detail-cover::after {
          display: none !important;
        }

        .playlist-detail-page .playlist-detail-hero > .min-w-0 {
          position: relative;
          z-index: 1;
          display: flex;
          min-width: 0;
          max-width: 520px;
          flex: 1 1 auto;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          transform: translateY(-4px);
        }

        .playlist-detail-page .playlist-detail-kicker {
          display: none !important;
        }

        .playlist-detail-page .playlist-detail-title {
          max-width: 480px !important;
          margin: 0 !important;
          color: var(--text-primary) !important;
          font-family: var(--font-instrument-sans), var(--font-satoshi), sans-serif !important;
          font-size: clamp(22px, 2vw, 32px) !important;
          font-weight: 400 !important;
          letter-spacing: -0.055em !important;
          line-height: 0.98 !important;
        }

        .playlists-route-shell
          .playlist-detail-page:has(.playlist-detail-rename-shell)
          .playlist-detail-title {
          display: block !important;
          visibility: hidden !important;
        }

        .playlists-route-shell
          .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0
          .playlist-detail-rename-shell {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 2;
          order: 0 !important;
          box-sizing: border-box;
          width: min(480px, 100%) !important;
          max-width: 480px !important;
          margin: 0 !important;
        }

        .playlists-route-shell
          .playlist-detail-page
          .playlist-detail-hero
          > .min-w-0
          .playlist-detail-rename-input {
          -webkit-appearance: none !important;
          appearance: none !important;
          display: block !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 0 !important;
          border: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          outline: 0 !important;
          color: var(--text-primary) !important;
          font-family: var(--font-instrument-sans), var(--font-satoshi), sans-serif !important;
          font-size: clamp(22px, 2vw, 32px) !important;
          font-weight: 400 !important;
          letter-spacing: -0.055em !important;
          line-height: 0.98 !important;
          vertical-align: top !important;
          transform: translateY(-1px);
        }

        .playlist-detail-page .playlist-detail-meta {
          margin-top: 16px !important;
          gap: 8px !important;
          color: var(--text-secondary) !important;
          font-size: 11.5px !important;
          font-weight: 400;
          line-height: 1.4;
        }

        .playlist-detail-page .playlist-detail-dot {
          color: var(--text-muted) !important;
        }

        .playlist-detail-page .playlist-detail-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px !important;
        }

        .playlist-detail-page .playlist-detail-actions > button {
          display: inline-flex !important;
          height: 36px !important;
          min-width: 170px;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          border-radius: 0 !important;
          padding: 0 20px !important;
          font-family: inherit;
          font-size: 11px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
        }

        .playlist-detail-page .playlist-detail-skeleton-button {
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

        @media (max-width: 1280px) {
          body:has(.playlist-detail-page) {
            --playlist-detail-featured-cover-size: calc(
              (
                  100vw - var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-featured-card-gap) -
                    var(--playlist-detail-featured-card-gap) -
                    var(--playlist-detail-featured-card-gap)
                ) /
                4
            );
          }
        }

        @media (max-width: 1080px) {
          .playlist-detail-page .playlist-detail-hero {
            gap: 24px !important;
          }
        }

        @media (max-width: 980px) {
          body:has(.playlist-detail-page) {
            --playlist-detail-featured-cover-size: calc(
              (
                  100vw - var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-featured-card-gap) -
                    var(--playlist-detail-featured-card-gap)
                ) /
                3
            );
            --playlist-detail-featured-hero-height: 590px;
          }
        }

        @media (max-width: 760px) {
          body:has(.playlist-detail-page) {
            --playlist-detail-featured-flow-top: 174px;
          }

          .playlist-detail-page .playlist-detail-shell {
            grid-template-columns: minmax(0, 1fr) 42px;
            row-gap: 12px;
          }

          .playlist-detail-page .playlist-detail-search-sticky {
            grid-column: 1;
            grid-row: 1;
            width: 100%;
          }

          .playlist-detail-page .playlist-detail-top-actions > button:last-child {
            grid-column: 2;
            grid-row: 1;
          }

          .playlist-detail-page .playlist-detail-hero,
          .playlist-detail-page .playlist-detail-shell > .playlist-detail-empty {
            grid-row: 2;
          }

          .playlist-detail-page .playlist-detail-actions {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 720px) {
          body:has(.playlists-page) {
            --playlists-content-gutter: 20px;
          }

          body:has(.playlist-detail-page) {
            --playlist-detail-page-gutter: 20px;
            --playlist-detail-featured-cover-size: calc(
              (
                  100vw - var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-featured-card-gap)
                ) /
                2
            );
            --playlist-detail-featured-padding-top: calc(
              var(--filmwave-header-height, 75px) + 78px
            );
            --playlist-detail-featured-padding-bottom: 64px;
          }

          .playlist-detail-page .playlist-detail-title {
            font-size: 26px !important;
          }

          .playlists-route-shell
            .playlist-detail-page
            .playlist-detail-hero
            > .min-w-0
            .playlist-detail-rename-input {
            font-size: 26px !important;
          }

          .playlist-detail-page .playlist-detail-actions > button {
            min-width: 160px;
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

          .playlist-detail-page .playlist-detail-actions {
            width: 100%;
          }

          .playlist-detail-page .playlist-detail-actions > button {
            min-width: 0;
            flex: 1 1 0;
          }
        }

        @media (max-width: 560px) {
          body:has(.playlist-detail-page) {
            --playlist-detail-featured-padding-top: calc(
              var(--filmwave-header-height, 75px) + 86px
            );
            --playlist-detail-featured-content-top:
              var(--playlist-detail-featured-padding-top);
          }

          .playlist-detail-page .playlist-detail-hero {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 22px !important;
          }

          .playlist-detail-page .playlist-detail-hero > .min-w-0 {
            width: 100%;
            max-width: none;
            transform: none;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
