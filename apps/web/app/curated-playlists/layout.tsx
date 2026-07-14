import type { ReactNode } from "react";
import CuratedHeaderScrollState from "./CuratedHeaderScrollState";
import "./curated-playlists.css";

const CURATED_FEATURED_STYLE = `
  body:has(.curated-playlists-page-root) {
    --curated-featured-hero-height: clamp(590px, 72vh, 780px);
    --curated-featured-track-card-height: 64px;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist {
    display: block !important;
    min-height: var(--curated-featured-hero-height) !important;
    grid-template-columns: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.42) 0%,
        rgba(0, 0, 0, 0.04) 34%,
        rgba(0, 0, 0, 0.72) 100%
      ),
      linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.62) 0%,
        rgba(0, 0, 0, 0.22) 44%,
        rgba(0, 0, 0, 0.32) 100%
      ) !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-content {
    position: absolute !important;
    right: auto !important;
    bottom: 90px !important;
    left: var(--curated-page-gutter) !important;
    display: grid !important;
    width: min(520px, 39vw) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    grid-template-columns: 112px minmax(0, 1fr) !important;
    align-items: end !important;
    gap: 22px !important;
    padding: 0 !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-cover-link {
    width: 112px !important;
    height: 112px !important;
    flex: 0 0 112px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    background: #101112 !important;
    box-shadow: 0 20px 54px rgba(0, 0, 0, 0.3) !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-copy {
    max-width: none !important;
    justify-content: flex-end !important;
    transform: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-copy::before {
    content: none !important;
    display: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-copy::after {
    order: 3 !important;
    max-width: 420px !important;
    margin-top: 8px !important;
    color: rgba(255, 255, 255, 0.68) !important;
    font-size: 10.5px !important;
    line-height: 1.45 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-copy:has(.curated-featured-playlist-description)::after {
    content: none !important;
    display: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-kicker {
    order: 0 !important;
    margin: 0 0 9px !important;
    color: rgba(255, 255, 255, 0.76) !important;
    font-size: 10px !important;
    font-weight: 500 !important;
    letter-spacing: 0.08em !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-title {
    order: 1 !important;
    max-width: 430px !important;
    margin: 0 !important;
    font-size: clamp(22px, 2vw, 32px) !important;
    line-height: 1.02 !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-description {
    order: 3 !important;
    display: block !important;
    max-width: 420px !important;
    margin: 8px 0 0 !important;
    color: rgba(255, 255, 255, 0.68) !important;
    font-size: 10.5px !important;
    line-height: 1.45 !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-button {
    order: 4 !important;
    width: fit-content !important;
    min-width: 0 !important;
    height: 34px !important;
    margin-top: 18px !important;
    border: 1px solid rgba(255, 255, 255, 0.56) !important;
    background: transparent !important;
    color: #fff !important;
    padding: 0 16px !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-button:hover,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-button:focus-visible {
    border-color: #fff !important;
    background: #fff !important;
    color: #111 !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-tracks,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-tracks {
    position: absolute !important;
    right: var(--curated-page-gutter) !important;
    bottom: 90px !important;
    left: auto !important;
    z-index: 3 !important;
    display: block !important;
    width: min(620px, 44vw) !important;
    max-height: none !important;
    overflow: visible !important;
    background: transparent !important;
    background-color: transparent !important;
    padding: 0 !important;
    translate: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-track-list,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-tracks {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-track-skeleton,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-row {
    box-sizing: border-box !important;
    height: var(--curated-featured-track-card-height) !important;
    min-height: var(--curated-featured-track-card-height) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: #101112 !important;
    background-color: #101112 !important;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22) !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article {
    gap: 10px !important;
    padding: 10px 12px !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover,
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible {
    border-color: rgba(255, 255, 255, 0.18) !important;
    background: #171819 !important;
    background-color: #171819 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:nth-child(5),
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading-tracks
    > :nth-child(5) {
    grid-column: 1 / -1 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article
    > div:first-of-type {
    width: 42px !important;
    height: 42px !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article
    > button {
    width: 34px !important;
    height: 34px !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article
    h3 {
    font-size: 12px !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article
    h3
    + div {
    margin-top: 5px !important;
    font-size: 9px !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-empty-tracks {
    min-height: calc(
      var(--curated-featured-track-card-height) +
        var(--curated-featured-track-card-height) +
        var(--curated-featured-track-card-height) + 16px
    ) !important;
    grid-column: 1 / -1 !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: #101112 !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-next-button {
    top: auto !important;
    right: calc(var(--curated-page-gutter) - 46px) !important;
    bottom: calc(90px + 104px - 18px) !important;
    transform: none !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    background: rgba(16, 17, 18, 0.88) !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-next-button:hover {
    border-color: rgba(255, 255, 255, 0.34) !important;
    background: #101112 !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-count {
    right: var(--curated-page-gutter) !important;
    bottom: 46px !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-indicators {
    right: var(--curated-page-gutter) !important;
    bottom: 18px !important;
    left: var(--curated-page-gutter) !important;
  }

  body:has(.curated-playlists-page-root) .filmwave-playlists-mega-menu {
    padding-bottom: 6px !important;
  }

  body:has(.curated-playlists-page-root)
    .filmwave-header
    .filmwave-header-actions
    .filmwave-header-nav
    .filmwave-header-nav-link:hover,
  body:has(.curated-playlists-page-root)
    .filmwave-header
    .filmwave-header-actions
    .filmwave-header-nav
    .filmwave-header-nav-link.is-active {
    background: transparent !important;
    background-color: transparent !important;
  }

  @media (max-width: 1180px) {
    body:has(.curated-playlists-page-root) .curated-featured-playlist-content {
      width: 38vw !important;
      grid-template-columns: 96px minmax(0, 1fr) !important;
      gap: 18px !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-cover-link {
      width: 96px !important;
      height: 96px !important;
      flex-basis: 96px !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-tracks,
    body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-tracks {
      width: 48vw !important;
    }
  }

  @media (max-width: 980px) {
    body:has(.curated-playlists-page-root) {
      --curated-featured-hero-height: 830px;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-content {
      top: calc(var(--filmwave-header-height, 75px) + 96px) !important;
      right: var(--curated-page-gutter) !important;
      bottom: auto !important;
      width: auto !important;
      grid-template-columns: 108px minmax(0, 520px) !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-cover-link {
      width: 108px !important;
      height: 108px !important;
      flex-basis: 108px !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-tracks,
    body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-tracks {
      right: var(--curated-page-gutter) !important;
      bottom: 86px !important;
      left: var(--curated-page-gutter) !important;
      width: auto !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-next-button {
      right: calc(var(--curated-page-gutter) - 46px) !important;
      bottom: calc(86px + 104px - 18px) !important;
    }
  }

  @media (max-width: 720px) {
    body:has(.curated-playlists-page-root) {
      --curated-featured-hero-height: 850px;
      --curated-featured-track-card-height: 58px;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-heading {
      top: calc(var(--filmwave-header-height, 75px) + 24px) !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-content {
      top: calc(var(--filmwave-header-height, 75px) + 82px) !important;
      grid-template-columns: 84px minmax(0, 1fr) !important;
      gap: 16px !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-cover-link {
      width: 84px !important;
      height: 84px !important;
      flex-basis: 84px !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-title {
      font-size: 26px !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-track-list,
    body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-tracks {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 6px !important;
    }

    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-track-list
      > article:nth-child(5),
    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-tracks
      > :nth-child(5) {
      grid-column: auto !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-tracks,
    body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-tracks {
      bottom: 66px !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-next-button {
      top: calc(var(--filmwave-header-height, 75px) + 82px) !important;
      right: var(--curated-page-gutter) !important;
      bottom: auto !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-count {
      bottom: 39px !important;
    }

    body:has(.curated-playlists-page-root) .curated-featured-playlist-indicators {
      bottom: 14px !important;
    }
  }
`;

export default function CuratedPlaylistsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style>{CURATED_FEATURED_STYLE}</style>
      <CuratedHeaderScrollState />
      {children}
    </>
  );
}
