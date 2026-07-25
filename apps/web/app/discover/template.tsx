import type { ReactNode } from "react";
import DiscoverBottomGraphic from "./DiscoverBottomGraphic";
import DiscoverCuratedHeroCopy from "./DiscoverCuratedHeroCopy";
import DiscoverReferenceLayout from "./DiscoverReferenceLayout";
import "../curated-playlists/curated-video-hero.css";
import "./discover-reference-layout.css";
import "./discover-curated-hero-copy.css";

export default function DiscoverTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DiscoverReferenceLayout />
      <DiscoverCuratedHeroCopy />
      <DiscoverBottomGraphic />
    </>
  );
}
