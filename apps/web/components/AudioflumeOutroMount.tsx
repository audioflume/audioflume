"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import AudioflumeOutroSection from "@/components/AudioflumeOutroSection";

type AudioflumeOutroMountProps = {
  targetSelector: string;
};

export default function AudioflumeOutroMount({
  targetSelector,
}: AudioflumeOutroMountProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    let region: HTMLDivElement | null = null;
    let outroMount: HTMLDivElement | null = null;

    const syncMount = () => {
      const target = document.querySelector<HTMLElement>(targetSelector);
      const parent = target?.parentElement;

      if (!target || !parent) return;

      if (!region || !outroMount) {
        region = document.createElement("div");
        region.className = "audioflume-outro-region";

        outroMount = document.createElement("div");
        outroMount.className = "discover-reference-outro-mount";
        region.appendChild(outroMount);
      }

      if (
        region.parentElement !== parent ||
        region.nextElementSibling !== target
      ) {
        parent.insertBefore(region, target);
      }

      setMount((current) => (current === outroMount ? current : outroMount));
    };

    syncMount();

    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      region?.remove();
    };
  }, [targetSelector]);

  return mount ? createPortal(<AudioflumeOutroSection />, mount) : null;
}
