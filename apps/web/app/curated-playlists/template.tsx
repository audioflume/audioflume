import type { ReactNode } from "react";
import CuratedOutroMount from "./CuratedOutroMount";
import "../discover/discover-reference-layout.css";

const CURATED_LANDING_CARD_RATIO_STYLE = `
  body:has(.curated-playlists-page-root) {
    --curated-feature-edge: 34px;
    --curated-feature-hero-height: clamp(280px, 29.5vw, 420px);
    --curated-landing-card-gap: 12px;
    --curated-landing-content-width: min(
      calc(
        100vw - var(--curated-page-gutter) - var(--curated-page-gutter)
      ),
      1280px
    );
    --curated-landing-card-width: calc(
      (
          var(--curated-landing-content-width) -
            var(--curated-landing-card-gap) -
            var(--curated-landing-card-gap)
        ) /
        3
    );
    --curated-landing-edge-inset: max(
      var(--curated-page-gutter),
      calc((100vw - 1280px) / 2)
    );
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero {
    height: var(--curated-feature-hero-height);
    min-height: var(--curated-feature-hero-height);
    max-height: var(--curated-feature-hero-height);
  }

  body:has(.curated-playlists-page-root) .curated-playlists-page-layer {
    padding-top: calc(var(--filmwave-header-height, 75px) + 24px) !important;
    padding-bottom: 0;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero-title-block
    > span,
  body:has(.curated-playlists-page-root)
    .curated-feature-hero-play-copy
    span {
    font-size: 11.5px !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
    line-height: 1.45 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero-play-copy
    strong {
    font-family: var(--discover-playlist-card-title-font-family, inherit) !important;
    font-size: var(--discover-playlist-card-title-font-size, 16.5px) !important;
    font-weight: 400 !important;
    letter-spacing: var(--discover-playlist-card-title-letter-spacing, normal) !important;
    line-height: var(--discover-playlist-card-title-line-height, 1.25) !important;
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero-play-row {
    gap: 14px;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero-play-button.curated-playlist-play-button {
    width: 38px !important;
    min-width: 38px !important;
    height: 38px !important;
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero-tags {
    margin-top: 20px;
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero-tags span {
    min-height: 22px;
    padding-right: 10px;
    padding-left: 10px;
    font-size: 11.5px !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
    line-height: 1.45 !important;
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero-indicators {
    gap: 6px;
    margin-top: 40px;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero-indicators
    button {
    width: 40px;
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero-open {
    top: 16px !important;
    right: 16px !important;
    width: 32px !important;
    height: 32px !important;
    border-radius: 999px !important;
    background: rgba(255, 255, 255, 0.12) !important;
    color: transparent !important;
    -webkit-backdrop-filter: blur(12px) !important;
    backdrop-filter: blur(12px) !important;
    transform: none !important;
    transition: background-color 150ms ease !important;
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero-open::after {
    content: "";
    position: absolute;
    top: 9.5px;
    left: 9.5px;
    width: 13px;
    height: 13px;
    background: #fff;
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M7 17L17 7' stroke='black' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M9 7H17V15' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    -webkit-mask-position: center;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M7 17L17 7' stroke='black' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M9 7H17V15' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: contain;
    transition: background-color 150ms ease;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero:hover
    .curated-feature-hero-open,
  body:has(.curated-playlists-page-root)
    .curated-feature-hero:focus-within
    .curated-feature-hero-open {
    background: #fff !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero:hover
    .curated-feature-hero-open::after,
  body:has(.curated-playlists-page-root)
    .curated-feature-hero:focus-within
    .curated-feature-hero-open::after {
    background: #000;
  }

  body:has(.curated-playlists-page-root) .curated-feature-filters {
    display: grid;
    width: calc(
      100vw - var(--curated-feature-edge) - var(--curated-feature-edge)
    );
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 8px;
    margin-top: 16px;
    margin-left: calc(50% - 50vw + var(--curated-feature-edge));
  }

  body:has(.curated-playlists-page-root) .curated-feature-filter-pill {
    display: inline-flex;
    min-width: 0;
    height: 30px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--text-primary);
    padding: 0 10px;
    font-size: 11.5px;
    font-weight: 400;
    line-height: 1.45;
    text-decoration: none;
    white-space: nowrap;
    transition:
      border-color 150ms ease,
      background-color 150ms ease;
  }

  body:has(.curated-playlists-page-root) .curated-feature-filter-pill:hover,
  body:has(.curated-playlists-page-root) .curated-feature-filter-pill:focus-visible {
    border-color: var(--text-muted);
    background: var(--bg-secondary);
    outline: none;
  }

  body:has(.curated-playlists-page-root) .curated-feature-filter-pill svg {
    width: 13px;
    min-width: 13px;
    height: 13px;
    color: var(--text-secondary);
  }

  body:has(.curated-playlists-page-root) .curated-feature-filter-pill span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlists-page-root
    > footer {
    box-sizing: border-box;
    padding-top: 40px;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf {
    width: min(100%, 1280px);
    margin-right: auto;
    margin-bottom: 0;
    margin-left: auto;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-viewport {
    width: 100vw;
    margin-right: calc(50% - 50vw) !important;
    margin-left: calc(50% - 50vw) !important;
    overflow: hidden;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-scroller,
  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-shelf > .relative > .flex {
    gap: var(--curated-landing-card-gap) !important;
    padding-right: var(--curated-landing-edge-inset) !important;
    padding-left: var(--curated-landing-edge-inset) !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-shell,
  body:has(.curated-playlists-page-root) .curated-playlist-skeleton-card-shell {
    width: var(--curated-landing-card-width) !important;
    flex: 0 0 var(--curated-landing-card-width) !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-prev-floating,
  body:has(.curated-playlists-page-root) .curated-playlist-shelf-next-floating {
    top: 50% !important;
  }

  body:has(.curated-playlists-page-root) div[id^="curated-group-"] {
    margin-top: 100px;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-filters
    + div[id^="curated-group-"] {
    margin-top: 75px;
  }

  body:has(.curated-playlists-page-root) div[id^="curated-group-"] > div {
    margin-top: 0 !important;
  }

  @media (max-width: 1040px) {
    body:has(.curated-playlists-page-root) .curated-feature-filters {
      display: flex;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
    }

    body:has(.curated-playlists-page-root) .curated-feature-filters::-webkit-scrollbar {
      display: none;
    }

    body:has(.curated-playlists-page-root) .curated-feature-filter-pill {
      min-width: 132px;
      flex: 0 0 132px;
    }
  }

  @media (max-width: 900px) {
    body:has(.curated-playlists-page-root) {
      --curated-landing-card-width: calc(
        (
            var(--curated-landing-content-width) -
              var(--curated-landing-card-gap)
          ) /
          2
      );
    }
  }

  @media (max-width: 760px) {
    body:has(.curated-playlists-page-root) {
      --curated-feature-edge: 18px;
    }
  }

  @media (max-width: 620px) {
    body:has(.curated-playlists-page-root) {
      --curated-feature-hero-height: 330px;
    }

    body:has(.curated-playlists-page-root) .curated-playlists-page-layer {
      padding-top: calc(var(--filmwave-header-height, 75px) + 24px) !important;
    }
  }

  @media (max-width: 560px) {
    body:has(.curated-playlists-page-root) {
      --curated-feature-hero-height: 320px;
      --curated-landing-card-width: var(--curated-landing-content-width);
    }
  }
`;

export default function CuratedPlaylistsTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style>{CURATED_LANDING_CARD_RATIO_STYLE}</style>
      {children}
      <CuratedOutroMount />
    </>
  );
}
