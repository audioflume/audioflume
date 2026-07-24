import type { ReactNode } from "react";
import CuratedJumpBackIn from "./CuratedJumpBackIn";

export default function CuratedPlaylistsTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CuratedJumpBackIn />
      {children}
    </>
  );
}
