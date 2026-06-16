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

const DOT_ONLY_COUNT_SECTION_IDS = new Set(["playlist", "duration", "bpm", "key", "display"]);

const FILTER_COLUMN_SELECTOR = ".fw-filter-rail, .fw-filter-detail";
const SIDE_FILTER_SECTION_CLEAR_EVENT = "filmwave:side-filter-section-clear";
const RAIL_CLEAR_ALL_CLASS = "fw-filter-rail-clear-all";
const RAIL_PLAYLISTS_CLASS = "fw-filter-rail-item-playlists";
const RAIL_COUNT_ICON_STYLE_ID = "filmwave-side-filter-count-icon-styles";
const RAIL_COUNT_CHECK_CLASS = "fw-filter-rail-count-check";
const RAIL_COUNT_CLEAR_CLASS = "fw-filter-rail-count-clear";

function ensureRailCountIconStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(RAIL_COUNT_ICON_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = RAIL_COUNT_ICON_STYLE_ID;
  style.textContent = `
    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 16px !important;
      min-width: 16px !important;
      width: 16px !important;
      height: 16px !important;
      padding: 0 !important;
      overflow: hidden !important;
      line-height: 16px !important;
      text-align: center !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only {
      font-size: 0 !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only::before,
    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count:hover::after,
    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover::after,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only::before,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count:hover::after,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover::after {
      content: none !important;
      display: none !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count-check,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count-check {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      transform: translateY(0px) !important;
      pointer-events: none !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count-check svg,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count-check svg {
      display: block !important;
      width: 10px !important;
      height: 10px !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count-clear,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count-clear {
      position: absolute !important;
      inset: 0 !important;
      display: none !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      color: inherit !important;
      pointer-events: none !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count-clear svg,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count-clear svg {
      display: block !important;
      width: 11px !important;
      height: 11px !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover .fw-filter-rail-count-check,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover .fw-filter-rail-count-check {
      opacity: 0 !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count:hover,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count:hover {
      font-size: 0 !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count:hover .fw-filter-rail-count-clear,
    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover .fw-filter-rail-count-clear,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count:hover .fw-filter-rail-count-clear,
    .desktop-app-main .desktop-music-page:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover .fw-filter-rail-count-clear {
      display: inline-flex !important;
    }
  `;

  document.head.appendChild(style);
}

function createRailCountCheckIcon() {
  const check = document.createElement("span");
  check.className = RAIL_COUNT_CHECK_CLASS;
  check.setAttribute("aria-hidden", "true");
  check.innerHTML = `
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" aria-hidden="true">
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
  return check;
}

function createRailCountClearIcon() {
  const clear = document.createElement("span");
  clear.className = RAIL_COUNT_CLEAR_CLASS;
  clear.setAttribute("aria-hidden", "true");
  clear.innerHTML = `
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">
      <path
        d="M7 7L17 17M17 7L7 17"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
      />
    </svg>
  `;
  return clear;
}

function getRailItemKey(railItem: Element, panel: Element) {
  const railItems = Array.from(panel.querySelectorAll(".fw-filter-rail-item"));
  const index = railItems.indexOf(railItem);

  if (index >= 0) return String(index);

  return railItem.textContent?.trim() ?? "";
}

function getRailItemSectionId(railItem: Element) {
  const explicitSectionId = (railItem as HTMLElement).dataset.filterSectionId;
  if (explicitSectionId) return explicitSectionId;

  const label = railItem.querySelector(".fw-filter-rail-label")?.textContent?.trim();

  if (!label) return null;

  return SECTION_ID_BY_LABEL[label] ?? null;
}

function syncPlaylistRailItem(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".fw-filter-panel-wrap").forEach((panel) => {
    const rail = panel.querySelector<HTMLElement>(".fw-filter-rail");
    if (!rail) return;

    const playlistItem = Array.from(rail.querySelectorAll<HTMLElement>(".fw-filter-rail-item")).find(
      (railItem) => getRailItemSectionId(railItem) === "playlist",
    );

    if (!playlistItem) return;

    playlistItem.classList.add(RAIL_PLAYLISTS_CLASS);
    playlistItem.dataset.filterSectionId = "playlist";

    const label = playlistItem.querySelector<HTMLElement>(".fw-filter-rail-label");
    if (label && label.textContent?.trim() !== "Playlists") label.textContent = "Playlists";
  });
}

function syncRailClearAllButtons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".fw-filter-panel-wrap").forEach((panel) => {
    const rail = panel.querySelector<HTMLElement>(".fw-filter-rail");
    if (!rail) return;

    const footerClearAll = panel.querySelector<HTMLButtonElement>(".fw-filter-panel-footer .fw-filter-clear-all");
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
        const currentFooterClearAll = panel.querySelector<HTMLButtonElement>(
          ".fw-filter-panel-footer .fw-filter-clear-all",
        );
        currentFooterClearAll?.click();
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

    const originalCount = count.dataset.countValue ?? count.textContent?.trim() ?? "";
    if (originalCount && !count.dataset.countValue) count.dataset.countValue = originalCount;

    const isDotOnly = sectionId ? DOT_ONLY_COUNT_SECTION_IDS.has(sectionId) : false;

    count.classList.toggle("is-dot-only", isDotOnly);

    if (isDotOnly) {
      count.textContent = "";
      count.appendChild(createRailCountCheckIcon());
      count.appendChild(createRailCountClearIcon());
      count.setAttribute("aria-label", `${sectionId} filter active`);
      return;
    }

    count.querySelector(`.${RAIL_COUNT_CHECK_CLASS}`)?.remove();
    count.textContent = count.dataset.countValue ?? originalCount;
    count.appendChild(createRailCountClearIcon());
    count.removeAttribute("aria-label");
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

function dispatchSideFilterSectionClear(sectionId: string) {
  window.dispatchEvent(
    new CustomEvent(SIDE_FILTER_SECTION_CLEAR_EVENT, {
      detail: { sectionId },
    }),
  );
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  );

  descriptor?.set?.call(input, value);

  if (typeof InputEvent === "function") {
    input.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: value,
        inputType: "insertReplacementText",
      }),
    );
  } else {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function getBpmInputs(panel: HTMLElement) {
  return Array.from(
    panel.querySelectorAll<HTMLInputElement>(".fw-filter-detail .fw-filter-mini-field input"),
  );
}

function syncBpmSliderVisuals(panel: HTMLElement) {
  const fill = panel.querySelector<HTMLElement>(".fw-filter-detail .fw-range-fill");
  const handles = Array.from(
    panel.querySelectorAll<HTMLElement>(".fw-filter-detail .fw-range-handle"),
  );

  if (fill) {
    fill.style.left = "0%";
    fill.style.width = handles.length > 1 ? "100%" : "0%";
  }

  if (handles.length > 1) {
    handles[0].style.left = "0%";
    handles[1].style.left = "100%";
    return;
  }

  if (handles[0]) handles[0].style.left = "0%";
}

function applyBpmReset(panel: HTMLElement) {
  const inputs = getBpmInputs(panel);

  inputs.forEach((input) => {
    const label = input.closest(".fw-filter-mini-field")?.textContent ?? "";
    const nextValue = label.includes("High") ? "300" : "1";

    setNativeInputValue(input, nextValue);
  });

  window.requestAnimationFrame(() => {
    const nextInputs = getBpmInputs(panel);
    const lastInput = nextInputs[nextInputs.length - 1];

    if (lastInput) {
      lastInput.focus();
      lastInput.blur();
      lastInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    }

    syncBpmSliderVisuals(panel);

    window.requestAnimationFrame(() => {
      syncBpmSliderVisuals(panel);
    });
  });
}

function resetBpmInputs(panel: HTMLElement) {
  const segmentButtons = Array.from(
    panel.querySelectorAll<HTMLButtonElement>(".fw-filter-detail .fw-segment button"),
  );
  const rangeButton = segmentButtons.find(
    (button) => button.textContent?.trim().toLowerCase() === "range",
  );

  if (rangeButton && !rangeButton.classList.contains("is-active")) {
    rangeButton.click();

    window.requestAnimationFrame(() => {
      applyBpmReset(panel);
    });

    return;
  }

  applyBpmReset(panel);
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

function clearOpenRailSection(panel: HTMLElement, sectionId: string) {
  if (sectionId === "duration" || sectionId === "region") {
    dispatchSideFilterSectionClear(sectionId);
    return;
  }

  if (sectionId === "bpm") {
    resetBpmInputs(panel);
  }

  clickNextSelectedDetailControl(panel);
}

function clearRailSection(panel: HTMLElement, railItem: Element, sectionId: string) {
  const railItemKey = getRailItemKey(railItem, panel);
  const isCurrentOpenSection =
    panel.classList.contains("has-selected-filter-section") &&
    panel.dataset.sideFilterActiveKey === railItemKey;

  if (isCurrentOpenSection) {
    clearOpenRailSection(panel, sectionId);
    return;
  }

  (railItem as HTMLElement).click();

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      clearOpenRailSection(panel, sectionId);
    });
  });
}

export default function SideFilterPanelBehavior() {
  useLayoutEffect(() => {
    let railSyncFrame = 0;

    function scheduleRailSync() {
      if (railSyncFrame) return;

      railSyncFrame = window.requestAnimationFrame(() => {
        railSyncFrame = 0;
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
        const sectionId = getRailItemSectionId(railItem);

        if (!sectionId) return;

        event.preventDefault();
        event.stopPropagation();

        clearRailSection(panel, railItem, sectionId);
        window.requestAnimationFrame(() => syncFilterPanelColumnFadeStates(panel));
        scheduleRailSync();

        return;
      }

      const railItemKey = getRailItemKey(railItem, panel);
      const isSameOpenSection =
        panel.classList.contains("has-selected-filter-section") &&
        panel.dataset.sideFilterActiveKey === railItemKey;

      if (isSameOpenSection) {
        panel.classList.remove("has-selected-filter-section");
        delete panel.dataset.sideFilterActiveKey;
        window.requestAnimationFrame(() => syncFilterPanelColumnFadeStates(panel));
        scheduleRailSync();
        return;
      }

      panel.dataset.sideFilterActiveKey = railItemKey;
      panel.classList.add("has-selected-filter-section");
      window.requestAnimationFrame(() => syncFilterPanelColumnFadeStates(panel));
      scheduleRailSync();
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
      scheduleRailSync();
    }

    const observer = new MutationObserver(scheduleRailSync);

    ensureRailCountIconStyles();
    syncFilterPanelColumnFadeStates();
    syncSideFilterRailPresentation();
    syncDotOnlyRailCounts();

    window.requestAnimationFrame(() => {
      syncFilterPanelColumnFadeStates();
      syncSideFilterRailPresentation();
      syncDotOnlyRailCounts();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", handleFilterRailClick, true);
    document.addEventListener("scroll", handleFilterColumnScroll, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, { passive: true });

    return () => {
      if (railSyncFrame) window.cancelAnimationFrame(railSyncFrame);
      observer.disconnect();
      document.removeEventListener("click", handleFilterRailClick, true);
      document.removeEventListener("scroll", handleFilterColumnScroll, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  return null;
}
