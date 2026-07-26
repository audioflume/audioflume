"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import AudioflumeOutroSection from "@/components/AudioflumeOutroSection";

export default function CuratedOutroMount() {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const container = document.querySelector<HTMLElement>(
      ".curated-playlists-page-root .curated-playlists-page-layer > div",
    );

    if (!container) return;

    const outroMount = document.createElement("div");
    outroMount.className = "discover-reference-outro-mount";
    outroMount.dataset.curatedOutroMount = "true";
    container.appendChild(outroMount);
    setMount(outroMount);

    return () => {
      outroMount.remove();
    };
  }, []);

  return mount ? createPortal(<AudioflumeOutroSection />, mount) : null;
}
