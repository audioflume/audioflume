import type { ReactNode } from "react";
import PlaylistDetailBackdropEnhancer from "@/components/PlaylistDetailBackdropEnhancer";
import RecentPlaylistTracker from "@/components/RecentPlaylistTracker";
import CommunityPlaylistDetailChrome from "./CommunityPlaylistDetailChrome";

export default function CommunityPlaylistDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <PlaylistDetailBackdropEnhancer />
      <RecentPlaylistTracker />
      <CommunityPlaylistDetailChrome />
      {children}
    </>
  );
}
