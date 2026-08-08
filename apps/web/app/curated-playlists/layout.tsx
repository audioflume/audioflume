import type { ReactNode } from "react";
import CuratedFeaturedCarouselControls from "./CuratedFeaturedCarouselControls";
import CuratedJumpBackIn from "./CuratedJumpBackIn";
import CuratedPlaylistsLoadingStyles from "./CuratedPlaylistsLoadingStyles";
import "./curated-playlists.css";

const CURATED_DETAIL_STYLE = `
  body:has(.playlist-detail-page) .playlist-detail-hero,
  body:has(.playlist-detail-page) .playlist-detail-quick-row,
  body:has(.playlist-detail-page) .playlist-detail-section,
  body:has(.playlist-detail-page) .playlist-detail-shell > .playlist-detail-empty {
    box-sizing: border-box;
    width: min(100%, 1280px);
    justify-self: center;
    margin-right: auto !important;
    margin-left: auto !important;
  }
`;

export default function CuratedPlaylistsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CuratedPlaylistsLoadingStyles />
      <style>{CURATED_DETAIL_STYLE}</style>
      <CuratedFeaturedCarouselControls />
      <CuratedJumpBackIn />
      {children}
    </>
  );
}
