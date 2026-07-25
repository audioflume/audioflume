"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const VIDEO_URL =
  "https://pub-cd585d75522a44bb9dad78b6f9974d03.r2.dev/5520037-hd_1920_1080_18fps.mp4";

export default function DiscoverHeroVideoLayer() {
  const [hero, setHero] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const syncHero = () => {
      const nextHero = document.querySelector<HTMLElement>(".discover-hero");
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
      preload="metadata"
      aria-hidden="true"
    />,
    hero,
  );
}
