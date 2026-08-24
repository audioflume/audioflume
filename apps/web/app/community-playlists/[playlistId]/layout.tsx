import type { ReactNode } from "react";
import RecentPlaylistTracker from "@/components/RecentPlaylistTracker";
import CommunityPlaylistDetailChrome from "./CommunityPlaylistDetailChrome";

export default function CommunityPlaylistDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <RecentPlaylistTracker />
      <CommunityPlaylistDetailChrome />
      {children}
    </>
  );
}
