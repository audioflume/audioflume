import type { ReactNode } from "react";
import CuratedHeaderScrollState from "./CuratedHeaderScrollState";
import "./curated-playlists.css";

const CURATED_FEATURED_STYLE = `
  body:has(.curated-playlists-page-root) .curated-featured-playlist-copy::before {
    content: none !important;
    display: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-title {
    font-size: clamp(22px, 2vw, 32px) !important;
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist-tracks,
  body:has(.curated-playlists-page-root) .curated-featured-playlist-loading-tracks {
    background: #101112 !important;
    background-color: #101112 !important;
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
      {children}
    </>
  );
}
