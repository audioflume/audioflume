"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const VIDEO_URL =
  "https://pub-cd585d75522a44bb9dad78b6f9974d03.r2.dev/10487955-hd_1920_1080_24fps.mp4";

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
      <video
        className="curated-video-hero-media"
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="curated-video-hero-overlay" aria-hidden="true" />

      <div className="curated-video-hero-content">
        <h1>Curated Playlists</h1>

        <p className="curated-video-hero-primary-copy">
          Discover curated music playlists premium audio soundtracks for film
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
