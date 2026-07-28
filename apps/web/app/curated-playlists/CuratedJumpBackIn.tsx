"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import RecentPlaylistTracker, {
  getRecentPlaylistKey,
  readRecentPlaylists,
  RECENT_PLAYLISTS_CHANGED_EVENT,
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

type RecentPlaylistCard = {
  key: string;
  href: string;
  name: string;
  coverImageUrl: string | null;
  metadata: string;
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

export default function CuratedJumpBackIn() {
  const pathname = usePathname();
  const isDiscoverPage = pathname === "/discover";
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [availablePlaylists, setAvailablePlaylists] = useState<
    RecentPlaylistCard[]
  >([]);
  const [recentEntries, setRecentEntries] = useState(readRecentPlaylists);

  useEffect(() => {
    if (!isDiscoverPage) return;

    let activeMount: HTMLElement | null = null;

    const syncMount = () => {
      const curatedSection = document.querySelector<HTMLElement>(
        ".discover-page-root .discover-curated-playlist-section",
      );
      if (!curatedSection?.parentElement) return;

      let mount = curatedSection.parentElement.querySelector<HTMLElement>(
        ":scope > .discover-jump-back-section",
      );

      if (!mount) {
        mount = document.createElement("section");
        mount.className = "discover-section discover-jump-back-section";
        mount.setAttribute(
          "aria-label",
          "Recently viewed playlists",
        );
      }

      if (curatedSection.previousElementSibling !== mount) {
        curatedSection.parentElement.insertBefore(mount, curatedSection);
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
  }, [isDiscoverPage]);

  useEffect(() => {
    if (!isDiscoverPage) return;

    let cancelled = false;

    async function loadPlaylists() {
      const [curatedData, communityData] = await Promise.all([
        fetchJson("/api/curated-playlists"),
        fetchJson("/api/community-playlists"),
      ]);

      if (cancelled) return;

      const curatedCards = Array.isArray(curatedData)
        ? curatedData.map(
            (playlist: CuratedPlaylist): RecentPlaylistCard => ({
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

      const communityPlaylists = Array.isArray(communityData?.playlists)
        ? (communityData.playlists as CommunityPlaylistSummary[])
        : [];
      const communityCards = communityPlaylists.map(
        (playlist): RecentPlaylistCard => ({
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
    }

    void loadPlaylists();

    return () => {
      cancelled = true;
    };
  }, [isDiscoverPage]);

  useEffect(() => {
    if (!isDiscoverPage) return;

    const syncRecentEntries = () => setRecentEntries(readRecentPlaylists());
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
  }, [isDiscoverPage]);

  const recentPlaylists = useMemo(() => {
    const playlistByKey = new Map(
      availablePlaylists.map((playlist) => [playlist.key, playlist]),
    );

    return recentEntries
      .map((entry) => playlistByKey.get(getRecentPlaylistKey(entry)))
      .filter((playlist): playlist is RecentPlaylistCard => Boolean(playlist));
  }, [availablePlaylists, recentEntries]);

  if (!isDiscoverPage || !mountNode || recentPlaylists.length === 0) {
    return <RecentPlaylistTracker />;
  }

  return (
    <>
      <RecentPlaylistTracker />
      {createPortal(
        <>
          <div className="discover-section-heading">
            <h2>Jump Back In</h2>
          </div>

          <div className="curated-jump-back-list">
            {recentPlaylists.map((playlist) => (
              <Link
                className="curated-jump-back-item"
                href={playlist.href}
                key={playlist.key}
              >
                {playlist.coverImageUrl ? (
                  <img
                    className="curated-jump-back-cover"
                    src={playlist.coverImageUrl}
                    alt=""
                  />
                ) : (
                  <span
                    className="curated-jump-back-placeholder"
                    aria-hidden="true"
                  />
                )}

                <span className="curated-jump-back-copy">
                  <strong>{playlist.name}</strong>
                  <small>{playlist.metadata}</small>
                </span>
              </Link>
            ))}
          </div>
        </>,
        mountNode,
      )}
    </>
  );
}
