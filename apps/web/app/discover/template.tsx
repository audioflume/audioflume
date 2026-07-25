import type { ReactNode } from "react";
import DiscoverCuratedHeroCopy from "./DiscoverCuratedHeroCopy";
import DiscoverReferenceLayout from "./DiscoverReferenceLayout";
import "../curated-playlists/curated-video-hero.css";
import "./discover-reference-layout.css";
import "./discover-curated-hero-copy.css";

export default function DiscoverTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="discover-template-shell">
      {children}
      <DiscoverCuratedHeroCopy />
      <DiscoverReferenceLayout />
    </div>
  );
}
