import type { ReactNode } from "react";
import PlaylistDetailBackdropEnhancer from "@/components/PlaylistDetailBackdropEnhancer";
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
      <PlaylistDetailBackdropEnhancer />
      <CuratedPlaylistsLoadingStyles />
      <CuratedFeaturedCarouselControls />
      {children}
    </>
  );
}
