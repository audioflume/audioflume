"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  EDIT_POINT_MARKER_VISIBILITY_EVENT,
  EDIT_POINT_MARKER_VISIBILITY_STORAGE_KEY,
  getStoredEditPointMarkerVisibility,
  setStoredEditPointMarkerVisibility,
} from "@/lib/editPointMarkerVisibility";

export type PlaylistViewMode = "grid" | "list";
export type PlaylistSortMode = "custom" | "alphabetical";
export type SidebarProjectSortMode = "custom" | "alphabetical";
export type ProjectAssetAddTarget = "root" | "media_folder";
export type ThemeMode = "light" | "dark";

type UserPreferencesContextValue = {
  playlistViewMode: PlaylistViewMode;
  setPlaylistViewMode: (value: PlaylistViewMode) => void;

  playlistSortMode: PlaylistSortMode;
  setPlaylistSortMode: (value: PlaylistSortMode) => void;

  sidebarProjectSortMode: SidebarProjectSortMode;
  setSidebarProjectSortMode: (value: SidebarProjectSortMode) => void;

  projectAssetAddTarget: ProjectAssetAddTarget;
  setProjectAssetAddTarget: (value: ProjectAssetAddTarget) => void;

  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;

  showEditPointMarkers: boolean;
  setShowEditPointMarkers: (value: boolean) => void;

  preferencesLoaded: boolean;
};

type UserPreferencesResponse = {
  playlist_view_mode: PlaylistViewMode;
  playlist_sort_mode: PlaylistSortMode;
  sidebar_project_sort_mode: SidebarProjectSortMode;
  project_asset_add_target: ProjectAssetAddTarget;
  theme_mode: ThemeMode;
  show_edit_point_markers: boolean;
};

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

const LOCAL_PLAYLIST_VIEW_MODE_KEY = "filmwave-playlist-view-mode";
const LOCAL_PLAYLIST_SORT_MODE_KEY = "filmwave-playlist-sort-mode";
const LOCAL_SIDEBAR_PROJECT_SORT_MODE_KEY = "filmwave-sidebar-project-sort";
const LOCAL_PROJECT_ASSET_ADD_TARGET_KEY = "filmwave-project-asset-add-target";
const LOCAL_THEME_MODE_KEY = "filmwave-theme-mode";

function isPlaylistViewMode(value: unknown): value is PlaylistViewMode {
  return value === "grid" || value === "list";
}

function isPlaylistSortMode(value: unknown): value is PlaylistSortMode {
  return value === "custom" || value === "alphabetical";
}

function isSidebarProjectSortMode(
  value: unknown,
): value is SidebarProjectSortMode {
  return value === "custom" || value === "alphabetical";
}

function isProjectAssetAddTarget(
  value: unknown,
): value is ProjectAssetAddTarget {
  return value === "root" || value === "media_folder";
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function syncEditPointMarkerVisibilityDocumentState(visible: boolean) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.editPointMarkers = visible
    ? "visible"
    : "hidden";
}

function hasLocalEditPointMarkerVisibilityPreference() {
  if (typeof window === "undefined") return false;

  return (
    window.localStorage.getItem(EDIT_POINT_MARKER_VISIBILITY_STORAGE_KEY) !== null
  );
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [playlistViewMode, setPlaylistViewModeState] =
    useState<PlaylistViewMode>("grid");
  const [playlistSortMode, setPlaylistSortModeState] =
    useState<PlaylistSortMode>("custom");
  const [sidebarProjectSortMode, setSidebarProjectSortModeState] =
    useState<SidebarProjectSortMode>("alphabetical");
  const [projectAssetAddTarget, setProjectAssetAddTargetState] =
    useState<ProjectAssetAddTarget>("media_folder");
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [showEditPointMarkers, setShowEditPointMarkersState] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const storedVisibility = getStoredEditPointMarkerVisibility();
    syncEditPointMarkerVisibilityDocumentState(storedVisibility);
    setShowEditPointMarkersState(storedVisibility);
  }, []);

  useEffect(() => {
    syncEditPointMarkerVisibilityDocumentState(showEditPointMarkers);
  }, [showEditPointMarkers]);

  useEffect(() => {
    const syncMarkerVisibility = (event?: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      const visible =
        typeof customEvent?.detail?.visible === "boolean"
          ? customEvent.detail.visible
          : getStoredEditPointMarkerVisibility();

      syncEditPointMarkerVisibilityDocumentState(visible);
      setShowEditPointMarkersState(visible);
    };

    window.addEventListener(
      EDIT_POINT_MARKER_VISIBILITY_EVENT,
      syncMarkerVisibility,
    );
    window.addEventListener("storage", syncMarkerVisibility);

    return () => {
      window.removeEventListener(
        EDIT_POINT_MARKER_VISIBILITY_EVENT,
        syncMarkerVisibility,
      );
      window.removeEventListener("storage", syncMarkerVisibility);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const localPlaylistViewMode = window.localStorage.getItem(
          LOCAL_PLAYLIST_VIEW_MODE_KEY,
        );
        const localPlaylistSortMode = window.localStorage.getItem(
          LOCAL_PLAYLIST_SORT_MODE_KEY,
        );
        const localSidebarProjectSortMode = window.localStorage.getItem(
          LOCAL_SIDEBAR_PROJECT_SORT_MODE_KEY,
        );
        const localProjectAssetAddTarget = window.localStorage.getItem(
          LOCAL_PROJECT_ASSET_ADD_TARGET_KEY,
        );
        const localThemeMode =
          window.localStorage.getItem(LOCAL_THEME_MODE_KEY);
        const localShowEditPointMarkers = getStoredEditPointMarkerVisibility();

        if (!cancelled && isPlaylistViewMode(localPlaylistViewMode)) {
          setPlaylistViewModeState(localPlaylistViewMode);
        }

        if (!cancelled && isPlaylistSortMode(localPlaylistSortMode)) {
          setPlaylistSortModeState(localPlaylistSortMode);
        }

        if (
          !cancelled &&
          isSidebarProjectSortMode(localSidebarProjectSortMode)
        ) {
          setSidebarProjectSortModeState(localSidebarProjectSortMode);
        }

        if (
          !cancelled &&
          isProjectAssetAddTarget(localProjectAssetAddTarget)
        ) {
          setProjectAssetAddTargetState(localProjectAssetAddTarget);
        }

        if (!cancelled && isThemeMode(localThemeMode)) {
          setThemeModeState(localThemeMode);
        }

        if (!cancelled) {
          syncEditPointMarkerVisibilityDocumentState(localShowEditPointMarkers);
          setShowEditPointMarkersState(localShowEditPointMarkers);
          setPreferencesLoaded(true);
        }

        const res = await fetch("/api/user-preferences", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok || cancelled) return;

        const data = (await res.json()) as UserPreferencesResponse;

        if (isPlaylistViewMode(data.playlist_view_mode)) {
          setPlaylistViewModeState(data.playlist_view_mode);
          window.localStorage.setItem(
            LOCAL_PLAYLIST_VIEW_MODE_KEY,
            data.playlist_view_mode,
          );
        }

        if (isPlaylistSortMode(data.playlist_sort_mode)) {
          setPlaylistSortModeState(data.playlist_sort_mode);
          window.localStorage.setItem(
            LOCAL_PLAYLIST_SORT_MODE_KEY,
            data.playlist_sort_mode,
          );
        }

        if (isSidebarProjectSortMode(data.sidebar_project_sort_mode)) {
          setSidebarProjectSortModeState(data.sidebar_project_sort_mode);
          window.localStorage.setItem(
            LOCAL_SIDEBAR_PROJECT_SORT_MODE_KEY,
            data.sidebar_project_sort_mode,
          );
        }

        if (isProjectAssetAddTarget(data.project_asset_add_target)) {
          setProjectAssetAddTargetState(data.project_asset_add_target);
          window.localStorage.setItem(
            LOCAL_PROJECT_ASSET_ADD_TARGET_KEY,
            data.project_asset_add_target,
          );
        }

        if (isThemeMode(data.theme_mode)) {
          setThemeModeState(data.theme_mode);
          window.localStorage.setItem(LOCAL_THEME_MODE_KEY, data.theme_mode);
        }

        if (
          isBoolean(data.show_edit_point_markers) &&
          !hasLocalEditPointMarkerVisibilityPreference()
        ) {
          syncEditPointMarkerVisibilityDocumentState(data.show_edit_point_markers);
          setShowEditPointMarkersState(data.show_edit_point_markers);
          setStoredEditPointMarkerVisibility(data.show_edit_point_markers);
        }
      } catch (err) {
        console.error("Failed to load user preferences:", err);

        if (!cancelled) {
          setPreferencesLoaded(true);
        }
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  const patchPreferences = async (
    updates: Partial<UserPreferencesResponse>,
  ) => {
    try {
      const res = await fetch("/api/user-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        console.error("Failed to save user preferences:", await res.text());
      }
    } catch (err) {
      console.error("Failed to save user preferences:", err);
    }
  };

  const setPlaylistViewMode = (value: PlaylistViewMode) => {
    setPlaylistViewModeState(value);
    window.localStorage.setItem(LOCAL_PLAYLIST_VIEW_MODE_KEY, value);
    patchPreferences({ playlist_view_mode: value });
  };

  const setPlaylistSortMode = (value: PlaylistSortMode) => {
    setPlaylistSortModeState(value);
    window.localStorage.setItem(LOCAL_PLAYLIST_SORT_MODE_KEY, value);
    patchPreferences({ playlist_sort_mode: value });
  };

  const setSidebarProjectSortMode = (value: SidebarProjectSortMode) => {
    setSidebarProjectSortModeState(value);
    window.localStorage.setItem(LOCAL_SIDEBAR_PROJECT_SORT_MODE_KEY, value);
    patchPreferences({ sidebar_project_sort_mode: value });
  };

  const setProjectAssetAddTarget = (value: ProjectAssetAddTarget) => {
    setProjectAssetAddTargetState(value);
    window.localStorage.setItem(LOCAL_PROJECT_ASSET_ADD_TARGET_KEY, value);
    patchPreferences({ project_asset_add_target: value });
  };

  const setThemeMode = (value: ThemeMode) => {
    setThemeModeState(value);
    window.localStorage.setItem(LOCAL_THEME_MODE_KEY, value);
    patchPreferences({ theme_mode: value });
  };

  const setShowEditPointMarkers = (value: boolean) => {
    syncEditPointMarkerVisibilityDocumentState(value);
    setShowEditPointMarkersState(value);
    setStoredEditPointMarkerVisibility(value);
    patchPreferences({ show_edit_point_markers: value });
  };

  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      playlistViewMode,
      setPlaylistViewMode,
      playlistSortMode,
      setPlaylistSortMode,
      sidebarProjectSortMode,
      setSidebarProjectSortMode,
      projectAssetAddTarget,
      setProjectAssetAddTarget,
      themeMode,
      setThemeMode,
      showEditPointMarkers,
      setShowEditPointMarkers,
      preferencesLoaded,
    }),
    [
      playlistViewMode,
      playlistSortMode,
      sidebarProjectSortMode,
      projectAssetAddTarget,
      themeMode,
      showEditPointMarkers,
      preferencesLoaded,
    ],
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);

  if (!context) {
    throw new Error(
      "useUserPreferences must be used inside UserPreferencesProvider",
    );
  }

  return context;
}
