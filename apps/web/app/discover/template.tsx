import type { ReactNode } from "react";
import AudioflumeOutroMount from "@/components/AudioflumeOutroMount";
import DiscoverHeroVideoLayer from "@/components/DiscoverHeroVideoLayer";
import CuratedJumpBackIn from "../curated-playlists/CuratedJumpBackIn";
import DiscoverCuratedHeroCopy from "./DiscoverCuratedHeroCopy";
import DiscoverRankingRows from "./DiscoverRankingRows";
import DiscoverReferenceLayout from "./DiscoverReferenceLayout";
import "../curated-playlists/curated-video-hero.css";
import "./discover-reference-layout.css";
import "./discover-curated-hero-copy.css";

type DiscoverTemplateProps = {
  children: ReactNode;
  showHeroLastViewed?: boolean;
};

export default function DiscoverTemplate({
  children,
  showHeroLastViewed = true,
}: DiscoverTemplateProps) {
  return (
    <div
      className={`discover-template-shell${showHeroLastViewed ? " is-discover-route" : ""}`}
    >
      {children}
      <DiscoverRankingRows />
      {showHeroLastViewed && (
        <div className="discover-hero-last-viewed">
          <CuratedJumpBackIn inline placement="hero" />
        </div>
      )}
      {!showHeroLastViewed && <DiscoverHeroVideoLayer />}
      <DiscoverCuratedHeroCopy showIntroCopy={!showHeroLastViewed} />
      <DiscoverReferenceLayout />
      <AudioflumeOutroMount
        targetSelector=".discover-footer-wrap"
        adoptExistingMount
      />
    </div>
  );
}
