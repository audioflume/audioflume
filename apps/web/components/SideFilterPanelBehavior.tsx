"use client";

import { useLayoutEffect } from "react";
import { SideFilterPanelBehavior as SharedSideFilterPanelBehavior } from "@filmwave/shared";

import { usePlaylists } from "@/hooks/usePlaylists";

const LICENSE_FILTER_BOX_CLASS = "fw-license-filter-box";
const FILTERS_HEADING_CLASS = "fw-filter-section-heading";
const LICENSE_FILTER_STORAGE_KEY = "filmwave-license-filter";
const LICENSE_FILTER_CHANGE_EVENT = "filmwave:license-filter-change";
const SIDE_FILTER_SECTION_CLEAR_EVENT = "filmwave:side-filter-section-clear";
const WEB_MUSIC_FILTER_PANEL_SELECTOR =
  "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-filter-panel-wrap";
const WEB_MUSIC_FILTER_RAIL_SELECTOR =
  "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-filter-rail";
const DISPLAY_AI_FILTER_OPTION_CLASS = "fw-display-ai-filter-option";
const DISPLAY_AI_FILTER_STORAGE_KEY = "filmwave-display-ai-filter";
const DISPLAY_AI_FILTER_CHANGE_EVENT = "filmwave:display-ai-filter-change";
const DISPLAY_AI_EXCLUDE_ROOT_CLASS = "fw-display-exclude-ai-songs";
const DISPLAY_AI_ONLY_ROOT_CLASS = "fw-display-ai-songs-only";
const DISPLAY_AI_RAIL_COUNT_CLASS = "fw-display-ai-rail-count";
const DISPLAY_AI_CLEAR_ALL_PROXY_CLASS = "fw-display-ai-clear-all-proxy";
const PLAYLIST_FILTER_OPTION_CLASS = "fw-filter-playlist-option";
const PUBLIC_PLAYLIST_FILTER_OPTION_CLASS = "is-public-playlist";

const LICENSE_FILTER_OPTIONS = [
  {
    value: "standard",
    label: "Standard License",
    ariaLabel: "Standard License",
    premium: false,
  },
  {
    value: "premium",
    label: "Artist",
    ariaLabel: "Artist Premium",
    premium: true,
  },
] as const;
const DISPLAY_AI_FILTER_OPTIONS = [
  { value: "exclude", label: "Human made" },
  { value: "only", label: "AI songs only" },
] as const;

type LicenseFilterValue = (typeof LICENSE_FILTER_OPTIONS)[number]["value"];
type DisplayAiFilterValue = (typeof DISPLAY_AI_FILTER_OPTIONS)[number]["value"];
type PlaylistFilterDecoration = {
  name: string;
  is_public: boolean;
};

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

function getStoredLicenseFilters(): LicenseFilterValue[] {
  try {
    const stored = window.localStorage.getItem(LICENSE_FILTER_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed)].filter(
      (value): value is LicenseFilterValue =>
        value === "standard" || value === "premium",
    );
  } catch {
    return [];
  }
}

function setStoredLicenseFilters(values: LicenseFilterValue[]) {
  try {
    if (values.length > 0) {
      window.localStorage.setItem(
        LICENSE_FILTER_STORAGE_KEY,
        JSON.stringify(values),
      );
    } else {
      window.localStorage.removeItem(LICENSE_FILTER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; the current view still updates from the event.
  }

  window.dispatchEvent(new Event(LICENSE_FILTER_CHANGE_EVENT));
}

function createLicenseFilterCheckIcon() {
  return `
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
}

function syncLicenseFilterBoxState(box: HTMLElement) {
  const selectedFilters = new Set(getStoredLicenseFilters());

  box.querySelectorAll<HTMLInputElement>(".fw-license-filter-input").forEach((input) => {
    const value = input.dataset.licenseFilter as LicenseFilterValue | undefined;
    const isSelected = Boolean(value && selectedFilters.has(value));
    const option = input.closest<HTMLElement>(".fw-license-filter-option");
    const check = option?.querySelector<HTMLElement>(".fw-license-filter-check");

    input.checked = isSelected;
    option?.classList.toggle("is-selected", isSelected);
    check?.classList.toggle("is-selected", isSelected);

    if (check && isSelected && !check.firstElementChild) {
      check.innerHTML = createLicenseFilterCheckIcon();
    } else if (check && !isSelected && check.firstElementChild) {
      check.innerHTML = "";
    }
  });
}

function createLicenseFilterBox() {
  const box = document.createElement("div");
  box.className = LICENSE_FILTER_BOX_CLASS;

  const title = document.createElement("div");
  title.className = "fw-license-filter-title";
  title.textContent = "LICENSES";
  box.appendChild(title);

  const options = document.createElement("div");
  options.className = "fw-license-filter-options";

  LICENSE_FILTER_OPTIONS.forEach((option) => {
    const label = document.createElement("label");
    label.className = "fw-license-filter-option";

    const labelText = document.createElement("span");
    labelText.className = "fw-license-filter-label";
    labelText.textContent = option.label;

    if (option.premium) {
      const premiumTag = document.createElement("span");
      premiumTag.className = "fw-license-filter-premium-tag";
      premiumTag.setAttribute("aria-hidden", "true");

      const premiumText = document.createElement("span");
      premiumText.textContent = "Premium";
      premiumTag.appendChild(premiumText);
      labelText.appendChild(premiumTag);
    }

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "fw-license-filter-input";
    input.dataset.licenseFilter = option.value;
    input.setAttribute("aria-label", `Filter by ${option.ariaLabel}`);
    input.addEventListener("change", () => {
      const selectedFilters = new Set(getStoredLicenseFilters());

      if (input.checked) selectedFilters.add(option.value);
      else selectedFilters.delete(option.value);

      setStoredLicenseFilters([...selectedFilters]);
      syncLicenseFilterBoxes();
    });

    const check = document.createElement("span");
    check.className = "fw-license-filter-check";
    check.setAttribute("aria-hidden", "true");

    label.appendChild(labelText);
    label.appendChild(input);
    label.appendChild(check);
    options.appendChild(label);
  });

  box.appendChild(options);
  syncLicenseFilterBoxState(box);
  return box;
}

function createFiltersHeading() {
  const heading = document.createElement("div");
  heading.className = FILTERS_HEADING_CLASS;
  heading.textContent = "FILTERS";
  return heading;
}

function syncLicenseFilterBoxes() {
  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_RAIL_SELECTOR).forEach((rail) => {
    syncWebRailItemSectionIds(rail);
    rail.querySelector(":scope > .fw-filter-ai-linkmatch")?.remove();

    let box = rail.querySelector<HTMLElement>(`:scope > .${LICENSE_FILTER_BOX_CLASS}`);
    if (!box) box = createLicenseFilterBox();
    if (rail.firstElementChild !== box) rail.prepend(box);

    let filtersHeading = rail.querySelector<HTMLElement>(`:scope > .${FILTERS_HEADING_CLASS}`);
    if (!filtersHeading) filtersHeading = createFiltersHeading();

    const firstFilterItem = rail.querySelector<HTMLElement>(":scope > .fw-filter-rail-item");
    if (firstFilterItem && filtersHeading.nextElementSibling !== firstFilterItem) {
      rail.insertBefore(filtersHeading, firstFilterItem);
    }

    syncLicenseFilterBoxState(box);
  });
}

function getStoredDisplayAiFilter(): DisplayAiFilterValue | null {
  try {
    const value = window.localStorage.getItem(DISPLAY_AI_FILTER_STORAGE_KEY);
    return value === "exclude" || value === "only" ? value : null;
  } catch {
    return null;
  }
}

function setStoredDisplayAiFilter(value: DisplayAiFilterValue | null) {
  try {
    if (value) window.localStorage.setItem(DISPLAY_AI_FILTER_STORAGE_KEY, value);
    else window.localStorage.removeItem(DISPLAY_AI_FILTER_STORAGE_KEY);
  } catch {
    // Ignore storage failures; the class state still applies for the current view.
  }

  window.dispatchEvent(new Event(DISPLAY_AI_FILTER_CHANGE_EVENT));
}

function dispatchSideFilterSectionClear(sectionId: string) {
  window.dispatchEvent(
    new CustomEvent(SIDE_FILTER_SECTION_CLEAR_EVENT, {
      detail: { sectionId },
    }),
  );
}

function clearDisplayFilters() {
  if (getStoredDisplayAiFilter()) setStoredDisplayAiFilter(null);
  dispatchSideFilterSectionClear("display");
}

function syncDisplayAiRootClasses(value = getStoredDisplayAiFilter()) {
  document.documentElement.classList.toggle(DISPLAY_AI_EXCLUDE_ROOT_CLASS, value === "exclude");
  document.documentElement.classList.toggle(DISPLAY_AI_ONLY_ROOT_CLASS, value === "only");
}

function createDisplayAiCheckIcon() {
  return `
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        stroke-width="3.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

function createDisplayAiFilterOption(option: (typeof DISPLAY_AI_FILTER_OPTIONS)[number]) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `fw-filter-option ${DISPLAY_AI_FILTER_OPTION_CLASS}`;
  button.dataset.aiDisplayFilter = option.value;
  button.innerHTML = `
    <span class="fw-filter-option-check" aria-hidden="true"></span>
    <span class="fw-filter-option-label">${option.label}</span>
  `;
  button.addEventListener("click", () => {
    const currentValue = getStoredDisplayAiFilter();
    const nextValue = currentValue === option.value ? null : option.value;

    setStoredDisplayAiFilter(nextValue);
    syncDisplayAiRootClasses(nextValue);
    syncDisplayAiFilterOptions();
  });

  return button;
}

function syncDisplayAiFilterOptionState(button: HTMLButtonElement, selectedValue: DisplayAiFilterValue | null) {
  const isSelected = button.dataset.aiDisplayFilter === selectedValue;
  const check = button.querySelector<HTMLElement>(".fw-filter-option-check");

  button.classList.toggle("is-selected", isSelected);
  button.setAttribute("aria-pressed", String(isSelected));
  if (check) check.innerHTML = isSelected ? createDisplayAiCheckIcon() : "";
}

function getRailItemSectionId(railItem: Element | null) {
  if (!railItem) return null;

  const explicitSectionId = (railItem as HTMLElement).dataset.filterSectionId;
  if (explicitSectionId) return explicitSectionId;

  const label = railItem.querySelector(".fw-filter-rail-label")?.textContent?.trim() ?? "";
  return SECTION_ID_BY_LABEL[label] ?? null;
}

function getDisplayRailItem(panel: HTMLElement) {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(".fw-filter-rail-item"),
  ).find((railItem) => getRailItemSectionId(railItem) === "display");
}

function syncDisplayAiRailCount(
  panel: HTMLElement,
  selectedValue: DisplayAiFilterValue | null,
) {
  const displayRailItem = getDisplayRailItem(panel);
  if (!displayRailItem) return;

  const counts = Array.from(
    displayRailItem.querySelectorAll<HTMLElement>(".fw-filter-rail-count"),
  );
  const injectedCount = counts.find((count) =>
    count.classList.contains(DISPLAY_AI_RAIL_COUNT_CLASS),
  );
  const nativeCount = counts.find(
    (count) => !count.classList.contains(DISPLAY_AI_RAIL_COUNT_CLASS),
  );

  if (nativeCount) {
    injectedCount?.remove();
    const nextCount = selectedValue ? "2" : "1";
    nativeCount.dataset.countValue = nextCount;
    if (nativeCount.textContent?.trim() !== nextCount) {
      nativeCount.textContent = nextCount;
    }
    return;
  }

  if (!selectedValue) {
    injectedCount?.remove();
    return;
  }

  if (injectedCount) {
    injectedCount.dataset.countValue = "1";
    if (injectedCount.textContent?.trim() !== "1") injectedCount.textContent = "1";
    return;
  }

  const count = document.createElement("span");
  count.className = `fw-filter-rail-count ${DISPLAY_AI_RAIL_COUNT_CLASS}`;
  count.dataset.countValue = "1";
  count.textContent = "1";

  const chevron = displayRailItem.querySelector(".fw-filter-rail-chevron");
  if (chevron) displayRailItem.insertBefore(count, chevron);
  else displayRailItem.appendChild(count);
}

function syncDisplayClearAll(panel: HTMLElement) {
  const footer = panel.querySelector<HTMLElement>(".fw-filter-panel-footer");
  if (!footer) return;

  const displayRailItem = getDisplayRailItem(panel);
  const displayActive = Boolean(
    displayRailItem?.querySelector(".fw-filter-rail-count"),
  );
  const clearButtons = Array.from(
    footer.querySelectorAll<HTMLButtonElement>(".fw-filter-clear-all"),
  );
  const proxy = clearButtons.find((button) =>
    button.classList.contains(DISPLAY_AI_CLEAR_ALL_PROXY_CLASS),
  );
  const nativeClear = clearButtons.find(
    (button) => !button.classList.contains(DISPLAY_AI_CLEAR_ALL_PROXY_CLASS),
  );

  if (!displayActive || nativeClear) {
    proxy?.remove();
    return;
  }

  if (proxy) return;

  const clearAll = document.createElement("button");
  clearAll.type = "button";
  clearAll.className = `fw-filter-clear-all ${DISPLAY_AI_CLEAR_ALL_PROXY_CLASS}`;
  clearAll.textContent = "Clear all";
  clearAll.addEventListener("click", () => clearDisplayFilters());
  footer.prepend(clearAll);
}

function syncDisplayAiFilterOptions() {
  syncDisplayAiRootClasses();

  const selectedValue = getStoredDisplayAiFilter();

  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_PANEL_SELECTOR).forEach((panel) => {
    syncDisplayAiRailCount(panel, selectedValue);
    syncDisplayClearAll(panel);

    const activeRailItem = panel.querySelector<HTMLElement>(".fw-filter-rail-item.is-active");
    if (getRailItemSectionId(activeRailItem) !== "display") return;

    const optionList = panel.querySelector<HTMLElement>(".fw-filter-detail .fw-filter-option-list");
    if (!optionList) return;

    DISPLAY_AI_FILTER_OPTIONS.forEach((option) => {
      let button = optionList.querySelector<HTMLButtonElement>(
        `.${DISPLAY_AI_FILTER_OPTION_CLASS}[data-ai-display-filter="${option.value}"]`,
      );

      if (!button) {
        button = createDisplayAiFilterOption(option);
        optionList.appendChild(button);
      }

      syncDisplayAiFilterOptionState(button, selectedValue);
    });
  });
}

function syncPlaylistFilterOptionClasses(playlists: PlaylistFilterDecoration[]) {
  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_PANEL_SELECTOR).forEach((panel) => {
    const activeRailItem = panel.querySelector<HTMLElement>(".fw-filter-rail-item.is-active");
    if (getRailItemSectionId(activeRailItem) !== "playlist") return;

    const optionButtons = Array.from(
      panel.querySelectorAll<HTMLButtonElement>(
        ".fw-filter-detail .fw-filter-option-list > .fw-filter-option",
      ),
    );

    optionButtons.forEach((button, index) => {
      const playlist = playlists[index];
      const hasPlaylist = Boolean(playlist);
      const isPublic = Boolean(playlist?.is_public);

      button.classList.toggle(PLAYLIST_FILTER_OPTION_CLASS, hasPlaylist);
      button.classList.toggle(PUBLIC_PLAYLIST_FILTER_OPTION_CLASS, isPublic);

      if (isPublic && playlist) {
        button.setAttribute("aria-label", `${playlist.name}, public playlist`);
        button.title = "Public playlist";
        return;
      }

      button.removeAttribute("aria-label");
      button.removeAttribute("title");
    });
  });
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

function syncWebPanelClearMode() {
  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_PANEL_SELECTOR).forEach((panel) => {
    panel.dataset.sideFilterClearMode = "event";
  });
}

function syncWebMusicFilterEnhancements(playlists: PlaylistFilterDecoration[]) {
  syncWebPanelClearMode();
  syncLicenseFilterBoxes();
  syncDisplayAiFilterOptions();
  syncPlaylistFilterOptionClasses(playlists);
}

export default function SideFilterPanelBehavior() {
  const { playlists } = usePlaylists();

  useLayoutEffect(() => {
    let syncFrame = 0;

    function syncEnhancements() {
      syncWebMusicFilterEnhancements(playlists);
    }

    function scheduleSync() {
      if (syncFrame) return;

      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = 0;
        syncEnhancements();
      });
    }

    function handleSideFilterSectionClear(event: Event) {
      const customEvent = event as CustomEvent<{ sectionId?: string }>;
      if (customEvent.detail?.sectionId !== "display") return;

      if (getStoredDisplayAiFilter()) setStoredDisplayAiFilter(null);
      scheduleSync();
    }

    function handleClearAllClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clearAll = target.closest(".fw-filter-clear-all");
      if (!clearAll) return;

      const panel = clearAll.closest<HTMLElement>(WEB_MUSIC_FILTER_PANEL_SELECTOR);
      if (!panel) return;

      const displayRailItem = getDisplayRailItem(panel);
      if (!displayRailItem?.querySelector(".fw-filter-rail-count")) return;

      clearDisplayFilters();
    }

    const observer = new MutationObserver(scheduleSync);

    syncEnhancements();
    window.requestAnimationFrame(syncEnhancements);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener(LICENSE_FILTER_CHANGE_EVENT, scheduleSync);
    window.addEventListener(DISPLAY_AI_FILTER_CHANGE_EVENT, scheduleSync);
    window.addEventListener(
      SIDE_FILTER_SECTION_CLEAR_EVENT,
      handleSideFilterSectionClear,
    );
    document.addEventListener("click", handleClearAllClick, true);

    return () => {
      if (syncFrame) window.cancelAnimationFrame(syncFrame);
      observer.disconnect();
      window.removeEventListener(LICENSE_FILTER_CHANGE_EVENT, scheduleSync);
      window.removeEventListener(DISPLAY_AI_FILTER_CHANGE_EVENT, scheduleSync);
      window.removeEventListener(
        SIDE_FILTER_SECTION_CLEAR_EVENT,
        handleSideFilterSectionClear,
      );
      document.removeEventListener("click", handleClearAllClick, true);
    };
  }, [playlists]);

  return <SharedSideFilterPanelBehavior />;
}