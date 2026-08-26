"use client";

import { usePlaylists } from "@/hooks/usePlaylists";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function PlaylistRouteRefresh() {
  const pathname = usePathname();
  const { refetchPlaylists } = usePlaylists();
  const lastRefreshedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/playlists")) return;
    if (lastRefreshedPathRef.current === pathname) return;

    lastRefreshedPathRef.current = pathname;
    void refetchPlaylists();
  }, [pathname, refetchPlaylists]);

  return null;
}
