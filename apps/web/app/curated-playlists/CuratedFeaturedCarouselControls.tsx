"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import ChevronRightIcon from "@/components/icons/ChevronRightIcon";

const FEATURED_PANEL_SELECTOR = ".curated-featured-playlist-image-panel";
const FEATURED_SECTION_SELECTOR = ".curated-featured-playlist";
const FEATURED_TRACKS_SELECTOR = ".curated-featured-playlist-tracks";
const FEATURED_COVER_LINK_SELECTOR = ".curated-featured-playlist-cover-link";
const INDICATOR_SELECTOR = ".curated-featured-playlist-indicators button";
const NEXT_BUTTON_SELECTOR = ".curated-featured-playlist-next-button";

function getPlaylistId(href: string) {
  const match = href.match(/\/curated-playlists\/([^/?#]+)/);
  return match?.[1] ?? "";
}

export default function CuratedFeaturedCarouselControls() {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [trackPanel, setTrackPanel] = useState<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);
  const [playlistHref, setPlaylistHref] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [songCount, setSongCount] = useState<number | null>(null);

  useEffect(() => {
    let frame = 0;

    function syncControls() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextPanel = document.querySelector<HTMLElement>(
          FEATURED_PANEL_SELECTOR,
        );
        const featuredSection = nextPanel?.closest<HTMLElement>(
          FEATURED_SECTION_SELECTOR,
        );
        const nextTrackPanel =
          featuredSection?.querySelector<HTMLElement>(FEATURED_TRACKS_SELECTOR) ??
          null;
        const coverLink =
          featuredSection?.querySelector<HTMLAnchorElement>(
            FEATURED_COVER_LINK_SELECTOR,
          ) ?? null;
        const nextPlaylistHref = coverLink?.getAttribute("href") ?? "";
        const indicators = Array.from(
          nextPanel?.querySelectorAll<HTMLButtonElement>(INDICATOR_SELECTOR) ?? [],
        );
        const nextActiveIndex = indicators.findIndex(
          (button) => button.getAttribute("aria-pressed") === "true",
        );

        setPanel(nextPanel);
        setTrackPanel(nextTrackPanel);
        setPlaylistCount(indicators.length);
        setActiveIndex(nextActiveIndex >= 0 ? nextActiveIndex : 0);
        setPlaylistHref(nextPlaylistHref);
        setPlaylistId(getPlaylistId(nextPlaylistHref));
      });
    }

    const observer = new MutationObserver(syncControls);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["aria-pressed", "href"],
    });

    syncControls();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (!playlistId) {
      setSongCount(null);
      return () => controller.abort();
    }

    setSongCount(null);

    fetch(
      `/api/curated-playlists/${encodeURIComponent(playlistId)}/songs`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load playlist songs");
        return response.json();
      })
      .then((songs) => {
        setSongCount(Array.isArray(songs) ? songs.length : 0);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSongCount(null);
      });

    return () => controller.abort();
  }, [playlistId]);

  function selectOffset(offset: number) {
    if (!panel) return;

    const indicators = Array.from(
      panel.querySelectorAll<HTMLButtonElement>(INDICATOR_SELECTOR),
    );
    if (indicators.length === 0) return;

    const nextIndex =
      (activeIndex + offset + indicators.length) % indicators.length;
    indicators[nextIndex]?.click();
  }

  const navigationPortal =
    panel &&
    playlistCount > 1 &&
    panel.querySelector(NEXT_BUTTON_SELECTOR)
      ? createPortal(
          <div
            className="curated-featured-playlist-navigation"
            aria-label="Featured playlist navigation"
          >
            <button
              type="button"
              className="curated-featured-playlist-navigation-button is-previous"
              aria-label="Show previous featured playlist"
              onClick={() => selectOffset(-1)}
            >
              <ChevronRightIcon size={14} />
            </button>
            <button
              type="button"
              className="curated-featured-playlist-navigation-button"
              aria-label="Show next featured playlist"
              onClick={() => selectOffset(1)}
            >
              <ChevronRightIcon size={14} />
            </button>
            <span
              className="curated-featured-playlist-navigation-count"
              aria-live="polite"
            >
              {activeIndex + 1}/{playlistCount}
            </span>
          </div>,
          panel,
        )
      : null;

  const songLinkPortal =
    trackPanel && playlistHref && songCount !== null && songCount > 0
      ? createPortal(
          <Link
            href={playlistHref}
            className="curated-featured-playlist-show-all"
          >
            Show all {songCount} {songCount === 1 ? "song" : "songs"}
          </Link>,
          trackPanel,
        )
      : null;

  return (
    <>
      {navigationPortal}
      {songLinkPortal}
    </>
  );
}
