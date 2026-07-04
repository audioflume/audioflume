"use client";

import { useLayoutEffect } from "react";
import { SideFilterPanelBehavior as SharedSideFilterPanelBehavior } from "@filmwave/shared";

const LINKMATCH_BUTTON_CLASS = "fw-filter-ai-linkmatch";
const WEB_MUSIC_FILTER_RAIL_SELECTOR =
  "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-filter-rail";

function createLinkMatchButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = LINKMATCH_BUTTON_CLASS;
  button.dataset.feature = "linkmatch-ai";
  button.setAttribute("aria-label", "Open LinkMatch AI");
  button.innerHTML = `
    <span class="fw-filter-ai-linkmatch-copy">
      <span class="fw-filter-ai-linkmatch-title-row">
        <span class="fw-filter-ai-linkmatch-title">LinkMatch AI</span>
        <span class="fw-filter-ai-linkmatch-pill">NEW V2</span>
      </span>
      <span class="fw-filter-ai-linkmatch-detail">Paste a link, find similar songs</span>
    </span>
    <span class="fw-filter-ai-linkmatch-arrow" aria-hidden="true">↗</span>
  `;

  return button;
}

function syncLinkMatchRailButtons() {
  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_RAIL_SELECTOR).forEach((rail) => {
    let button = rail.querySelector<HTMLButtonElement>(`:scope > .${LINKMATCH_BUTTON_CLASS}`);

    if (!button) button = createLinkMatchButton();
    if (rail.firstElementChild !== button) rail.prepend(button);
  });
}

export default function SideFilterPanelBehavior() {
  useLayoutEffect(() => {
    let syncFrame = 0;

    function scheduleSync() {
      if (syncFrame) return;

      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = 0;
        syncLinkMatchRailButtons();
      });
    }

    const observer = new MutationObserver(scheduleSync);

    syncLinkMatchRailButtons();
    window.requestAnimationFrame(syncLinkMatchRailButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (syncFrame) window.cancelAnimationFrame(syncFrame);
      observer.disconnect();
    };
  }, []);

  return <SharedSideFilterPanelBehavior />;
}
