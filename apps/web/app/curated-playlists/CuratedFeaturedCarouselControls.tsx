"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import CuratedPlaylistDetailChrome from "./CuratedPlaylistDetailChrome";
import CuratedPlaylistDetailMoreMenu from "./CuratedPlaylistDetailMoreMenu";

const FEATURED_PANEL_SELECTOR = ".curated-featured-playlist-image-panel";
const FEATURED_SECTION_SELECTOR = ".curated-featured-playlist";
const FEATURED_TRACKS_SELECTOR = ".curated-featured-playlist-tracks";
const FEATURED_COVER_LINK_SELECTOR = ".curated-featured-playlist-cover-link";
const FEATURED_TRACK_ROW_SELECTOR =
  ".curated-featured-playlist-track-list > article";
const PLAYLIST_CARD_LINK_SELECTOR = ".curated-playlist-card-copy";
const INDICATOR_SELECTOR = ".curated-featured-playlist-indicators button";
const NEXT_BUTTON_SELECTOR = ".curated-featured-playlist-next-button";

const CURATED_DETAIL_CONTROL_INSET_STYLE = `
  body:has(.playlist-detail-page)
    .playlist-detail-page
    .playlist-detail-shell {
    --playlist-detail-control-inset-left: 32px;
    --playlist-detail-control-inset-right: 32px;
  }

  @media (max-width: 720px) {
    body:has(.playlist-detail-page)
      .playlist-detail-page
      .playlist-detail-shell {
      --playlist-detail-control-inset-left: 20px;
      --playlist-detail-control-inset-right: 20px;
    }
  }
`;

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
  const [visibleSongCount, setVisibleSongCount] = useState(0);
  const [songsReady, setSongsReady] = useState(false);

  useLayoutEffect(() => {
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
        const nextVisibleSongCount =
          nextTrackPanel?.querySelectorAll(FEATURED_TRACK_ROW_SELECTOR).length ?? 0;

        setPanel(nextPanel);
        setTrackPanel(nextTrackPanel);
        setPlaylistCount(indicators.length);
        setActiveIndex(nextActiveIndex >= 0 ? nextActiveIndex : 0);
        setPlaylistHref(nextPlaylistHref);
        setSongCount(getRenderedSongCount(nextPlaylistHref));
        setVisibleSongCount(nextVisibleSongCount);
        setSongsReady(nextVisibleSongCount > 0);
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

  const remainingSongCount =
    songCount === null ? 0 : Math.max(songCount - visibleSongCount, 0);

  const songLinkPortal =
    trackPanel &&
    songsReady &&
    playlistHref &&
    remainingSongCount > 0
      ? createPortal(
          <Link
            href={playlistHref}
            className="curated-featured-playlist-show-all"
          >
            View {remainingSongCount} more{" "}
            {remainingSongCount === 1 ? "song" : "songs"}
          </Link>,
          trackPanel,
        )
      : null;

  return (
    <>
      <style>{CURATED_DETAIL_CONTROL_INSET_STYLE}</style>
      <CuratedPlaylistDetailChrome />
      <CuratedPlaylistDetailMoreMenu />
      {navigationPortal}
      {songLinkPortal}
    </>
  );
}
