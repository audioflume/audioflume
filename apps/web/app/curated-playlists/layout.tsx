import type { ReactNode } from "react";
import PlaylistTopControls from "../playlists/PlaylistTopControls";
import "./curated-playlists.css";

export default function CuratedPlaylistsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PlaylistTopControls />
      {children}
    </>
  );
}
