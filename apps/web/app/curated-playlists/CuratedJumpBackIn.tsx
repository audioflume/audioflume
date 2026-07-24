"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import "./curated-jump-back-in.css";

const STORAGE_KEY = "filmwave-recent-curated-playlists";

function readRecentIds() {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];

    return value
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function storeRecentId(playlistId: number) {
  try {
    const nextIds = [
      playlistId,
      ...readRecentIds().filter((id) => id !== playlistId),
    ].slice(0, 5);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
  } catch {
    // Playlist navigation should still work if local storage is unavailable.
  }
}

export default function CuratedJumpBackIn() {
  const pathname = usePathname();
  const isLandingPage = pathname === "/curated-playlists";
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [recentIds, setRecentIds] = useState<number[]>([]);

  useEffect(() => {
    const match = pathname.match(/^\/curated-playlists\/(\d+)$/);
    if (match) storeRecentId(Number(match[1]));
  }, [pathname]);

  useEffect(() => {
    if (!isLandingPage) return;

    const syncMount = () => {
      const heading = document.querySelector<HTMLElement>(
        ".curated-playlists-page-root .curated-featured-playlist-heading",
      );
      if (!heading?.parentElement) return;

      let mount = heading.parentElement.querySelector<HTMLElement>(
        ":scope > .curated-jump-back-mount",
      );
      if (!mount) {
        mount = document.createElement("div");
        mount.className = "curated-jump-back-mount";
        heading.parentElement.insertBefore(mount, heading);
      }
      setMountNode(mount);
    };

    syncMount();
    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isLandingPage]);

  useEffect(() => {
    if (!isLandingPage) return;

    let cancelled = false;
    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setPlaylists(
            data.filter((playlist: CuratedPlaylist) => !playlist.discover_section),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isLandingPage]);

  useEffect(() => {
    if (!isLandingPage) return;

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
  }, [isLandingPage]);

  const recentPlaylists = useMemo(
    () =>
      recentIds
        .map((id) => playlists.find((playlist) => playlist.id === id))
        .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist)),
    [playlists, recentIds],
  );

  if (!isLandingPage || !mountNode || recentPlaylists.length === 0) return null;

  return createPortal(
    <section className="curated-jump-back" aria-label="Recently viewed curated playlists">
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
              <span className="curated-jump-back-placeholder" aria-hidden="true" />
            )}
            <span className="curated-jump-back-copy">
              <strong>{playlist.name}</strong>
              <small>
                {playlist.playlist_group}
                {typeof playlist.song_count === "number"
                  ? ` · ${playlist.song_count} song${playlist.song_count === 1 ? "" : "s"}`
                  : ""}
              </small>
            </span>
          </Link>
        ))}
      </div>
    </section>,
    mountNode,
  );
}
