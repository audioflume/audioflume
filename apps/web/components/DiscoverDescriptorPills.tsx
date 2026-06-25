"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

const descriptorPillClassName =
  "discover-dynamic-kicker-pill mb-3 inline-flex h-[22px] w-fit max-w-full items-center rounded-full border border-white/20 bg-white/10 px-2.5 text-[10px] font-medium leading-none tracking-[0.04em] text-white/80 backdrop-blur";

function getCuratedPlaylistId(href: string | null) {
  if (!href) return null;

  const match = href.match(/\/curated-playlists\/(\d+)/);
  if (!match) return null;

  return Number(match[1]);
}

export default function DiscoverDescriptorPills() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/discover") return;

    let cancelled = false;
    let observer: MutationObserver | null = null;

    async function renderDescriptorPills() {
      let playlists: CuratedPlaylist[] = [];

      try {
        const response = await fetch("/api/curated-playlists");
        const data = await response.json();

        if (Array.isArray(data)) playlists = data as CuratedPlaylist[];
      } catch {
        return;
      }

      if (cancelled) return;

      const discoverBlocksById = new Map(
        playlists
          .filter((playlist) =>
            playlist.discover_section?.startsWith("discover_block_"),
          )
          .map((playlist) => [playlist.id, playlist]),
      );

      function applyDescriptorPills() {
        const visualDiscoverySection = document.querySelector(
          "main > section > div > section:first-child",
        );

        if (!visualDiscoverySection) return;

        const links = Array.from(
          visualDiscoverySection.querySelectorAll<HTMLAnchorElement>(
            'a[href^="/curated-playlists/"]',
          ),
        );

        links.forEach((link) => {
          const playlistId = getCuratedPlaylistId(link.getAttribute("href"));
          if (!playlistId) return;

          const playlist = discoverBlocksById.get(playlistId);
          const kicker = playlist?.kicker?.trim();
          if (!kicker) return;

          const heading = link.querySelector("h1, h2, h3");
          if (!heading) return;

          let pill = link.querySelector<HTMLSpanElement>(
            ".discover-dynamic-kicker-pill",
          );

          if (!pill) {
            pill = document.createElement("span");
            pill.className = descriptorPillClassName;
            heading.insertAdjacentElement("beforebegin", pill);
          }

          if (pill.textContent !== kicker) {
            pill.textContent = kicker;
          }
        });
      }

      applyDescriptorPills();

      observer = new MutationObserver(applyDescriptorPills);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    renderDescriptorPills();

    return () => {
      cancelled = true;
      observer?.disconnect();
      document
        .querySelectorAll(".discover-dynamic-kicker-pill")
        .forEach((pill) => pill.remove());
    };
  }, [pathname]);

  return null;
}
