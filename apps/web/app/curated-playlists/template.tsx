import type { ReactNode } from "react";
import CuratedVideoHero from "./CuratedVideoHero";
import "./curated-video-hero.css";

const CURATED_LANDING_CARD_RATIO_STYLE = `
  body:has(.curated-playlists-page-root) .curated-playlist-shelf {
    width: min(100%, 1120px);
    margin-right: auto;
    margin-bottom: clamp(64px, 7vw, 110px);
    margin-left: auto;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-viewport {
    margin-right: 0 !important;
    margin-left: 0 !important;
    overflow: visible !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-scroller,
  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-shelf > .relative > .flex {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: clamp(24px, 2.4vw, 38px) !important;
    row-gap: clamp(30px, 3vw, 46px) !important;
    overflow: visible !important;
    padding-right: 0 !important;
    padding-left: 0 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-shell,
  body:has(.curated-playlists-page-root) .curated-playlist-skeleton-card-shell {
    width: 100% !important;
    min-width: 0 !important;
    flex: none !important;
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
    font-family: "JetBrains Mono Filmwave", monospace !important;
    font-size: clamp(14px, 1vw, 18px) !important;
    font-weight: 600 !important;
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

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-heading h2 {
    font-family: var(--font-aktiv-grotesk), sans-serif !important;
    font-size: clamp(18px, 1.25vw, 23px) !important;
    font-weight: 500 !important;
    font-kerning: normal !important;
    letter-spacing: 0 !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-heading p {
    display: block !important;
    visibility: visible !important;
    max-width: 620px;
    margin: 9px 0 0 !important;
    color: var(--text-muted) !important;
    font-family: "JetBrains Mono Filmwave", monospace !important;
    font-size: clamp(8px, 0.55vw, 9.5px) !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
    line-height: 1.55 !important;
    text-transform: uppercase !important;
    opacity: 1 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-shelf-heading > .hidden,
  body:has(.curated-playlists-page-root) .curated-playlist-shelf-prev-floating,
  body:has(.curated-playlists-page-root) .curated-playlist-shelf-next-floating {
    display: none !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-shelf > .relative {
    margin-right: 0 !important;
    margin-left: 0 !important;
  }

  @media (max-width: 900px) {
    body:has(.curated-playlists-page-root) .curated-playlist-shelf-scroller,
    body:has(.curated-playlists-page-root)
      .curated-playlist-skeleton-shelf > .relative > .flex {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    body:has(.curated-playlists-page-root) .curated-playlist-shelf-scroller,
    body:has(.curated-playlists-page-root)
      .curated-playlist-skeleton-shelf > .relative > .flex {
      grid-template-columns: 1fr;
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
      <CuratedVideoHero />
      {children}
    </>
  );
}
