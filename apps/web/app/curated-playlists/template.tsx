import type { ReactNode } from "react";
import "../discover/discover-reference-layout.css";

const CURATED_LANDING_CARD_RATIO_STYLE = `
  body:has(.curated-playlists-page-root) {
    --curated-feature-hero-height: clamp(280px, 29.5vw, 420px);
    --curated-feature-title-thumbnail-size: calc(
      25.675px + clamp(29.4px, 3.136vw, 47.04px)
    );

    /* Loading skeleton sizing mirrors the shared CuratedPlaylistShelf. */
    --curated-landing-card-gap: 12px;
    --curated-landing-content-width: min(
      calc(
        100vw - var(--curated-feature-edge) - var(--curated-feature-edge)
      ),
      var(--discover-editorial-width, 1280px)
    );
    --curated-landing-card-width: calc(
      (
          var(--curated-landing-content-width) -
            var(--curated-landing-card-gap) -
            var(--curated-landing-card-gap)
        ) /
        3
    );
    --curated-landing-edge-inset: var(--curated-feature-edge);
  }

  body:has(.curated-playlists-page-root) .curated-feature-hero {
    height: var(--curated-feature-hero-height);
    min-height: var(--curated-feature-hero-height);
    max-height: var(--curated-feature-hero-height);
  }

  body:has(.curated-playlists-page-root) .curated-playlists-page-layer {
    padding-bottom: 0;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlists-page-layer
    > div
    > section[aria-labelledby="curated-page-heading"] {
    width: min(
      calc(
        100% - var(--filmwave-editorial-inner-inset) -
          var(--filmwave-editorial-inner-inset)
      ),
      var(--filmwave-editorial-max-width)
    );
    margin-right: auto;
    margin-left: auto;
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero-title-block:has(.curated-feature-hero-title-thumbnail) {
    padding-left: calc(var(--curated-feature-title-thumbnail-size) + 14px);
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero-title-thumbnail {
    position: absolute;
    top: 0;
    left: 0;
    width: var(--curated-feature-title-thumbnail-size);
    height: var(--curated-feature-title-thumbnail-size);
    overflow: hidden;
    border-radius: 0;
    background: rgba(255, 255, 255, 0.12);
  }

  body:has(.curated-playlists-page-root)
    .curated-feature-hero-title-thumbnail
    img {
    object-fit: cover;
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
    .curated-feature-hero-title-block
    > span {
    margin-left: 3px;
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
    margin-top: 0;
    margin-left: calc(50% - 50vw + var(--curated-feature-edge));
  }

  body:has(.curated-playlists-page-root) .curated-feature-filter-pill {
    display: inline-flex;
    min-width: 0;
    height: 45px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--filmwave-browse-filter-border-color);
    border-radius: 7px;
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
    padding-top: 75px;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-shelf > .relative > .flex {
    gap: var(--curated-landing-card-gap) !important;
    padding-right: var(--curated-landing-edge-inset) !important;
    padding-left: var(--curated-landing-edge-inset) !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-skeleton-card-shell {
    width: var(--curated-landing-card-width) !important;
    flex: 0 0 var(--curated-landing-card-width) !important;
  }

  body:has(.curated-playlists-page-root) div[id^="curated-group-"] {
    margin-top: 75px;
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
    body:has(.curated-playlists-page-root) .curated-page-filter-row {
      width: calc(
        100% + var(--curated-page-gutter) + var(--curated-page-gutter)
      );
      margin-right: calc(0px - var(--curated-page-gutter));
      margin-left: calc(0px - var(--curated-page-gutter));
    }

    body:has(.curated-playlists-page-root) .curated-feature-filters {
      display: flex;
      box-sizing: border-box;
      width: 100%;
      flex: 0 0 100%;
      margin-left: 0;
      overflow-x: auto;
      overflow-y: hidden;
      padding-right: var(--curated-page-gutter);
      padding-left: var(--curated-page-gutter);
      overscroll-behavior-x: contain;
      scroll-padding-right: var(--curated-page-gutter);
      scroll-padding-left: var(--curated-page-gutter);
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
    </>
  );
}
