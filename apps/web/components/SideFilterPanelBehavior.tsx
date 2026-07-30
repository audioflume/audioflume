"use client";

import { useLayoutEffect } from "react";
import { SideFilterPanelBehavior as SharedSideFilterPanelBehavior } from "@filmwave/shared";

import { usePlaylists } from "@/hooks/usePlaylists";

const LINKMATCH_BUTTON_CLASS = "fw-filter-ai-linkmatch";
const WEB_MUSIC_FILTER_PANEL_SELECTOR =
  "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-filter-panel-wrap";
const WEB_MUSIC_FILTER_RAIL_SELECTOR =
  "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-filter-rail";
const DISPLAY_AI_FILTER_OPTION_CLASS = "fw-display-ai-filter-option";
const DISPLAY_AI_FILTER_STORAGE_KEY = "filmwave-display-ai-filter";
const DISPLAY_AI_EXCLUDE_ROOT_CLASS = "fw-display-exclude-ai-songs";
const DISPLAY_AI_ONLY_ROOT_CLASS = "fw-display-ai-songs-only";
const PLAYLIST_FILTER_OPTION_CLASS = "fw-filter-playlist-option";
const PUBLIC_PLAYLIST_FILTER_OPTION_CLASS = "is-public-playlist";

const DISPLAY_AI_FILTER_OPTIONS = [
  { value: "exclude", label: "Human made" },
  { value: "only", label: "AI songs only" },
] as const;

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

function createLinkMatchButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = LINKMATCH_BUTTON_CLASS;
  button.dataset.feature = "desktop-sync";
  button.setAttribute("aria-label", "Open Desktop Sync companion app");
  button.innerHTML = `
    <span class="fw-filter-ai-linkmatch-copy">
      <span class="fw-filter-ai-linkmatch-title-row">
        <span class="fw-filter-ai-linkmatch-title">Desktop Sync</span>
        <span class="fw-filter-ai-linkmatch-pill">App</span>
      </span>
      <span class="fw-filter-ai-linkmatch-detail-row">
        <span class="fw-filter-ai-linkmatch-detail">Save songs, sync locally</span>
        <span class="fw-filter-ai-linkmatch-arrow" aria-hidden="true">↗</span>
      </span>
    </span>
  `;

  return button;
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

function syncDisplayAiFilterOptions() {
  syncDisplayAiRootClasses();

  const selectedValue = getStoredDisplayAiFilter();

  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_PANEL_SELECTOR).forEach((panel) => {
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

function syncLinkMatchRailButtons() {
  document.querySelectorAll<HTMLElement>(WEB_MUSIC_FILTER_RAIL_SELECTOR).forEach((rail) => {
    syncWebRailItemSectionIds(rail);

    let button = rail.querySelector<HTMLButtonElement>(`:scope > .${LINKMATCH_BUTTON_CLASS}`);

    if (!button) button = createLinkMatchButton();
    if (rail.firstElementChild !== button) rail.prepend(button);
  });
}

function syncWebMusicFilterEnhancements(playlists: PlaylistFilterDecoration[]) {
  syncLinkMatchRailButtons();
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

    return () => {
      if (syncFrame) window.cancelAnimationFrame(syncFrame);
      observer.disconnect();
    };
  }, [playlists]);

  return <SharedSideFilterPanelBehavior />;
}
