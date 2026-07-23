import type { ReactNode } from "react";
import CommunityPlaylistDetailChrome from "./CommunityPlaylistDetailChrome";

export default function CommunityPlaylistDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CommunityPlaylistDetailChrome />
      {children}
    </>
  );
}
