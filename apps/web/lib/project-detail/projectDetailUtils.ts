import type { ProjectAsset } from "@/lib/types";

export const TABS = [
  { label: "All Files", value: "overview" },
  { label: "Music", value: "music" },
  { label: "Sound FX", value: "sound-fx" },
  { label: "Visual FX", value: "visual-fx" },
  { label: "Colour Grading", value: "colour-grading" },
  { label: "Licenses", value: "licenses" },
] as const;

export const MEDIA_TAB_BY_ASSET_TYPE = {
  song: "music",
  "sound-fx": "sound-fx",
  "visual-fx": "visual-fx",
  "colour-grading": "colour-grading",
} as const;

const RESERVED_PROJECT_FOLDER_NAMES = new Set([
  "music",
  "sound fx",
  "visual fx",
  "colour grading",
]);

const LICENSE_ASSET_TYPES = new Set(["license", "licenses"]);

export const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

export type ProjectTab = (typeof TABS)[number]["value"];
export type ProjectSort = (typeof SORT_OPTIONS)[number]["value"];
export type ProjectFileView = "grid" | "list";
export type ProjectSyncState = "success" | "syncing" | "error";

function normalizeReservedProjectFolderName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isReservedProjectFolderName(value: string) {
  return RESERVED_PROJECT_FOLDER_NAMES.has(
    normalizeReservedProjectFolderName(value),
  );
}

export function isProjectTab(value: string | null): value is ProjectTab {
  return TABS.some((tab) => tab.value === value);
}

export function formatSyncTime(
  date: Date | null,
  state: ProjectSyncState,
) {
  if (state === "syncing") return "Syncing";
  if (state === "error") return "Sync error";

  if (!date) return "Last synced status ready";

  return `Last synced at ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function getTimestamp(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : null;
}

function hasProjectAssetType(projectAssets: ProjectAsset[], assetType: string) {
  return projectAssets.some((asset) => asset.asset_type === assetType);
}

export function getVisibleProjectTabs({
  projectAssets,
  projectSongsLength,
}: {
  projectAssets: ProjectAsset[];
  projectSongsLength: number;
}) {
  const hasMusic =
    projectSongsLength > 0 || hasProjectAssetType(projectAssets, "song");
  const hasLicenses = projectAssets.some((asset) =>
    LICENSE_ASSET_TYPES.has(String(asset.asset_type)),
  );

  const visibleTabs = TABS.filter((tab) => {
    if (tab.value === "overview") return true;
    if (tab.value === "music") return hasMusic;
    if (tab.value === "licenses") return hasLicenses;

    return hasProjectAssetType(projectAssets, tab.value);
  });

  const values = new Set<ProjectTab>(visibleTabs.map((tab) => tab.value));

  return {
    availableTabValues: values,
    visibleTabs,
  };
}
