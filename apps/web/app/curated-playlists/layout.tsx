import type { ReactNode } from "react";
import DiscoverLayout from "../discover/layout";
import "./curated-playlists.css";

export default function CuratedPlaylistsLayout({ children }: { children: ReactNode }) {
  return <DiscoverLayout>{children}</DiscoverLayout>;
}
