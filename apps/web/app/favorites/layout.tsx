import type { ReactNode } from "react";
import PlaylistDetailBackdropEnhancer from "@/components/PlaylistDetailBackdropEnhancer";

export default function FavoritesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PlaylistDetailBackdropEnhancer />
      {children}
    </>
  );
}
