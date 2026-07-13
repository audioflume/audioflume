import type { ReactNode } from "react";
import "./curated-playlists.css";

const CURATED_PLAYLISTS_LAYOUT_STYLE = `
  body:has(.curated-playlists-page-root) {
    --curated-page-gutter: clamp(28px, 5.2vw, 82px);
  }

  .curated-playlists-page-layer > div {
    padding-right: var(--curated-page-gutter) !important;
    padding-left: var(--curated-page-gutter) !important;
  }

  .curated-playlists-page-root .curated-featured-playlist-title {
    font-size: clamp(25px, 2.3vw, 36px) !important;
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

export default function CuratedPlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{CURATED_PLAYLISTS_LAYOUT_STYLE}</style>
      {children}
    </>
  );
}
