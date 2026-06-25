"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

const descriptorPillClassName =
  "discover-dynamic-kicker-pill pointer-events-none absolute left-4 top-4 z-20 inline-flex h-[22px] w-fit max-w-[calc(100%-32px)] items-center rounded-full border border-white/20 bg-white/10 px-2.5 text-[10px] font-medium leading-none tracking-[0.04em] text-white/80 backdrop-blur";

const cornerArrowClassName =
  "discover-dynamic-corner-arrow pointer-events-none absolute right-4 top-4 z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition group-hover:bg-white group-hover:text-black";

const miniDescriptionClassName =
  "discover-dynamic-mini-description mt-2 max-w-[300px] text-xs leading-5 text-white/68";

function getCuratedPlaylistId(href: string | null) {
  if (!href) return null;

  const match = href.match(/\/curated-playlists\/(\d+)/);
  if (!match) return null;

  return Number(match[1]);
}

function createCornerArrow() {
  const arrow = document.createElement("span");
  arrow.className = cornerArrowClassName;
  arrow.setAttribute("aria-hidden", "true");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "13");
  svg.setAttribute("height", "13");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", "M7 17L17 7");
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-width", "2.2");
  line.setAttribute("stroke-linecap", "round");

  const corner = document.createElementNS("http://www.w3.org/2000/svg", "path");
  corner.setAttribute("d", "M9 7H17V15");
  corner.setAttribute("stroke", "currentColor");
  corner.setAttribute("stroke-width", "2.2");
  corner.setAttribute("stroke-linecap", "round");
  corner.setAttribute("stroke-linejoin", "round");

  svg.append(line, corner);
  arrow.append(svg);

  return arrow;
}

function removeExploreMoodButton(link: HTMLAnchorElement) {
  Array.from(link.querySelectorAll("div")).forEach((element) => {
    const text = element.textContent?.replace(/\s+/g, " ").trim();

    if (text === "Explore this mood") {
      element.remove();
    }
  });
}

function applyMiniDescription(link: HTMLAnchorElement, description: string) {
  const heading = link.querySelector("h3");
  if (!heading) return;

  let descriptionElement = link.querySelector<HTMLParagraphElement>(
    ".discover-dynamic-mini-description",
  );

  if (!descriptionElement) {
    descriptionElement = document.createElement("p");
    heading.insertAdjacentElement("afterend", descriptionElement);
  }

  if (descriptionElement.className !== miniDescriptionClassName) {
    descriptionElement.className = miniDescriptionClassName;
  }

  if (descriptionElement.textContent !== description) {
    descriptionElement.textContent = description;
  }
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

          if (playlist.discover_section !== "discover_block_1") {
            removeExploreMoodButton(link);
          }

          let pill = link.querySelector<HTMLSpanElement>(
            ".discover-dynamic-kicker-pill",
          );

          if (!pill) {
            pill = document.createElement("span");
            link.insertAdjacentElement("afterbegin", pill);
          }

          if (pill.className !== descriptorPillClassName) {
            pill.className = descriptorPillClassName;
          }

          if (pill.textContent !== kicker) {
            pill.textContent = kicker;
          }

          let cornerArrow = link.querySelector<HTMLSpanElement>(
            ".discover-dynamic-corner-arrow",
          );

          if (!cornerArrow) {
            cornerArrow = createCornerArrow();
            link.insertAdjacentElement("afterbegin", cornerArrow);
          }

          if (cornerArrow.className !== cornerArrowClassName) {
            cornerArrow.className = cornerArrowClassName;
          }

          const description = playlist?.description?.trim();
          if (description) applyMiniDescription(link, description);
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
        .querySelectorAll(
          ".discover-dynamic-kicker-pill, .discover-dynamic-corner-arrow, .discover-dynamic-mini-description",
        )
        .forEach((element) => element.remove());
    };
  }, [pathname]);

  return null;
}
