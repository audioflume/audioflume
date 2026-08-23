"use client";

import { useEffect } from "react";

const MARKS_CLASS = "discover-artist-hero-slider-marks";

export default function DiscoverHeroIndicatorControls() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof HTMLSpanElement)) return;

      const mark = event.target;
      const container = mark.parentElement;
      if (!container?.classList.contains(MARKS_CLASS)) return;

      const marks = Array.from(
        container.querySelectorAll<HTMLSpanElement>(":scope > span"),
      );
      const targetIndex = marks.indexOf(mark);
      const currentIndex = marks.findIndex((item) =>
        item.classList.contains("is-active"),
      );
      if (targetIndex < 0 || currentIndex < 0 || targetIndex === currentIndex) {
        return;
      }

      const nextButton = container
        .closest(".discover-artist-hero-featured-intro")
        ?.querySelector<HTMLButtonElement>(
          'button[aria-label="Next featured artist"]',
        );
      if (!nextButton || nextButton.disabled) return;

      const steps = (targetIndex - currentIndex + marks.length) % marks.length;
      for (let step = 0; step < steps; step += 1) {
        nextButton.click();
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <style>{`
      .${MARKS_CLASS} > span {
        position: relative;
        cursor: pointer;
      }

      .${MARKS_CLASS} > span::after {
        content: "";
        position: absolute;
        inset: -7px 0;
      }
    `}</style>
  );
}
