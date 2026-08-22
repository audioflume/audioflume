"use client";

import { useEffect } from "react";

const DESKTOP_NAME_MAX_WIDTH = 640;
const DESKTOP_BREAKPOINT = 980;

export default function DiscoverHeroNameWidthSync() {
  useEffect(() => {
    let frame = 0;
    let cancelled = false;

    function measureNameWidth() {
      const feature = document.querySelector<HTMLElement>(
        ".discover-artist-hero-feature",
      );
      const heading = feature?.querySelector<HTMLHeadingElement>(
        ".discover-artist-hero-identity h1",
      );

      if (!feature || !heading) return;

      feature.style.removeProperty("grid-template-columns");

      if (window.innerWidth <= DESKTOP_BREAKPOINT) return;

      const range = document.createRange();
      range.selectNodeContents(heading);
      const lineRects = Array.from(range.getClientRects()).filter(
        (rect) => rect.width > 0,
      );

      if (lineRects.length === 0) return;

      const widestRenderedLine = Math.max(
        ...lineRects.map((rect) => rect.width),
      );
      const measuredWidth = Math.min(
        DESKTOP_NAME_MAX_WIDTH,
        Math.ceil(widestRenderedLine) + 1,
      );

      feature.style.gridTemplateColumns = `${measuredWidth}px minmax(0, 560px)`;
    }

    function scheduleMeasure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!cancelled) measureNameWidth();
      });
    }

    const heroInner = document.querySelector(".discover-artist-hero-inner");
    const observer = heroInner
      ? new MutationObserver(scheduleMeasure)
      : null;

    observer?.observe(heroInner!, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();

    if (document.fonts) {
      void document.fonts.ready.then(scheduleMeasure);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);

      document
        .querySelector<HTMLElement>(".discover-artist-hero-feature")
        ?.style.removeProperty("grid-template-columns");
    };
  }, []);

  return null;
}
