"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const HERO_IMAGE_URL =
  "https://images.filmwave.io/images/discover/b7cb4a48-bd82-44d1-b02e-c104dac45339-gigapixel-low%20resolution%20v2-2x.jpeg";

export default function CuratedVideoHero() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const syncTarget = () => {
      const nextTarget = document.querySelector<HTMLElement>(
        ".curated-playlists-page-root .curated-featured-playlist",
      );
      setTarget((current) => (current === nextTarget ? current : nextTarget));
    };

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="curated-video-hero">
      <img
        className="curated-video-hero-media"
        src={HERO_IMAGE_URL}
        alt=""
        aria-hidden="true"
      />
      <div className="curated-video-hero-overlay" aria-hidden="true" />

      <div className="curated-video-hero-content">
        <h1>Curated Playlists</h1>

        <p className="curated-video-hero-primary-copy">
          <span>Discover curated music playlists</span>
          <span>Premium audio soundtracks</span>
          <span>For film</span>
        </p>

        <div className="curated-video-hero-secondary-copy">
          <strong>(Tailored Sound)</strong>
          <span>
            Discover curated music playlists, premium audio
            <br />
            soundtracks for film
          </span>
        </div>
      </div>
    </div>,
    target,
  );
}
