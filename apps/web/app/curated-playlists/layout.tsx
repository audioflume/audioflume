import type { ReactNode } from "react";
import CuratedFeaturedCarouselControls from "./CuratedFeaturedCarouselControls";
import CuratedHeaderScrollState from "./CuratedHeaderScrollState";
import "./curated-playlists.css";

const CURATED_FEATURED_STYLE = `
  body:has(.curated-playlists-page-root) .curated-featured-playlist-title {
    font-size: clamp(22px, 2vw, 32px) !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-tracks,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-tracks {
    background: transparent !important;
    background-color: transparent !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-loading,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-track-skeleton {
    display: none !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article {
    background: transparent !important;
    background-color: transparent !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover,
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible {
    background: #101112 !important;
    background-color: #101112 !important;
    color: #fff !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover h3,
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible h3 {
    color: #fff !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover h3 + div,
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible h3 + div {
    color: #808080 !important;
  }

  html.light body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover,
  html.light body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible,
  html[data-theme="light"] body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover,
  html[data-theme="light"] body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible {
    background: #fff !important;
    background-color: #fff !important;
    color: #111 !important;
  }

  html.light body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover h3,
  html.light body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible h3,
  html[data-theme="light"] body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover h3,
  html[data-theme="light"] body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible h3 {
    color: #111 !important;
  }

  html.light body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover h3 + div,
  html.light body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible h3 + div,
  html[data-theme="light"] body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:hover h3 + div,
  html[data-theme="light"] body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-list
    > article:focus-visible h3 + div {
    color: rgba(17, 17, 17, 0.62) !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-show-all {
    display: inline-flex;
    width: fit-content;
    align-self: center;
    justify-content: center;
    margin: 15px auto 0;
    color: rgba(255, 255, 255, 0.66);
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
    text-align: center;
    text-decoration: none;
    transition: color 150ms ease;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-show-all:hover,
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-show-all:focus-visible {
    color: #fff;
    outline: none;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-next-button,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-count {
    visibility: hidden !important;
    pointer-events: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-navigation {
    position: absolute;
    right: var(--curated-page-gutter);
    bottom: 35px;
    z-index: 5;
    display: inline-flex;
    height: 22px;
    align-items: center;
    gap: 7px;
    color: rgba(255, 255, 255, 0.82);
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-navigation-button {
    display: inline-flex;
    width: 18px;
    height: 22px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: inherit;
    padding: 0;
    transition: color 150ms ease;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-navigation-button:hover,
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-navigation-button:focus-visible {
    color: #fff;
    outline: none;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-navigation-button.is-previous
    svg {
    transform: rotate(180deg);
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-navigation-count {
    margin-left: 5px;
    font-size: 10px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    line-height: 1;
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

  @media (max-width: 720px) {
    body:has(.curated-playlists-page-root) .curated-featured-playlist-title {
      font-size: 26px !important;
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
      <CuratedFeaturedCarouselControls />
      {children}
    </>
  );
}
