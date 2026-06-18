import type { ReactNode } from "react";
import PlaylistTabsRail from "./PlaylistTabsRail";
import "./playlists-tabs-rail.css";

export default function PlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PlaylistTabsRail />
      {children}
    </>
  );
}
