import type { ReactNode } from "react";
import CuratedOutroMount from "./CuratedOutroMount";
import "../discover/discover-reference-layout.css";

const CURATED_LANDING_CARD_RATIO_STYLE = `
  body:has(.curated-playlists-page-root) {
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
    padding-top: calc(var(--filmwave-header-height, 75px) + 20px) !important;
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
    font-size: 13.5px !important;
    font-weight: 500 !important;
    letter-spacing: 0 !important;
    line-height: 1.25 !important;
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero-tags {
    margin-top: 12px;
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
    gap: 7px;
    margin-top: 30px;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero-indicators
    button {
    width: 36px;
  }

  body:has(.curated-playlists-page-root) .curated-feature-filters {
    display: grid;
    width: calc(
      100vw - var(--curated-feature-edge) - var(--curated-feature-edge)
    );
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
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

  body:has(.curated-playlists-page-root)
    .curated-feature-filters
    + div[id^="curated-group-"]
    > .curated-playlist-shelf,
  body:has(.curated-playlists-page-root)
    div[id^="curated-group-"]
    + div[id^="curated-group-"]
    > .curated-playlist-shelf {
    margin-top: clamp(64px, 6vw, 96px) !important;
  }

  body:has(.curated-playlists-page-root)
    div[id^="curated-group-"]:last-of-type
    > .curated-playlist-shelf {
    margin-bottom: 0 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card {
    position: relative;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-image,
  body:has(.curated-playlists-page-root) .curated-playlist-skeleton-card {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 16 / 9 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-details,
  body:has(.curated-playlists-page-root) .curated-playlist-card-copy {
    display: contents !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-copy h3 {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 4;
    display: flex;
    width: 100%;
    aspect-ratio: 16 / 9;
    align-items: center;
    justify-content: center;
    margin: 0 !important;
    overflow: visible !important;
    padding: 20px;
    color: #fff !important;
    font-family: var(--font-roboto-mono-filmwave), monospace !important;
    font-size: clamp(14px, 1vw, 18px) !important;
    font-weight: 400 !important;
    font-kerning: normal !important;
    letter-spacing: 0 !important;
    line-height: 1.05 !important;
    text-align: center;
    text-overflow: clip !important;
    text-transform: uppercase !important;
    white-space: normal !important;
    pointer-events: none;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-copy p {
    display: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-menu-wrap {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 6;
    margin: 0 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-menu-button {
    color: #fff !important;
    opacity: 0 !important;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
    transition: opacity 150ms ease, color 150ms ease !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-card:hover
    .curated-playlist-menu-button,
  body:has(.curated-playlists-page-root)
    .curated-playlist-card:focus-within
    .curated-playlist-menu-button,
  body:has(.curated-playlists-page-root)
    .curated-playlist-card.is-menu-open
    .curated-playlist-menu-button {
    opacity: 1 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-heading p {
    display: block !important;
    visibility: visible !important;
    max-width: 620px;
    margin: 9px 0 0 !important;
    color: var(--text-muted) !important;
    font-family: var(--font-roboto-mono-filmwave), monospace !important;
    font-size: clamp(9px, 0.65vw, 11px) !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
    line-height: 1.55 !important;
    text-transform: uppercase !important;
    opacity: 1 !important;
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

  @media (max-width: 620px) {
    body:has(.curated-playlists-page-root) {
      --curated-feature-hero-height: 330px;
    }

    body:has(.curated-playlists-page-root) .curated-playlists-page-layer {
      padding-top: calc(var(--filmwave-header-height, 75px) + 14px) !important;
    }

    body:has(.curated-playlists-page-root)
      .curated-feature-filters
      + div[id^="curated-group-"]
      > .curated-playlist-shelf,
    body:has(.curated-playlists-page-root)
      div[id^="curated-group-"]
      + div[id^="curated-group-"]
      > .curated-playlist-shelf {
      margin-top: 52px !important;
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
