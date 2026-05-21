"use client";

import { useTheme } from "@/context/ThemeContext";
import {
  useUserPreferences,
  type PlaylistSortMode,
  type PlaylistViewMode,
  type SidebarProjectSortMode,
  type ThemeMode,
} from "@/context/UserPreferencesContext";
import {
  Card,
  CardTitle,
  Option,
  PlaylistSortIcon,
  PlaylistViewIcon,
  Row,
  SidebarSortIcon,
  ThemeIcon,
} from "../AccountUI";

export default function SettingsSection() {
  const { theme, setTheme } = useTheme();
  const {
    playlistViewMode,
    setPlaylistViewMode,
    playlistSortMode,
    setPlaylistSortMode,
    sidebarProjectSortMode,
    setSidebarProjectSortMode,
    preferencesLoaded,
  } = useUserPreferences();

  return (
    <Card>
      <CardTitle
        title="Global preferences"
        description={preferencesLoaded ? "Preferences loaded from your account." : "Loading saved preferences..."}
      />
      <Row icon={<ThemeIcon />} title="Theme" description="Controls the light or dark appearance across Filmwave.">
        <Option<ThemeMode> label="Dark" value="dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
        <Option<ThemeMode> label="Light" value="light" active={theme === "light"} onClick={() => setTheme("light")} />
      </Row>
      <Row icon={<PlaylistViewIcon />} title="Playlist view" description="Sets the default layout for your personal playlist library.">
        <Option<PlaylistViewMode> label="Grid" value="grid" active={playlistViewMode === "grid"} onClick={() => setPlaylistViewMode("grid")} />
        <Option<PlaylistViewMode> label="List" value="list" active={playlistViewMode === "list"} onClick={() => setPlaylistViewMode("list")} />
      </Row>
      <Row icon={<PlaylistSortIcon />} title="Playlist sorting" description="Choose whether playlists use your custom drag order or stay alphabetical.">
        <Option<PlaylistSortMode> label="Custom" value="custom" active={playlistSortMode === "custom"} onClick={() => setPlaylistSortMode("custom")} />
        <Option<PlaylistSortMode> label="Alphabetical" value="alphabetical" active={playlistSortMode === "alphabetical"} onClick={() => setPlaylistSortMode("alphabetical")} />
      </Row>
      <Row icon={<SidebarSortIcon />} title="Sidebar project sorting" description="Controls how projects are ordered inside the main app sidebar.">
        <Option<SidebarProjectSortMode> label="Custom" value="custom" active={sidebarProjectSortMode === "custom"} onClick={() => setSidebarProjectSortMode("custom")} />
        <Option<SidebarProjectSortMode> label="Alphabetical" value="alphabetical" active={sidebarProjectSortMode === "alphabetical"} onClick={() => setSidebarProjectSortMode("alphabetical")} />
      </Row>
    </Card>
  );
}
