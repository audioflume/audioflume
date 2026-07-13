import type { ReactNode } from "react";
import PlaylistSidebarTabs from "../playlists/PlaylistSidebarTabs";

export default function CuratedPlaylistsTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <PlaylistSidebarTabs />
      {children}
    </>
  );
}
