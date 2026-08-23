"use client";

import { useEffect } from "react";

const MARKS_CLASS = "discover-artist-hero-slider-marks";
const NEXT_ARTIST_SELECTOR = 'button[aria-label="Next featured artist"]';

export default function DiscoverHeroIndicatorControls() {
  useEffect(() => {
    function getMarks(container: HTMLElement) {
      return Array.from(container.children).filter(
        (child): child is HTMLSpanElement => child instanceof HTMLSpanElement,
      );
    }

    function syncIndicatorSemantics() {
      const containers = document.querySelectorAll<HTMLElement>(`.${MARKS_CLASS}`);

      containers.forEach((container) => {
        const marks = getMarks(container);

        container.removeAttribute("aria-hidden");
        container.setAttribute("role", "group");
        container.setAttribute("aria-label", "Select featured artist");

        marks.forEach((mark, index) => {
          mark.setAttribute("role", "button");
          mark.tabIndex = 0;
          mark.setAttribute("aria-label", `Show featured artist ${index + 1}`);
          mark.setAttribute(
            "aria-pressed",
            mark.classList.contains("is-active") ? "true" : "false",
          );
        });
      });
    }

    function activateIndicator(mark: HTMLSpanElement) {
      const container = mark.parentElement;
      if (!container?.classList.contains(MARKS_CLASS)) return;

      const marks = getMarks(container);
      if (marks.length <= 1) return;

      const targetIndex = marks.indexOf(mark);
      const currentIndex = marks.findIndex((item) =>
        item.classList.contains("is-active"),
      );
      if (targetIndex < 0 || currentIndex < 0 || targetIndex === currentIndex) {
        return;
      }

      const featuredIntro = container.closest(
        ".discover-artist-hero-featured-intro",
      );
      const nextButton = featuredIntro?.querySelector<HTMLButtonElement>(
        NEXT_ARTIST_SELECTOR,
      );
      if (!nextButton || nextButton.disabled) return;

      const steps = (targetIndex - currentIndex + marks.length) % marks.length;
      for (let step = 0; step < steps; step += 1) {
        nextButton.click();
      }
    }

    function getIndicatorFromTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLSpanElement)) return null;
      if (!target.parentElement?.classList.contains(MARKS_CLASS)) return null;
      return target;
    }

    function handleClick(event: MouseEvent) {
      const mark = getIndicatorFromTarget(event.target);
      if (mark) activateIndicator(mark);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;

      const mark = getIndicatorFromTarget(event.target);
      if (!mark) return;

      event.preventDefault();
      activateIndicator(mark);
    }

    const heroInner = document.querySelector(".discover-artist-hero-inner");
    const observer = heroInner
      ? new MutationObserver(syncIndicatorSemantics)
      : null;

    observer?.observe(heroInner!, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    syncIndicatorSemantics();

    return () => {
      observer?.disconnect();
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

      .${MARKS_CLASS} > span:focus-visible {
        outline: 1px solid #fff;
        outline-offset: 4px;
      }
    `}</style>
  );
}
