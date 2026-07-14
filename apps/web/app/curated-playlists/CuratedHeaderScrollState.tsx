"use client";

import { useLayoutEffect } from "react";

const CURATED_SCROLLED_CLASS = "filmwave-curated-scrolled";
const CURATED_SCROLL_THRESHOLD = 18;
const HEADER_MENU_OPEN_SELECTOR = ".filmwave-header-nav-item-playlists.is-open";
const FEATURED_TRACK_SELECTOR =
  ".curated-featured-playlist-tracks, .curated-featured-playlist-loading-tracks";
const FEATURED_COVER_SELECTOR = ".curated-featured-playlist-cover-link";
const STACKED_FEATURED_MEDIA_QUERY = "(max-width: 980px)";

type PreviousInlineValue = {
  value: string;
  priority: string;
};

export default function CuratedHeaderScrollState() {
  useLayoutEffect(() => {
    let frame = 0;
    const pageLayer = document.querySelector<HTMLElement>(
      ".curated-playlists-page-layer",
    );
    const pageRoot = document.querySelector<HTMLElement>(
      ".curated-playlists-page-root",
    );
    const header = document.querySelector<HTMLElement>(".filmwave-header");
    const stackedFeaturedQuery = window.matchMedia(
      STACKED_FEATURED_MEDIA_QUERY,
    );
    const previousPaddingTop = pageLayer?.style.getPropertyValue("padding-top") ?? "";
    const previousPaddingTopPriority =
      pageLayer?.style.getPropertyPriority("padding-top") ?? "";
    const previousTrackTranslations = new Map<HTMLElement, PreviousInlineValue>();

    pageLayer?.style.setProperty("padding-top", "0px", "important");

    function syncFeaturedTrackPosition() {
      const featuredCover = document.querySelector<HTMLElement>(
        FEATURED_COVER_SELECTOR,
      );
      const headerHeight = header?.getBoundingClientRect().height || 75;

      document
        .querySelectorAll<HTMLElement>(FEATURED_TRACK_SELECTOR)
        .forEach((trackPanel) => {
          if (!previousTrackTranslations.has(trackPanel)) {
            previousTrackTranslations.set(trackPanel, {
              value: trackPanel.style.getPropertyValue("translate"),
              priority: trackPanel.style.getPropertyPriority("translate"),
            });
          }

          if (stackedFeaturedQuery.matches) {
            trackPanel.style.setProperty("translate", "none");
            return;
          }

          trackPanel.style.setProperty("translate", "none");

          const coverBottom = featuredCover?.getBoundingClientRect().bottom;
          const trackBottom = trackPanel.getBoundingClientRect().bottom;
          const offset =
            typeof coverBottom === "number"
              ? coverBottom - trackBottom
              : headerHeight / 2;

          trackPanel.style.setProperty("translate", `0 ${offset}px`);
        });
    }

    function syncHeaderState() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const headerMenuOpen = Boolean(
          document.querySelector(HEADER_MENU_OPEN_SELECTOR),
        );

        document.body.classList.toggle(
          CURATED_SCROLLED_CLASS,
          window.scrollY > CURATED_SCROLL_THRESHOLD || headerMenuOpen,
        );
        syncFeaturedTrackPosition();
      });
    }

    const headerObserver = new MutationObserver(syncHeaderState);
    const pageObserver = new MutationObserver(syncFeaturedTrackPosition);

    if (header) {
      headerObserver.observe(header, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class"],
      });
    }

    if (pageRoot) {
      pageObserver.observe(pageRoot, {
        childList: true,
        subtree: true,
      });
    }

    syncHeaderState();
    syncFeaturedTrackPosition();
    window.addEventListener("scroll", syncHeaderState, { passive: true });
    window.addEventListener("resize", syncFeaturedTrackPosition);
    stackedFeaturedQuery.addEventListener("change", syncFeaturedTrackPosition);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncHeaderState);
      window.removeEventListener("resize", syncFeaturedTrackPosition);
      stackedFeaturedQuery.removeEventListener(
        "change",
        syncFeaturedTrackPosition,
      );
      headerObserver.disconnect();
      pageObserver.disconnect();
      document.body.classList.remove(CURATED_SCROLLED_CLASS);

      previousTrackTranslations.forEach(({ value, priority }, trackPanel) => {
        if (value) {
          trackPanel.style.setProperty("translate", value, priority);
        } else {
          trackPanel.style.removeProperty("translate");
        }
      });

      if (pageLayer) {
        if (previousPaddingTop) {
          pageLayer.style.setProperty(
            "padding-top",
            previousPaddingTop,
            previousPaddingTopPriority,
          );
        } else {
          pageLayer.style.removeProperty("padding-top");
        }
      }
    };
  }, []);

  return null;
}
