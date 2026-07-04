"use client";

import { useLayoutEffect } from "react";
import { SideFilterPanelBehavior as SharedSideFilterPanelBehavior } from "@filmwave/shared";

const LINKMATCH_BUTTON_CLASS = "fw-filter-ai-linkmatch";
const WEB_MUSIC_FILTER_RAIL_SELECTOR =
  "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-filter-rail";

const SECTION_ID_BY_LABEL: Record<string, string> = {
  Scene: "mood",
  Genre: "genre",
  Region: "region",
  Instruments: "instruments",
  Vocals: "vocals",
  Build: "build",
  "Cue Points": "cuePoints",
  Playlist: "playlist",
  Playlists: "playlist",
  Duration: "duration",
  BPM: "bpm",
  Key: "key",
  Display: "display",
};

function createLinkMatchButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = LINKMATCH_BUTTON_CLASS;
  button.dataset.feature = "desktop-sync";
  button.setAttribute("aria-label", "Open Desktop Sync companion app");
  button.innerHTML = `
    <span class="fw-filter-ai-linkmatch-copy">
      <span class="fw-filter-ai-linkmatch-title">Desktop Sync</span>
      <span class="fw-filter-ai-linkmatch-detail-row">
        <span class="fw-filter-ai-linkmatch-detail">Save songs, sync locally</span>
        <span class="fw-filter-ai-linkmatch-arrow" aria-hidden="true">↗</span>
      </span>
    </span>
  `;

  return button;
}

function syncWebRailItemSectionIds(rail: HTMLElement) {
  rail.querySelectorAll<HTMLElement>(".fw-filter-rail-item").forEach((railItem) => {
    const label = railItem.querySelector<HTMLElement>(".fw-filter-rail-label");
    const labelText = label?.textContent?.trim() ?? "";
    const sectionId = SECTION_ID_BY_LABEL[labelText];

    if (!sectionId) return;

    railItem.dataset.filterSectionId = sectionId;

    if (sectionId === "playlist" && label && label.textContent?.trim() !== "Playlists") {
      label.textContent = "Playlists";
    }
  });
}

function syncLinkMatchRailButtons() {
  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_RAIL_SELECTOR).forEach((rail) => {
    syncWebRailItemSectionIds(rail);

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
