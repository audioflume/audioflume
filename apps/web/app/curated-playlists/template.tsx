import type { ReactNode } from "react";
import CuratedJumpBackIn from "./CuratedJumpBackIn";
import CuratedVideoHero from "./CuratedVideoHero";
import "./curated-video-hero.css";

const CURATED_LANDING_CARD_RATIO_STYLE = `
  body:has(.curated-playlists-page-root) .curated-playlist-shelf {
    width: min(100%, 1120px);
    margin-right: auto;
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

  body:has(.curated-playlists-page-root) .curated-playlist-image,
  body:has(.curated-playlists-page-root) .curated-playlist-skeleton-card {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 16 / 9 !important;
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
      <CuratedJumpBackIn />
      {children}
    </>
  );
}
