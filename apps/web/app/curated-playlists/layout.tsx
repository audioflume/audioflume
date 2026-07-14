import type { ReactNode } from "react";
import CuratedHeaderScrollState from "./CuratedHeaderScrollState";
import "./curated-playlists.css";

const CURATED_FEATURED_TITLE_STYLE = `
  body:has(.curated-playlists-page-root) .curated-featured-playlist-title {
    font-size: clamp(25px, 2.3vw, 36px) !important;
  }

  @media (max-width: 720px) {
    body:has(.curated-playlists-page-root) .curated-featured-playlist-title {
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
      <style>{CURATED_FEATURED_TITLE_STYLE}</style>
      <CuratedHeaderScrollState />
      {children}
    </>
  );
}
