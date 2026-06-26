"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const PLAYLIST_TABS = [
  { label: "My Playlists", value: "my-playlists", href: "/playlists" },
  {
    label: "Curated Collections",
    value: "curated-collections",
    href: "/curated-playlists",
  },
  {
    label: "Community Playlists",
    value: "community-playlists",
    href: "/playlists?tab=community-playlists",
  },
] as const;

function PlaylistTabChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.6 5.3a1.3 1.3 0 0 1 1.84.04l5.5 5.76a1.3 1.3 0 0 1 0 1.8l-5.5 5.76a1.3 1.3 0 0 1-1.88-1.8L13.2 12 8.56 7.14a1.3 1.3 0 0 1 .04-1.84Z"
      />
    </svg>
  );
}

function syncPlaylistCoverLayers() {
  const artworkNodes = document.querySelectorAll<HTMLElement>(
    ".playlists-page .playlist-gallery-art",
  );

  artworkNodes.forEach((artwork) => {
    const coverImage = artwork.querySelector<HTMLImageElement>(
      ":scope > img:not(.playlist-gallery-art-layer-image)",
    );
    const coverSrc = coverImage?.currentSrc || coverImage?.src || "";

    if (!coverSrc) {
      artwork.classList.remove("has-cover-layers");
      artwork
        .querySelectorAll(".playlist-gallery-art-layer")
        .forEach((layer) => layer.remove());
      return;
    }

    (["back", "middle"] as const).forEach((layerName) => {
      let layer = artwork.querySelector<HTMLSpanElement>(
        `:scope > .playlist-gallery-art-layer-${layerName}`,
      );

      if (!layer) {
        layer = document.createElement("span");
        layer.className = `playlist-gallery-art-layer playlist-gallery-art-layer-${layerName}`;
        layer.setAttribute("aria-hidden", "true");
        artwork.insertBefore(layer, coverImage);
      }

      let layerImage = layer.querySelector<HTMLSpanElement>(
        ":scope > .playlist-gallery-art-layer-image",
      );

      if (!layerImage) {
        layerImage = document.createElement("span");
        layerImage.className = "playlist-gallery-art-layer-image";
        layer.append(layerImage);
      }

      if (layer.dataset.coverSrc === coverSrc && layer.classList.contains("is-ready")) {
        return;
      }

      layer.classList.remove("is-ready");
      layer.dataset.coverSrc = coverSrc;
      layer.style.backgroundImage = "none";
      layerImage.style.backgroundImage = "none";

      const preloadImage = new Image();
      preloadImage.onload = () => {
        if (layer.dataset.coverSrc !== coverSrc) return;
        layerImage.style.backgroundImage = `url(${JSON.stringify(coverSrc)})`;
        layer.classList.add("is-ready");
        artwork.classList.add("has-cover-layers");
      };
      preloadImage.onerror = () => {
        layer.classList.remove("is-ready");
      };
      preloadImage.src = coverSrc;
    });
  });
}

export default function PlaylistTabsRail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = pathname?.startsWith("/curated-playlists")
    ? "curated-collections"
    : searchParams.get("tab") || "my-playlists";

  useEffect(() => {
    if (!pathname || pathname.startsWith("/curated-playlists")) return;

    syncPlaylistCoverLayers();

    const timeout = window.setTimeout(syncPlaylistCoverLayers, 100);
    const target = document.querySelector(".playlists-page") || document.body;
    const observer = new MutationObserver(syncPlaylistCoverLayers);

    observer.observe(target, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [pathname, activeTab]);

  return (
    <nav className="playlists-tabs-row fw-filter-rail" aria-label="Playlist sections">
      {PLAYLIST_TABS.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <Link
            key={tab.value}
            href={tab.href}
            className={`fw-filter-rail-item${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="fw-filter-rail-label">{tab.label}</span>
            <span className="fw-filter-rail-chevron" aria-hidden="true">
              <PlaylistTabChevronIcon />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
