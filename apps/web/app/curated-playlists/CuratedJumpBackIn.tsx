"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import RecentPlaylistCards, {
  type RecentPlaylistCardItem,
} from "@/components/RecentPlaylistCards";
import RecentPlaylistTracker, {
  getRecentPlaylistKey,
  readRecentPlaylists,
  RECENT_PLAYLISTS_CHANGED_EVENT,
  type RecentPlaylistEntry,
} from "@/components/RecentPlaylistTracker";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import "./curated-jump-back-in.css";

type CommunityPlaylistSummary = {
  id: number;
  name: string;
  cover_image_url: string | null;
  song_count: number;
  creator?: {
    name?: string;
  };
};

type CuratedJumpBackInProps = {
  inline?: boolean;
  placement?: "content" | "hero";
};

function formatSongCount(count: number | undefined) {
  if (typeof count !== "number") return "";
  return `${count} song${count === 1 ? "" : "s"}`;
}

function formatCuratedMetadata(playlist: CuratedPlaylist) {
  return [playlist.playlist_group, formatSongCount(playlist.song_count)]
    .filter(Boolean)
    .join(" · ");
}

function formatCommunityMetadata(playlist: CommunityPlaylistSummary) {
  const source = playlist.creator?.name
    ? `By ${playlist.creator.name}`
    : "Community";

  return [source, formatSongCount(playlist.song_count)]
    .filter(Boolean)
    .join(" · ");
}

async function fetchJson(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export default function CuratedJumpBackIn({
  inline = false,
  placement = "content",
}: CuratedJumpBackInProps) {
  const pathname = usePathname();
  const isDiscoverPage = pathname === "/discover";
  const isCuratedPage = pathname === "/curated-playlists";
  const renderInline = inline && isDiscoverPage && placement === "hero";
  const isSupportedPage = renderInline || isCuratedPage;
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [availablePlaylists, setAvailablePlaylists] = useState<
    RecentPlaylistCardItem[]
  >([]);
  const [recentEntries, setRecentEntries] = useState<RecentPlaylistEntry[]>([]);
  const [recentEntriesLoaded, setRecentEntriesLoaded] = useState(false);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);

  useEffect(() => {
    if (!isCuratedPage) return;

    let activeMount: HTMLElement | null = null;

    const syncMount = () => {
      const featureFilters = document.querySelector<HTMLElement>(
        ".curated-playlists-page-root .curated-feature-filters",
      );
      if (!featureFilters?.parentElement) return;

      let mount = featureFilters.parentElement.querySelector<HTMLElement>(
        ":scope > .curated-last-viewed-section",
      );

      if (!mount) {
        mount = document.createElement("section");
        mount.className = "curated-last-viewed-section";
        mount.setAttribute(
          "aria-label",
          "Recently viewed curated playlists",
        );
      }

      if (featureFilters.nextElementSibling !== mount) {
        featureFilters.insertAdjacentElement("afterend", mount);
      }

      activeMount = mount;
      setMountNode(mount);
    };

    syncMount();
    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      activeMount?.remove();
      setMountNode(null);
    };
  }, [isCuratedPage]);

  useEffect(() => {
    if (!isSupportedPage) return;

    let cancelled = false;
    setPlaylistsLoaded(false);

    async function loadPlaylists() {
      const curatedData = await fetchJson("/api/curated-playlists");

      if (cancelled) return;

      const curatedCards = Array.isArray(curatedData)
        ? curatedData.map(
            (playlist: CuratedPlaylist): RecentPlaylistCardItem => ({
              key: getRecentPlaylistKey({
                type: "curated",
                id: playlist.id,
              }),
              href: `/curated-playlists/${playlist.id}`,
              name: playlist.name,
              coverImageUrl: playlist.cover_image_url,
              metadata: formatCuratedMetadata(playlist),
            }),
          )
        : [];

      if (isCuratedPage) {
        setAvailablePlaylists(curatedCards);
        setPlaylistsLoaded(true);
        return;
      }

      const communityData = await fetchJson("/api/community-playlists");

      if (cancelled) return;

      const communityPlaylists = Array.isArray(communityData?.playlists)
        ? (communityData.playlists as CommunityPlaylistSummary[])
        : [];
      const communityCards = communityPlaylists.map(
        (playlist): RecentPlaylistCardItem => ({
          key: getRecentPlaylistKey({
            type: "community",
            id: playlist.id,
          }),
          href: `/community-playlists/${playlist.id}`,
          name: playlist.name,
          coverImageUrl: playlist.cover_image_url,
          metadata: formatCommunityMetadata(playlist),
        }),
      );

      setAvailablePlaylists([...curatedCards, ...communityCards]);
      setPlaylistsLoaded(true);
    }

    void loadPlaylists();

    return () => {
      cancelled = true;
    };
  }, [isCuratedPage, isSupportedPage]);

  useEffect(() => {
    if (!isSupportedPage) return;

    const syncRecentEntries = () => {
      setRecentEntries(readRecentPlaylists());
      setRecentEntriesLoaded(true);
    };

    syncRecentEntries();
    window.addEventListener("focus", syncRecentEntries);
    window.addEventListener("pageshow", syncRecentEntries);
    window.addEventListener("storage", syncRecentEntries);
    window.addEventListener(
      RECENT_PLAYLISTS_CHANGED_EVENT,
      syncRecentEntries,
    );

    return () => {
      window.removeEventListener("focus", syncRecentEntries);
      window.removeEventListener("pageshow", syncRecentEntries);
      window.removeEventListener("storage", syncRecentEntries);
      window.removeEventListener(
        RECENT_PLAYLISTS_CHANGED_EVENT,
        syncRecentEntries,
      );
    };
  }, [isSupportedPage]);

  const recentPlaylists = useMemo(() => {
    const playlistByKey = new Map(
      availablePlaylists.map((playlist) => [playlist.key, playlist]),
    );
    const visibleEntries = isCuratedPage
      ? recentEntries.filter((entry) => entry.type === "curated")
      : recentEntries;

    return visibleEntries
      .map((entry) => playlistByKey.get(getRecentPlaylistKey(entry)))
      .filter(
        (playlist): playlist is RecentPlaylistCardItem => Boolean(playlist),
      )
      .slice(0, 5);
  }, [availablePlaylists, isCuratedPage, recentEntries]);

  if (!isSupportedPage) return <RecentPlaylistTracker />;

  const isInlineLoading =
    renderInline && (!recentEntriesLoaded || !playlistsLoaded);
  const headingClassName =
    renderInline && placement === "hero"
      ? "discover-hero-last-viewed-heading curated-last-viewed-heading"
      : "discover-section-heading curated-last-viewed-heading";
  const content = (
    <>
      <div className={headingClassName}>
        <h2>Jump Back In</h2>
      </div>

      <RecentPlaylistCards
        playlists={recentPlaylists}
        loading={isInlineLoading}
        variant={placement === "hero" ? "hero" : "default"}
      />
    </>
  );

  if (renderInline) {
    if (!isInlineLoading && recentPlaylists.length === 0) {
      return <RecentPlaylistTracker />;
    }

    return (
      <>
        <RecentPlaylistTracker />
        <section
          className={
            placement === "hero"
              ? "discover-hero-last-viewed-section"
              : "discover-section discover-jump-back-section"
          }
          aria-label="Recently viewed playlists"
          aria-busy={isInlineLoading}
        >
          {content}
        </section>
      </>
    );
  }

  if (!mountNode || recentPlaylists.length === 0) {
    return <RecentPlaylistTracker />;
  }

  return (
    <>
      <RecentPlaylistTracker />
      {createPortal(content, mountNode)}
    </>
  );
}
