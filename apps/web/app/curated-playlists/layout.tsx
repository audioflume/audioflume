import type { ReactNode } from "react";
import "./curated-playlists.css";

const CURATED_PLAYLISTS_LAYOUT_STYLE = `
  body:has(.curated-playlists-page-root) {
    --curated-page-gutter: clamp(28px, 5.2vw, 82px);
  }

  .curated-playlists-page-layer {
    padding-bottom: 64px;
  }

  .curated-playlists-page-layer > div {
    padding-right: var(--curated-page-gutter) !important;
    padding-left: var(--curated-page-gutter) !important;
  }

  .curated-playlists-page-root .curated-featured-playlist,
  .curated-playlists-page-root .curated-featured-playlist-tracks {
    background: #101112;
  }

  .curated-playlists-page-root .curated-featured-playlist-tracks {
    --bg-primary: #101112;
  }

  .curated-playlists-page-root .curated-featured-playlist-copy {
    transform: translateY(-10px);
  }

  .curated-playlists-page-root .curated-featured-playlist-title {
    font-size: clamp(25px, 2.3vw, 36px) !important;
    font-weight: 400 !important;
  }

  .curated-featured-playlist-description {
    display: none;
  }

  .curated-featured-playlist-copy::after {
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    order: 3;
    max-width: 430px;
    margin-top: 5px;
    color: rgba(255, 255, 255, 0.68);
    font-size: 10px;
    font-weight: 400;
    line-height: 1.5;
  }

  .curated-featured-playlist-button {
    gap: 8px;
  }

  .curated-featured-playlist-button::after {
    content: "↗";
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
  }

  .curated-featured-playlist-image {
    animation: curated-featured-playlist-swap 260ms ease-out both;
  }

  @keyframes curated-featured-playlist-swap {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  .curated-featured-playlist-next-button {
    position: absolute;
    top: 50%;
    right: 0;
    z-index: 5;
    display: inline-flex;
    width: 36px;
    height: 36px;
    cursor: pointer;
    transform: translateY(-50%);
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 0;
    background: #fff;
    color: #111;
    padding: 0;
    transition: background-color 150ms ease;
  }

  .curated-featured-playlist-next-button:hover {
    background: rgba(255, 255, 255, 0.86);
  }

  .curated-featured-playlist-next-button:focus-visible {
    outline: 1px solid #fff;
    outline-offset: -3px;
  }

  .curated-featured-playlist-count {
    position: absolute;
    right: 22px;
    bottom: 42px;
    z-index: 4;
    color: rgba(255, 255, 255, 0.78);
    font-size: 10px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .curated-featured-playlist-indicators {
    position: absolute;
    right: 22px;
    bottom: 14px;
    left: 22px;
    z-index: 4;
    display: flex;
    align-items: center;
  }

  .curated-featured-playlist-indicators button {
    height: 18px;
    min-width: 0;
    flex: 1 1 0;
    cursor: pointer;
    border: 0;
    background: transparent;
    padding: 8px 0;
  }

  .curated-featured-playlist-indicators button span {
    display: block;
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.3);
    transition:
      height 160ms ease,
      background-color 160ms ease;
  }

  .curated-featured-playlist-indicators button.is-active span {
    height: 2px;
    background: rgba(255, 255, 255, 1);
  }

  .curated-featured-playlist-indicators button:focus-visible {
    outline: 1px solid rgba(255, 255, 255, 0.9);
    outline-offset: 2px;
  }

  .curated-playlist-shelf-viewport {
    margin-right: calc(var(--curated-page-gutter) * -1) !important;
    margin-left: calc(var(--curated-page-gutter) * -1) !important;
  }

  .curated-playlist-shelf-scroller {
    padding-left: var(--curated-page-gutter) !important;
  }

  .curated-playlist-shelf-prev-floating {
    left: var(--curated-page-gutter) !important;
  }

  .curated-playlist-skeleton-shelf > .relative {
    margin-right: calc(var(--curated-page-gutter) * -1) !important;
    margin-left: calc(var(--curated-page-gutter) * -1) !important;
  }

  .curated-playlist-skeleton-shelf > .relative > .flex {
    padding-left: var(--curated-page-gutter) !important;
  }

  @media (max-width: 720px) {
    body:has(.curated-playlists-page-root) {
      --curated-page-gutter: 20px;
    }

    .curated-playlists-page-root .curated-featured-playlist-title {
      font-size: 28px !important;
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
      <style>{CURATED_PLAYLISTS_LAYOUT_STYLE}</style>
      {children}
    </>
  );
}
