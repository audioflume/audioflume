"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function DiscoverCuratedHeroCopy() {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const syncMount = () => {
      const heroInner = document.querySelector<HTMLElement>(".discover-hero-inner");
      if (!heroInner || heroInner.querySelector(".discover-curated-hero-copy-mount")) return;

      const nextMount = document.createElement("div");
      nextMount.className = "discover-curated-hero-copy-mount";
      heroInner.appendChild(nextMount);
      setMount(nextMount);
    };

    syncMount();
    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!mount) return null;

  return createPortal(
    <div className="curated-video-hero discover-curated-hero-copy-shell">
      <div className="curated-video-hero-content discover-curated-hero-copy">
        <h1>Endless Audio for Film</h1>

        <p className="curated-video-hero-primary-copy">
          <span>Browse curated music playlists</span>
          <span>Preview audio soundtracks</span>
          <span>For film</span>
        </p>

        <div className="curated-video-hero-secondary-copy">
          <strong>(Tailored Sound)</strong>
          <span>
            Music chosen to fit the cut
            <br />
            From first frame to final
          </span>
        </div>
      </div>
    </div>,
    mount,
  );
}
