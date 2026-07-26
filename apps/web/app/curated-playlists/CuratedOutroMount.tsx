"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import AudioflumeOutroSection from "@/components/AudioflumeOutroSection";

export default function CuratedOutroMount() {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    let outroMount: HTMLDivElement | null = null;

    const syncMount = () => {
      const container = document.querySelector<HTMLElement>(
        ".curated-playlists-page-root .curated-playlists-page-layer > div",
      );

      if (!container) return;

      if (!outroMount) {
        outroMount = document.createElement("div");
        outroMount.className = "discover-reference-outro-mount";
        outroMount.dataset.curatedOutroMount = "true";
      }

      if (
        outroMount.parentElement !== container ||
        container.lastElementChild !== outroMount
      ) {
        container.appendChild(outroMount);
      }

      setMount((current) => (current === outroMount ? current : outroMount));
    };

    syncMount();

    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      outroMount?.remove();
    };
  }, []);

  return mount ? createPortal(<AudioflumeOutroSection />, mount) : null;
}
