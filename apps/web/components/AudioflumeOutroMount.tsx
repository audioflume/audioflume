"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import AudioflumeOutroSection from "@/components/AudioflumeOutroSection";

type AudioflumeOutroMountProps = {
  targetSelector: string;
  adoptExistingMount?: boolean;
};

export default function AudioflumeOutroMount({
  targetSelector,
  adoptExistingMount = false,
}: AudioflumeOutroMountProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    let region: HTMLDivElement | null = null;
    let outroMount: HTMLDivElement | null = null;
    let targetElement: HTMLElement | null = null;

    const syncMount = () => {
      const target = document.querySelector<HTMLElement>(targetSelector);
      const parent = target?.parentElement;

      if (!target || !parent) return;

      targetElement = target;

      if (adoptExistingMount) {
        if (!outroMount || !outroMount.isConnected) {
          outroMount = Array.from(parent.children).find((child) =>
            child.classList.contains("discover-reference-outro-mount"),
          ) as HTMLDivElement | undefined ?? null;
        }

        if (!outroMount) return;
      }

      if (!region) {
        region = document.createElement("div");
        region.className = "audioflume-outro-region";
      }

      if (!outroMount) {
        outroMount = document.createElement("div");
        outroMount.className = "discover-reference-outro-mount";
      }

      if (outroMount.parentElement !== region) {
        region.appendChild(outroMount);
      }

      if (
        region.parentElement !== parent ||
        region.nextElementSibling !== target
      ) {
        parent.insertBefore(region, target);
      }

      if (!adoptExistingMount) {
        setMount((current) => (current === outroMount ? current : outroMount));
      }
    };

    syncMount();

    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();

      if (
        adoptExistingMount &&
        outroMount &&
        targetElement?.parentElement
      ) {
        targetElement.parentElement.insertBefore(outroMount, targetElement);
      }

      region?.remove();
    };
  }, [adoptExistingMount, targetSelector]);

  return mount ? createPortal(<AudioflumeOutroSection />, mount) : null;
}
