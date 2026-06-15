"use client";

import { type ReactNode } from "react";

const musicSearchDomDebugScript = `
(function () {
  if (window.__filmwaveMusicSearchDebugInstalled) return;
  window.__filmwaveMusicSearchDebugInstalled = true;

  function classNameOf(element) {
    if (!element) return "";
    if (typeof element.className === "string") return element.className;
    if (element.className && typeof element.className.baseVal === "string") return element.className.baseVal;
    return "";
  }

  function parentChain(element) {
    var chain = [];
    var current = element;
    while (current && chain.length < 7) {
      var className = classNameOf(current).trim().replace(/\\s+/g, ".");
      chain.push(current.tagName.toLowerCase() + (className ? "." + className : ""));
      current = current.parentElement;
    }
    return chain.join(" <- ");
  }

  function areaName(element) {
    if (!element) return "unknown";
    if (element.closest(".filmwave-header-actions")) return "filmwave-header-actions";
    if (element.closest("header")) return "header";
    if (element.closest(".fw-toolbar-search")) return "fw-toolbar-search";
    if (element.closest(".fw-toolbar-sticky")) return "fw-toolbar-sticky";
    if (element.closest(".music-search-shell")) return "music-search-shell";
    if (element.closest("main")) return "main";
    return "unknown";
  }

  function inspectElement(element) {
    var rect = element.getBoundingClientRect();
    var style = window.getComputedStyle(element);
    return {
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || "",
      role: element.getAttribute("role") || "",
      ariaLabel: element.getAttribute("aria-label") || "",
      placeholder: element.getAttribute("placeholder") || "",
      className: classNameOf(element),
      area: areaName(element),
      rect: Math.round(rect.left) + "," + Math.round(rect.top) + " " + Math.round(rect.width) + "x" + Math.round(rect.height),
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      parentChain: parentChain(element),
    };
  }

  function sample(label) {
    var selector = [
      "input",
      "form",
      "[role='search']",
      "[class*='search']",
      "[class*='Search']",
      "[data-filmwave-search]",
      "[data-filter-search]"
    ].join(",");

    var elements = Array.from(document.querySelectorAll(selector));
    var rows = elements.map(inspectElement);
    console.groupCollapsed("[Filmwave music search debug] " + label + " candidates=" + rows.length);
    console.table(rows);
    console.groupEnd();
  }

  sample("inline-immediate");
  requestAnimationFrame(function () { sample("raf-1"); });
  requestAnimationFrame(function () { requestAnimationFrame(function () { sample("raf-2"); }); });
  [25, 75, 150, 300, 600, 1000].forEach(function (delay) {
    window.setTimeout(function () { sample(delay + "ms"); }, delay);
  });
})();
`;

export default function MusicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: musicSearchDomDebugScript }} />
      {children}
      <style jsx global>{`
        main .min-h-\[320px\].rounded-\[18px\] {
          background-size: 100% 100%, 100% 100%, cover !important;
        }

        main [aria-label="Shuffle songs"][style*="--shuffle-icon-color"] svg {
          fill: var(--text-primary) !important;
        }

        main .fw-toolbar-sticky > .fw-toolbar-float {
          display: none !important;
        }

        main .fw-toolbar-search {
          display: none !important;
        }

        main .fw-hero-section {
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        main > section > .overflow-hidden {
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        main .fw-song-list {
          margin-top: 16px !important;
        }

        body:has(.filmwave-music-player) main .fw-song-list {
          margin-bottom: calc(var(--filmwave-player-height, 72px) + 28px) !important;
        }

        @media (max-width: 640px) {
          main .fw-song-list {
            margin-left: 20px !important;
            margin-right: 20px !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }

        .filmwave-header-actions > form:first-child {
          position: fixed !important;
          top: 10.5px !important;
          left: 50% !important;
          z-index: 40 !important;
          width: clamp(320px, 42vw, 640px) !important;
          max-width: calc(100vw - 420px) !important;
          margin-right: 0 !important;
          transform: translateX(-50%) !important;
        }

        .filmwave-header-actions > form:first-child .filmwave-search-pill,
        .filmwave-header-actions > form:first-child .filmwave-search-pill-expanded,
        .filmwave-header-actions > form:first-child .filmwave-search-pill-collapsed {
          width: 100% !important;
          max-width: 100% !important;
        }

        .filmwave-header-actions > form:first-child .filmwave-search-pill-input {
          width: 100% !important;
        }

        @media (max-width: 900px) {
          .filmwave-header-actions > form:first-child {
            left: calc(50% + 32px) !important;
            width: min(420px, calc(100vw - 300px)) !important;
            max-width: calc(100vw - 300px) !important;
          }
        }
      `}</style>
    </>
  );
}
