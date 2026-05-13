'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';

export type PlaylistViewMode = 'grid' | 'list';
export type PlaylistSortMode = 'custom' | 'alphabetical';
export type ThemeMode = 'light' | 'dark';

type UserPreferencesContextValue = {
  playlistViewMode: PlaylistViewMode;
  setPlaylistViewMode: (value: PlaylistViewMode) => void;

  playlistSortMode: PlaylistSortMode;
  setPlaylistSortMode: (value: PlaylistSortMode) => void;

  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;

  preferencesLoaded: boolean;
};

type UserPreferencesResponse = {
  playlist_view_mode: PlaylistViewMode;
  playlist_sort_mode: PlaylistSortMode;
  theme_mode: ThemeMode;
};

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

const LOCAL_PLAYLIST_VIEW_MODE_KEY = 'filmwave-playlist-view-mode';
const LOCAL_PLAYLIST_SORT_MODE_KEY = 'filmwave-playlist-sort-mode';
const LOCAL_THEME_MODE_KEY = 'filmwave-theme-mode';

function isPlaylistViewMode(value: unknown): value is PlaylistViewMode {
  return value === 'grid' || value === 'list';
}

function isPlaylistSortMode(value: unknown): value is PlaylistSortMode {
  return value === 'custom' || value === 'alphabetical';
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [playlistViewMode, setPlaylistViewModeState] = useState<PlaylistViewMode>('grid');
  const [playlistSortMode, setPlaylistSortModeState] = useState<PlaylistSortMode>('custom');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const localPlaylistViewMode = window.localStorage.getItem(LOCAL_PLAYLIST_VIEW_MODE_KEY);
        const localPlaylistSortMode = window.localStorage.getItem(LOCAL_PLAYLIST_SORT_MODE_KEY);
        const localThemeMode = window.localStorage.getItem(LOCAL_THEME_MODE_KEY);

        if (!cancelled && isPlaylistViewMode(localPlaylistViewMode)) {
          setPlaylistViewModeState(localPlaylistViewMode);
        }

        if (!cancelled && isPlaylistSortMode(localPlaylistSortMode)) {
          setPlaylistSortModeState(localPlaylistSortMode);
        }

        if (!cancelled && isThemeMode(localThemeMode)) {
          setThemeModeState(localThemeMode);
        }

        if (!cancelled) {
          setPreferencesLoaded(true);
        }

        const res = await fetch('/api/user-preferences', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok || cancelled) return;

        const data = await res.json() as UserPreferencesResponse;

        if (isPlaylistViewMode(data.playlist_view_mode)) {
          setPlaylistViewModeState(data.playlist_view_mode);
          window.localStorage.setItem(LOCAL_PLAYLIST_VIEW_MODE_KEY, data.playlist_view_mode);
        }

        if (isPlaylistSortMode(data.playlist_sort_mode)) {
          setPlaylistSortModeState(data.playlist_sort_mode);
          window.localStorage.setItem(LOCAL_PLAYLIST_SORT_MODE_KEY, data.playlist_sort_mode);
        }

        if (isThemeMode(data.theme_mode)) {
          setThemeModeState(data.theme_mode);
          window.localStorage.setItem(LOCAL_THEME_MODE_KEY, data.theme_mode);
        }
      } catch (err) {
        console.error('Failed to load user preferences:', err);

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

  const patchPreferences = async (updates: Partial<UserPreferencesResponse>) => {
    try {
      const res = await fetch('/api/user-preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        console.error('Failed to save user preferences:', await res.text());
      }
    } catch (err) {
      console.error('Failed to save user preferences:', err);
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

  const setThemeMode = (value: ThemeMode) => {
    setThemeModeState(value);
    window.localStorage.setItem(LOCAL_THEME_MODE_KEY, value);
    patchPreferences({ theme_mode: value });
  };

  const value = useMemo<UserPreferencesContextValue>(() => ({
    playlistViewMode,
    setPlaylistViewMode,
    playlistSortMode,
    setPlaylistSortMode,
    themeMode,
    setThemeMode,
    preferencesLoaded,
  }), [playlistViewMode, playlistSortMode, themeMode, preferencesLoaded]);

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);

  if (!context) {
    throw new Error('useUserPreferences must be used inside UserPreferencesProvider');
  }

  return context;
}