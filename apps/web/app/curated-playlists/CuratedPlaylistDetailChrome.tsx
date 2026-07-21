"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5L8 12L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CuratedPlaylistDetailChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const isCuratedPlaylistDetail = /^\/curated-playlists\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (!isCuratedPlaylistDetail) {
      setTarget(null);
      return;
    }

    const updateTarget = () => {
      const nextTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-shell",
      );
      setTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      );
    };

    updateTarget();

    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isCuratedPlaylistDetail]);

  if (!isCuratedPlaylistDetail || !target) return null;

  return createPortal(
    <>
      <style>{`
        body:has(.playlist-detail-page) {
          --playlist-detail-page-gutter: clamp(28px, 5.2vw, 82px);
          --playlist-detail-control-inset-left: var(--fw-music-content-inset-left, 28px);
          --playlist-detail-control-inset-right: var(--fw-music-content-inset-right, 20px);
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

        .playlist-detail-page .playlist-detail-shell {
          display: grid !important;
          grid-template-columns: 82px minmax(0, 1fr) !important;
          column-gap: 18px !important;
          align-items: center !important;
          padding-top: 22px !important;
          padding-right: var(--playlist-detail-control-inset-right) !important;
          padding-left: var(--playlist-detail-control-inset-left) !important;
        }

        .playlist-detail-page .playlist-detail-top-actions {
          display: contents !important;
        }

        .playlist-detail-page .playlist-detail-top-actions > button:first-child {
          display: none !important;
        }

        .playlist-detail-page .playlist-detail-browser-back {
          position: static !important;
          top: auto !important;
          right: auto !important;
          left: auto !important;
          z-index: auto !important;
          display: inline-flex !important;
          box-sizing: border-box;
          grid-column: 1 !important;
          grid-row: 1 !important;
          width: 82px !important;
          min-width: 82px !important;
          height: 42px !important;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          justify-self: start;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: 0;
          background: var(--bg-secondary);
          margin: 0 !important;
          padding: 0 14px !important;
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

        .playlist-detail-page .playlist-detail-search-sticky {
          position: static !important;
          top: auto !important;
          z-index: auto !important;
          grid-column: 2 !important;
          grid-row: 1 !important;
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

        .playlist-detail-page .playlist-detail-hero,
        .playlist-detail-page .playlist-detail-quick-row,
        .playlist-detail-page .playlist-detail-section,
        .playlist-detail-page .playlist-detail-shell > .playlist-detail-empty {
          margin-left: calc(
            var(--playlist-detail-page-gutter) -
              var(--playlist-detail-control-inset-left)
          ) !important;
          margin-right: calc(
            var(--playlist-detail-page-gutter) -
              var(--playlist-detail-control-inset-right)
          ) !important;
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
          font-family: var(--font-aktiv-grotesk), var(--font-aktiv-grotesk), sans-serif !important;
          font-size: clamp(22px, 2vw, 32px) !important;
          font-weight: 400 !important;
          letter-spacing: -0.055em !important;
          line-height: 0.98 !important;
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
          margin-left: calc(
            32px - var(--playlist-detail-control-inset-left)
          ) !important;
          margin-right: calc(
            32px - var(--playlist-detail-control-inset-right)
          ) !important;
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

          .playlist-detail-page .playlist-detail-actions {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 720px) {
          body:has(.playlist-detail-page) {
            --playlist-detail-page-gutter: 20px;
            --playlist-detail-control-inset-left: 20px;
            --playlist-detail-control-inset-right: 20px;
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

          .playlist-detail-page .playlist-detail-actions > button {
            min-width: 160px;
          }

          .playlist-detail-page .playlist-detail-shell > div:has(> footer) {
            margin-left: 12px !important;
            margin-right: 12px !important;
          }
        }

        @media (max-width: 640px) {
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

      <button
        type="button"
        className="playlist-detail-browser-back"
        onClick={() => router.back()}
        aria-label="Go back to the previous page"
      >
        <BackIcon />
        <span>Back</span>
      </button>
    </>,
    target,
  );
}
