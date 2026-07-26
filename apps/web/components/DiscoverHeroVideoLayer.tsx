"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const VIDEO_URL =
  "https://pub-cd585d75522a44bb9dad78b6f9974d03.r2.dev/Audioflume%20Banner.mov";
const CURATED_HERO_HEIGHT = "clamp(500px, 69vh, 760px)";

export default function DiscoverHeroVideoLayer() {
  const [hero, setHero] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const syncHero = () => {
      const nextHero = document.querySelector<HTMLElement>(".discover-hero");

      if (nextHero) {
        nextHero.style.height = CURATED_HERO_HEIGHT;
        nextHero.style.minHeight = CURATED_HERO_HEIGHT;
      }

      setHero((current) => (current === nextHero ? current : nextHero));
    };

    syncHero();

    const observer = new MutationObserver(syncHero);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!hero) return null;

  return createPortal(
    <video
      className="discover-hero-video"
      src={VIDEO_URL}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        pointerEvents: "none",
      }}
    />,
    hero,
  );
}
