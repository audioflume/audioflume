"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import "./curated-jump-back-in.css";

const STORAGE_KEY = "filmwave-recent-curated-playlists";
const RECENT_PLAYLIST_LIMIT = 5;

function readRecentIds() {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];

    return value
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, RECENT_PLAYLIST_LIMIT);
  } catch {
    return [];
  }
}

function storeRecentId(playlistId: number) {
  try {
    const nextIds = [
      playlistId,
      ...readRecentIds().filter((id) => id !== playlistId),
    ].slice(0, RECENT_PLAYLIST_LIMIT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
  } catch {
    // Playlist navigation should still work if local storage is unavailable.
  }
}

function formatPlaylistMetadata(playlist: CuratedPlaylist) {
  const metadata = [playlist.playlist_group];

  if (typeof playlist.song_count === "number") {
    metadata.push(
      `${playlist.song_count} song${playlist.song_count === 1 ? "" : "s"}`,
    );
  }

  return metadata.filter(Boolean).join(" · ");
}

export default function CuratedJumpBackIn() {
  const pathname = usePathname();
  const isDiscoverPage = pathname === "/discover";
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [recentIds, setRecentIds] = useState<number[]>([]);

  useEffect(() => {
    const match = pathname.match(/^\/curated-playlists\/(\d+)$/);
    if (match) storeRecentId(Number(match[1]));
  }, [pathname]);

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
          "Recently viewed curated playlists",
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

    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setPlaylists(
            data.filter(
              (playlist: CuratedPlaylist) => !playlist.discover_section,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isDiscoverPage]);

  useEffect(() => {
    if (!isDiscoverPage) return;

    const syncRecentIds = () => setRecentIds(readRecentIds());
    syncRecentIds();
    window.addEventListener("focus", syncRecentIds);
    window.addEventListener("pageshow", syncRecentIds);
    window.addEventListener("storage", syncRecentIds);

    return () => {
      window.removeEventListener("focus", syncRecentIds);
      window.removeEventListener("pageshow", syncRecentIds);
      window.removeEventListener("storage", syncRecentIds);
    };
  }, [isDiscoverPage]);

  const recentPlaylists = useMemo(
    () =>
      recentIds
        .map((id) => playlists.find((playlist) => playlist.id === id))
        .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist)),
    [playlists, recentIds],
  );

  if (!isDiscoverPage || !mountNode || recentPlaylists.length === 0) {
    return null;
  }

  return createPortal(
    <>
      <div className="discover-section-heading">
        <h2>Jump Back In</h2>
      </div>

      <div className="curated-jump-back-list">
        {recentPlaylists.map((playlist) => (
          <Link
            className="curated-jump-back-item"
            href={`/curated-playlists/${playlist.id}`}
            key={playlist.id}
          >
            {playlist.cover_image_url ? (
              <img
                className="curated-jump-back-cover"
                src={playlist.cover_image_url}
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
              <small>{formatPlaylistMetadata(playlist)}</small>
            </span>
          </Link>
        ))}
      </div>
    </>,
    mountNode,
  );
}
