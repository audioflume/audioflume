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

type RgbColor = [number, number, number];

type CoverPalette = {
  backA: string;
  backB: string;
  middleA: string;
  middleB: string;
};

const paletteCache = new Map<string, Promise<CoverPalette>>();

const FALLBACK_PALETTES: CoverPalette[] = [
  {
    backA: "rgb(72, 50, 92)",
    backB: "rgb(25, 27, 29)",
    middleA: "rgb(70, 62, 76)",
    middleB: "rgb(20, 22, 23)",
  },
  {
    backA: "rgb(87, 59, 48)",
    backB: "rgb(27, 25, 23)",
    middleA: "rgb(75, 61, 57)",
    middleB: "rgb(24, 22, 21)",
  },
  {
    backA: "rgb(67, 78, 67)",
    backB: "rgb(25, 27, 25)",
    middleA: "rgb(70, 76, 68)",
    middleB: "rgb(23, 25, 23)",
  },
  {
    backA: "rgb(57, 73, 82)",
    backB: "rgb(23, 27, 29)",
    middleA: "rgb(62, 77, 81)",
    middleB: "rgb(22, 25, 26)",
  },
];

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

function getFallbackPalette(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return FALLBACK_PALETTES[hash % FALLBACK_PALETTES.length];
}

function colorToCss([red, green, blue]: RgbColor) {
  return `rgb(${red}, ${green}, ${blue})`;
}

function mixColor(color: RgbColor, target: RgbColor, amount: number): RgbColor {
  return [
    Math.round(color[0] + (target[0] - color[0]) * amount),
    Math.round(color[1] + (target[1] - color[1]) * amount),
    Math.round(color[2] + (target[2] - color[2]) * amount),
  ];
}

function averageRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
): RgbColor {
  let red = 0;
  let green = 0;
  let blue = 0;
  let weightTotal = 0;

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = data[offset + 3] / 255;

      if (alpha < 0.45) continue;

      const pixelRed = data[offset];
      const pixelGreen = data[offset + 1];
      const pixelBlue = data[offset + 2];
      const maxChannel = Math.max(pixelRed, pixelGreen, pixelBlue);
      const minChannel = Math.min(pixelRed, pixelGreen, pixelBlue);
      const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
      const luminance = (pixelRed * 0.299 + pixelGreen * 0.587 + pixelBlue * 0.114) / 255;
      const weight = alpha * (0.55 + saturation * 0.45) * (0.65 + luminance * 0.35);

      red += pixelRed * weight;
      green += pixelGreen * weight;
      blue += pixelBlue * weight;
      weightTotal += weight;
    }
  }

  if (weightTotal <= 0) return [42, 42, 42];

  return [
    Math.round(red / weightTotal),
    Math.round(green / weightTotal),
    Math.round(blue / weightTotal),
  ];
}

function buildPaletteFromImage(image: HTMLImageElement): CoverPalette {
  const canvas = document.createElement("canvas");
  const size = 36;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not read playlist cover colours");

  context.drawImage(image, 0, 0, size, size);

  const imageData = context.getImageData(0, 0, size, size).data;
  const half = Math.floor(size / 2);

  const topLeft = averageRegion(imageData, size, size, 0, half, 0, half);
  const topRight = averageRegion(imageData, size, size, half, size, 0, half);
  const bottomLeft = averageRegion(imageData, size, size, 0, half, half, size);
  const bottomRight = averageRegion(imageData, size, size, half, size, half, size);

  return {
    backA: colorToCss(mixColor(topLeft, [12, 12, 12], 0.38)),
    backB: colorToCss(mixColor(bottomRight, [10, 10, 10], 0.52)),
    middleA: colorToCss(mixColor(topRight, [16, 16, 16], 0.28)),
    middleB: colorToCss(mixColor(bottomLeft, [12, 12, 12], 0.44)),
  };
}

function sampleCoverPalette(coverSrc: string) {
  const cachedPalette = paletteCache.get(coverSrc);
  if (cachedPalette) return cachedPalette;

  const palettePromise = new Promise<CoverPalette>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      try {
        resolve(buildPaletteFromImage(image));
      } catch {
        resolve(getFallbackPalette(coverSrc));
      }
    };

    image.onerror = () => {
      resolve(getFallbackPalette(coverSrc));
    };

    image.src = coverSrc;
  });

  paletteCache.set(coverSrc, palettePromise);
  return palettePromise;
}

function applyPalette(artwork: HTMLElement, palette: CoverPalette) {
  artwork.style.setProperty("--playlist-layer-back-a", palette.backA);
  artwork.style.setProperty("--playlist-layer-back-b", palette.backB);
  artwork.style.setProperty("--playlist-layer-middle-a", palette.middleA);
  artwork.style.setProperty("--playlist-layer-middle-b", palette.middleB);
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
    });

    if (artwork.dataset.coverPaletteSrc === coverSrc && artwork.classList.contains("has-cover-layers")) {
      return;
    }

    artwork.classList.remove("has-cover-layers");
    artwork.dataset.coverPaletteSrc = coverSrc;

    sampleCoverPalette(coverSrc).then((palette) => {
      if (artwork.dataset.coverPaletteSrc !== coverSrc) return;

      applyPalette(artwork, palette);
      artwork.classList.add("has-cover-layers");
      artwork
        .querySelectorAll(".playlist-gallery-art-layer")
        .forEach((layer) => layer.classList.add("is-ready"));
    });
  });
}

function syncPlaylistGalleryMenus() {
  const cards = document.querySelectorAll<HTMLElement>(
    ".playlists-page .playlist-gallery-card:not(.is-reordering)",
  );

  cards.forEach((card) => {
    const title = card.querySelector<HTMLHeadingElement>(".playlist-gallery-content h3");
    const artwork = card.querySelector<HTMLElement>(".playlist-gallery-art");
    const menuWrap = card.querySelector<HTMLElement>(":scope > .playlist-card-menu-wrap");
    const menuButton = menuWrap?.querySelector<HTMLElement>(".playlist-menu-btn-grid");

    if (!title || !artwork || !menuWrap || !menuButton) return;

    const cardRect = card.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const artworkRect = artwork.getBoundingClientRect();
    const top = titleRect.top - cardRect.top + (titleRect.height - 18) / 2 - 1;
    const left = artworkRect.right - cardRect.left - 18;

    menuWrap.style.position = "absolute";
    menuWrap.style.top = `${Math.max(0, top)}px`;
    menuWrap.style.left = `${Math.max(0, left)}px`;
    menuWrap.style.right = "auto";
    menuWrap.style.bottom = "auto";
    menuWrap.style.width = "18px";
    menuWrap.style.height = "18px";
    menuWrap.style.zIndex = "8";

    menuButton.style.width = "18px";
    menuButton.style.height = "18px";
    menuButton.style.minWidth = "18px";
    menuButton.style.padding = "0";
    menuButton.style.border = "0";
    menuButton.style.borderRadius = "0";
    menuButton.style.background = "transparent";
    menuButton.style.backgroundColor = "transparent";
    menuButton.style.backgroundImage = "none";
    menuButton.style.boxShadow = "none";
    menuButton.style.backdropFilter = "none";
    menuButton.style.setProperty("-webkit-backdrop-filter", "none");
  });
}

function syncOpenPlaylistDropdownPlacement() {
  const openButton = document.querySelector<HTMLElement>(
    ".playlists-page .playlist-menu-btn-grid.is-open",
  );

  if (!openButton) return false;

  const dropdowns = Array.from(
    document.querySelectorAll<HTMLElement>(".filmwave-dropdown-shell"),
  );
  const dropdown = dropdowns
    .reverse()
    .find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

  if (!dropdown) return false;

  const buttonRect = openButton.getBoundingClientRect();
  const dropdownRect = dropdown.getBoundingClientRect();
  const left = Math.max(16, buttonRect.right - dropdownRect.width);
  const top = Math.max(68, dropdownRect.top);

  dropdown.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
  dropdown.style.transformOrigin = "top right";
  document.body.classList.remove("is-positioning-playlist-menu");

  return true;
}

function schedulePlaylistDropdownPlacement() {
  let attempts = 0;

  const tryPosition = () => {
    attempts += 1;
    const didPosition = syncOpenPlaylistDropdownPlacement();

    if (!didPosition && attempts < 6) {
      window.requestAnimationFrame(tryPosition);
      return;
    }

    window.setTimeout(() => {
      document.body.classList.remove("is-positioning-playlist-menu");
    }, 120);
  };

  window.requestAnimationFrame(tryPosition);
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
    syncPlaylistGalleryMenus();
    schedulePlaylistDropdownPlacement();

    const timeout = window.setTimeout(() => {
      syncPlaylistCoverLayers();
      syncPlaylistGalleryMenus();
      schedulePlaylistDropdownPlacement();
    }, 100);
    const resizeHandler = () => {
      syncPlaylistGalleryMenus();
      schedulePlaylistDropdownPlacement();
    };
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest(".playlist-menu-btn-grid")) {
        document.body.classList.add("is-positioning-playlist-menu");
      }

      schedulePlaylistDropdownPlacement();
    };
    const target = document.querySelector(".playlists-page") || document.body;
    const observer = new MutationObserver(() => {
      syncPlaylistCoverLayers();
      syncPlaylistGalleryMenus();
      schedulePlaylistDropdownPlacement();
    });

    window.addEventListener("resize", resizeHandler);
    document.addEventListener("click", clickHandler, true);
    observer.observe(target, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", resizeHandler);
      document.removeEventListener("click", clickHandler, true);
      document.body.classList.remove("is-positioning-playlist-menu");
      observer.disconnect();
    };
  }, [pathname, activeTab]);

  return (
    <>
      <style>{`
        body.is-positioning-playlist-menu .filmwave-dropdown-shell {
          visibility: hidden !important;
        }
      `}</style>
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
    </>
  );
}
