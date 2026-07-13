import type { ReactNode } from "react";
import CuratedHeaderScrollState from "./CuratedHeaderScrollState";
import "./curated-playlists.css";

export default function CuratedPlaylistsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CuratedHeaderScrollState />
      {children}
    </>
  );
}
