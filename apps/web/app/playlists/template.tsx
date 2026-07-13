import type { ReactNode } from "react";
import PlaylistSidebarTabs from "./PlaylistSidebarTabs";

export default function PlaylistsTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <PlaylistSidebarTabs />
      {children}
    </>
  );
}
