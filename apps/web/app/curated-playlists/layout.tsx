import type { ReactNode } from "react";
import CuratedFeaturedCarouselControls from "./CuratedFeaturedCarouselControls";
import CuratedPlaylistsLoadingStyles from "./CuratedPlaylistsLoadingStyles";
import "../editorial-typography.css";
import "./curated-playlists.css";

export default function CuratedPlaylistsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CuratedPlaylistsLoadingStyles />
      <CuratedFeaturedCarouselControls />
      {children}
    </>
  );
}
