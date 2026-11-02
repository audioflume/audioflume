"use client";

import type { ReactNode } from "react";
import { useHasCurrentSong } from "@/context/PlayerContext";

export default function FoundingHeroPlayerHeight({ children }: { children: ReactNode }) {
  const hasPlayer = useHasCurrentSong();
  return <section className={`af-founding-hero${hasPlayer ? " has-player" : ""}`} aria-labelledby="af-founding-title">{children}</section>;
}
