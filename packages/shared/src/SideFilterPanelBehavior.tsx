"use client";

import { useLayoutEffect } from "react";

const SECTION_ID_BY_LABEL: Record<string, string> = {
  Mood: "mood",
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

const DOT_ONLY_COUNT_SECTION_IDS = new Set([
  "playlist",
  "duration",
  "bpm",
  "key",
  "display",
]);

const FILTER_COLUMN_SELECTOR = ".fw-filter-rail, .fw-filter-detail";
const RAIL_CLEAR_ALL_CLASS = "fw-filter-rail-clear-all";
const RAIL_PLAYLISTS_CLASS = "fw-filter-rail-item-playlists";

function getRailItemKey(railItem: Element, panel: Element) {
  const railItems = Array.from(panel.querySelectorAll(".fw-filter-rail-item"));
  const index = railItems.indexOf(railItem);

  if (index >= 0) return String(index);

  return railItem.textContent?.trim() ?? "";
}

function getRailItemSectionId(railItem: Element) {
  const label = railItem.querySelector(".fw-filter-rail-label")?.textContent?.trim();

  if (!label) return null;

  return SECTION_ID_BY_LABEL[label] ?? null;
}

function syncPlaylistRailItem(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".fw-filter-panel-wrap").forEach((panel) => {
    const rail = panel.querySelector<HTMLElement>(".fw-filter-rail");
    if (!rail) return;

    const playlistItem = Array.from(
      rail.querySelectorAll<HTMLElement>(".fw-filter-rail-item"),
    ).find((railItem) => getRailItemSectionId(railItem) === "playlist");

    if (!playlistItem) return;

    playlistItem.classList.add(RAIL_PLAYLISTS_CLASS);

    const label = playlistItem.querySelector<HTMLElement>(".fw-filter-rail-label");
    if (label && label.textContent?.trim() !== "Playlists") label.textContent = "Playlists";
  });
}

function syncRailClearAllButtons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".fw-filter-panel-wrap").forEach((panel) => {
    const rail = panel.querySelector<HTMLElement>(".fw-filter-rail");
    if (!rail) return;

    const footerClearAll = panel.querySelector<HTMLButtonElement>(
      ".fw-filter-panel-footer .fw-filter-clear-all",
    );
    let railClearAll = rail.querySelector<HTMLButtonElement>(`.${RAIL_CLEAR_ALL_CLASS}`);

    if (!footerClearAll) {
      railClearAll?.remove();
      return;
    }

    if (!railClearAll) {
      railClearAll = document.createElement("button");
      railClearAll.type = "button";
      railClearAll.className = RAIL_CLEAR_ALL_CLASS;
      railClearAll.textContent = "Clear all";
      railClearAll.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        panel
          .querySelector<HTMLButtonElement>(".fw-filter-panel-footer .fw-filter-clear-all")
          ?.click();
      });
      rail.appendChild(railClearAll);
    }
  });
}

function syncSideFilterRailPresentation(root: ParentNode = document) {
  syncPlaylistRailItem(root);
  syncRailClearAllButtons(root);
}

function syncDotOnlyRailCounts(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".fw-filter-rail-item").forEach((railItem) => {
    const sectionId = getRailItemSectionId(railItem);
    const count = railItem.querySelector<HTMLElement>(".fw-filter-rail-count");

    if (!count) return;

    const isDotOnly = sectionId ? DOT_ONLY_COUNT_SECTION_IDS.has(sectionId) : false;
    count.classList.toggle("is-dot-only", isDotOnly);

    if (!isDotOnly) return;

    count.setAttribute("aria-label", `Clear ${sectionId} filter`);
  });
}

function syncFilterColumnFadeState(column: HTMLElement) {
  const hasScrollTop = column.scrollTop > 1;
  const hasScrollBottom = column.scrollHeight - column.clientHeight - column.scrollTop > 1;
  const rect = column.getBoundingClientRect();

  column.classList.toggle("has-scroll-top", hasScrollTop);
  column.classList.toggle("has-scroll-bottom", hasScrollBottom);
  column.style.setProperty("--fw-filter-fade-left", `${rect.left}px`);
  column.style.setProperty("--fw-filter-fade-top", `${rect.top}px`);
  column.style.setProperty("--fw-filter-fade-width", `${column.clientWidth}px`);
  column.style.setProperty("--fw-filter-fade-height", `${rect.height}px`);
}

function syncFilterPanelColumnFadeStates(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(FILTER_COLUMN_SELECTOR).forEach(syncFilterColumnFadeState);
}

function clickNextSelectedDetailControl(panel: HTMLElement, attempts = 0) {
  if (attempts > 20) return;

  const selectedOption = panel.querySelector<HTMLButtonElement>(
    ".fw-filter-detail .fw-filter-option.is-selected, .fw-filter-detail .fw-filter-chip.is-selected",
  );

  if (!selectedOption) return;

  selectedOption.click();

  window.requestAnimationFrame(() => {
    clickNextSelectedDetailControl(panel, attempts + 1);
  });
}

function clearRailSection(panel: HTMLElement, railItem: Element) {
  const railItemKey = getRailItemKey(railItem, panel);
  const isCurrentOpenSection =
    panel.classList.contains("has-selected-filter-section") &&
    panel.dataset.sideFilterActiveKey === railItemKey;

  if (!isCurrentOpenSection) {
    (railItem as HTMLElement).click();
  }

  window.requestAnimationFrame(() => {
    clickNextSelectedDetailControl(panel);
  });
}

export default function SideFilterPanelBehavior() {
  useLayoutEffect(() => {
    let syncFrame = 0;

    function schedulePresentationSync() {
      if (syncFrame) return;

      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = 0;
        syncSideFilterRailPresentation();
        syncDotOnlyRailCounts();
        syncFilterPanelColumnFadeStates();
      });
    }

    function handleFilterRailClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const railItem = target.closest(".fw-filter-rail-item");
      if (!railItem) return;

      const panel = railItem.closest(".fw-filter-panel-wrap");
      if (!(panel instanceof HTMLElement)) return;

      if (target.closest(".fw-filter-rail-count")) {
        event.preventDefault();
        event.stopPropagation();
        clearRailSection(panel, railItem);
        schedulePresentationSync();
        return;
      }

      const railItemKey = getRailItemKey(railItem, panel);
      const isSameOpenSection =
        panel.classList.contains("has-selected-filter-section") &&
        panel.dataset.sideFilterActiveKey === railItemKey;

      if (isSameOpenSection) {
        panel.classList.remove("has-selected-filter-section");
        delete panel.dataset.sideFilterActiveKey;
        schedulePresentationSync();
        return;
      }

      panel.dataset.sideFilterActiveKey = railItemKey;
      panel.classList.add("has-selected-filter-section");
      schedulePresentationSync();
    }

    function handleFilterColumnScroll(event: Event) {
      const target = event.target;

      if (target instanceof HTMLElement && target.matches(FILTER_COLUMN_SELECTOR)) {
        syncFilterColumnFadeState(target);
        return;
      }

      syncFilterPanelColumnFadeStates();
    }

    function handleViewportChange() {
      syncFilterPanelColumnFadeStates();
      schedulePresentationSync();
    }

    const observer = new MutationObserver(schedulePresentationSync);

    syncSideFilterRailPresentation();
    syncDotOnlyRailCounts();
    syncFilterPanelColumnFadeStates();

    window.requestAnimationFrame(() => {
      syncSideFilterRailPresentation();
      syncDotOnlyRailCounts();
      syncFilterPanelColumnFadeStates();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleFilterRailClick, true);
    document.addEventListener("scroll", handleFilterColumnScroll, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, { passive: true });

    return () => {
      if (syncFrame) window.cancelAnimationFrame(syncFrame);
      observer.disconnect();
      document.removeEventListener("click", handleFilterRailClick, true);
      document.removeEventListener("scroll", handleFilterColumnScroll, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  return null;
}
