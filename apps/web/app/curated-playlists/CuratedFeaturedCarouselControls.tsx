"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import styles from "./curated-playlists-loading.module.css";

const FEATURED_PANEL_SELECTOR = ".curated-featured-playlist-image-panel";
const FEATURED_SECTION_SELECTOR = ".curated-featured-playlist";
const FEATURED_TRACKS_SELECTOR = ".curated-featured-playlist-tracks";
const FEATURED_COVER_LINK_SELECTOR = ".curated-featured-playlist-cover-link";
const FEATURED_TRACK_ROW_SELECTOR =
  ".curated-featured-playlist-track-list > article";
const PLAYLIST_CARD_LINK_SELECTOR = ".curated-playlist-card-copy";
const INDICATOR_SELECTOR = ".curated-featured-playlist-indicators button";
const NEXT_BUTTON_SELECTOR = ".curated-featured-playlist-next-button";

function getRenderedSongCount(href: string) {
  if (!href) return null;

  const playlistLink = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(PLAYLIST_CARD_LINK_SELECTOR),
  ).find((link) => link.getAttribute("href") === href);
  const countText = playlistLink?.querySelector("p")?.textContent?.trim() ?? "";
  const countMatch = countText.match(/^(\d+)/);

  return countMatch ? Number(countMatch[1]) : null;
}

export default function CuratedFeaturedCarouselControls() {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [trackPanel, setTrackPanel] = useState<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);
  const [playlistHref, setPlaylistHref] = useState("");
  const [songCount, setSongCount] = useState<number | null>(null);
  const [songsReady, setSongsReady] = useState(false);

  useLayoutEffect(() => {
    let frame = 0;
    const body = document.body;

    body.classList.add(styles.skeletonStyles);

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
        setSongCount(getRenderedSongCount(nextPlaylistHref));
        setSongsReady(Boolean(nextTrackPanel?.querySelector(FEATURED_TRACK_ROW_SELECTOR)));
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
      body.classList.remove(styles.skeletonStyles);
    };
  }, []);

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
    trackPanel &&
    songsReady &&
    playlistHref &&
    songCount !== null &&
    songCount > 0
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
