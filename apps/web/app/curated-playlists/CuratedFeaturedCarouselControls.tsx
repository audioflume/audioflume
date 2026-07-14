"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import ChevronRightIcon from "@/components/icons/ChevronRightIcon";

const FEATURED_PANEL_SELECTOR = ".curated-featured-playlist-image-panel";
const INDICATOR_SELECTOR = ".curated-featured-playlist-indicators button";
const NEXT_BUTTON_SELECTOR = ".curated-featured-playlist-next-button";

export default function CuratedFeaturedCarouselControls() {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);

  useEffect(() => {
    let frame = 0;

    function syncControls() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextPanel = document.querySelector<HTMLElement>(
          FEATURED_PANEL_SELECTOR,
        );
        const indicators = Array.from(
          nextPanel?.querySelectorAll<HTMLButtonElement>(INDICATOR_SELECTOR) ?? [],
        );
        const nextActiveIndex = indicators.findIndex(
          (button) => button.getAttribute("aria-pressed") === "true",
        );

        setPanel(nextPanel);
        setPlaylistCount(indicators.length);
        setActiveIndex(nextActiveIndex >= 0 ? nextActiveIndex : 0);
      });
    }

    const observer = new MutationObserver(syncControls);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["aria-pressed"],
    });

    syncControls();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  function selectOffset(offset: number) {
    if (!panel) return;

    const indicators = Array.from(
      panel.querySelectorAll<HTMLButtonElement>(INDICATOR_SELECTOR),
    );
    if (indicators.length === 0) return;

    const nextIndex =
      (activeIndex + offset + indicators.length) % indicators.length;
    indicators[nextIndex]?.click();
  }

  if (
    !panel ||
    playlistCount < 2 ||
    !panel.querySelector(NEXT_BUTTON_SELECTOR)
  ) {
    return null;
  }

  return createPortal(
    <div
      className="curated-featured-playlist-navigation"
      aria-label="Featured playlist navigation"
    >
      <button
        type="button"
        className="curated-featured-playlist-navigation-button is-previous"
        aria-label="Show previous featured playlist"
        onClick={() => selectOffset(-1)}
      >
        <ChevronRightIcon size={14} />
      </button>
      <button
        type="button"
        className="curated-featured-playlist-navigation-button"
        aria-label="Show next featured playlist"
        onClick={() => selectOffset(1)}
      >
        <ChevronRightIcon size={14} />
      </button>
      <span
        className="curated-featured-playlist-navigation-count"
        aria-live="polite"
      >
        {activeIndex + 1}/{playlistCount}
      </span>
    </div>,
    panel,
  );
}
