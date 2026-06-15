"use client";

import { useEffect, type ReactNode } from "react";

export default function MusicLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    function getSongCardOrder() {
      return Array.from(document.querySelectorAll<HTMLElement>("[data-song-card-id]"))
        .map((card) => card.dataset.songCardId)
        .filter(Boolean)
        .slice(0, 20);
    }

    function getQuickButtonState(label: string) {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (element) => element.textContent?.trim() === label,
      );

      return {
        exists: Boolean(button),
        pressed: button?.getAttribute("aria-pressed") ?? null,
        className: button?.className ?? null,
      };
    }

    function logDomState(source: string) {
      console.log("[Filmwave music DOM debug]", source, {
        shuffle: getQuickButtonState("Shuffle"),
        recent: getQuickButtonState("Most Recent"),
        popular: getQuickButtonState("Most Popular"),
        domSongCardCount: document.querySelectorAll("[data-song-card-id]").length,
        domSongCardIds: getSongCardOrder(),
      });
    }

    function handleClick(event: MouseEvent) {
      const button = (event.target as Element | null)?.closest("button");
      const label = button?.textContent?.trim();

      if (label !== "Shuffle" && label !== "Most Recent" && label !== "Most Popular") return;

      console.log("[Filmwave music DOM debug] click captured", {
        label,
        detail: event.detail,
        eventPhase: event.eventPhase,
        targetTag: (event.target as Element | null)?.tagName ?? null,
        buttonPressedBefore: button?.getAttribute("aria-pressed") ?? null,
      });

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => logDomState(`after ${label} click`));
      });
    }

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => logDomState("mutation"));
    });

    document.addEventListener("click", handleClick, true);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-song-card-id", "aria-pressed", "class"],
    });

    logDomState("mounted");

    return () => {
      document.removeEventListener("click", handleClick, true);
      observer.disconnect();
    };
  }, []);

  return (
    <>
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
