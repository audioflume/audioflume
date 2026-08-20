"use client";

import { useLayoutEffect } from "react";
import { SideFilterPanelBehavior as SharedSideFilterPanelBehavior } from "@filmwave/shared";

import { usePlaylists } from "@/hooks/usePlaylists";

const LICENSE_FILTER_BOX_CLASS = "fw-license-filter-box";
const LICENSE_FILTER_STORAGE_KEY = "filmwave-license-filter";
const LICENSE_FILTER_CHANGE_EVENT = "filmwave:license-filter-change";
const WEB_MUSIC_FILTER_PANEL_SELECTOR =
  "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-filter-panel-wrap";
const WEB_MUSIC_FILTER_RAIL_SELECTOR =
  "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-filter-rail";
const DISPLAY_AI_FILTER_OPTION_CLASS = "fw-display-ai-filter-option";
const DISPLAY_AI_FILTER_STORAGE_KEY = "filmwave-display-ai-filter";
const DISPLAY_AI_EXCLUDE_ROOT_CLASS = "fw-display-exclude-ai-songs";
const DISPLAY_AI_ONLY_ROOT_CLASS = "fw-display-ai-songs-only";
const DISPLAY_AI_RAIL_COUNT_CLASS = "fw-display-ai-rail-count";
const PLAYLIST_FILTER_OPTION_CLASS = "fw-filter-playlist-option";
const PUBLIC_PLAYLIST_FILTER_OPTION_CLASS = "is-public-playlist";

const LICENSE_FILTER_OPTIONS = [
  { value: "standard", label: "Standard License" },
  { value: "premium", label: "Artist Premium" },
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
  title.textContent = "License";
  box.appendChild(title);

  const options = document.createElement("div");
  options.className = "fw-license-filter-options";

  LICENSE_FILTER_OPTIONS.forEach((option) => {
    const label = document.createElement("label");
    label.className = "fw-license-filter-option";

    const labelText = document.createElement("span");
    labelText.className = "fw-license-filter-label";
    labelText.textContent = option.label;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "fw-license-filter-input";
    input.dataset.licenseFilter = option.value;
    input.setAttribute("aria-label", `Filter by ${option.label}`);
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

function syncLicenseFilterBoxes() {
  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_RAIL_SELECTOR).forEach((rail) => {
    syncWebRailItemSectionIds(rail);
    rail.querySelector(":scope > .fw-filter-ai-linkmatch")?.remove();

    let box = rail.querySelector<HTMLElement>(`:scope > .${LICENSE_FILTER_BOX_CLASS}`);
    if (!box) box = createLicenseFilterBox();
    if (rail.firstElementChild !== box) rail.prepend(box);

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

function syncDisplayAiRailCount(
  panel: HTMLElement,
  selectedValue: DisplayAiFilterValue | null,
) {
  const displayRailItem = Array.from(
    panel.querySelectorAll<HTMLElement>(".fw-filter-rail-item"),
  ).find((railItem) => getRailItemSectionId(railItem) === "display");

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

  if (!selectedValue || nativeCount) {
    injectedCount?.remove();
    return;
  }

  if (injectedCount) return;

  const count = document.createElement("span");
  count.className = `fw-filter-rail-count ${DISPLAY_AI_RAIL_COUNT_CLASS}`;
  count.textContent = "1";

  const chevron = displayRailItem.querySelector(".fw-filter-rail-chevron");
  if (chevron) displayRailItem.insertBefore(count, chevron);
  else displayRailItem.appendChild(count);
}

function syncDisplayAiFilterOptions() {
  syncDisplayAiRootClasses();

  const selectedValue = getStoredDisplayAiFilter();

  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_PANEL_SELECTOR).forEach((panel) => {
    syncDisplayAiRailCount(panel, selectedValue);

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

function syncWebMusicFilterEnhancements(playlists: PlaylistFilterDecoration[]) {
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

    const observer = new MutationObserver(scheduleSync);

    syncEnhancements();
    window.requestAnimationFrame(syncEnhancements);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener(LICENSE_FILTER_CHANGE_EVENT, scheduleSync);

    return () => {
      if (syncFrame) window.cancelAnimationFrame(syncFrame);
      observer.disconnect();
      window.removeEventListener(LICENSE_FILTER_CHANGE_EVENT, scheduleSync);
    };
  }, [playlists]);

  return <SharedSideFilterPanelBehavior />;
}