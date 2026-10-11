"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Toast from "@/components/Toast";
import { BackendButton } from "@/components/backend/BackendControls";
import ModalShell from "@/components/ModalShell";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

const RECENT_ADMIN_PLAYLIST_IDS_KEY = "filmwaveRecentAdminPlaylistIds";
const RECENT_PLAYLIST_LIMIT = 3;

type AdminAddToPlaylistModalProps = {
  isOpen: boolean;
  song: Song | null;
  onClose: () => void;
};

function formatPlaylistNames(names: string[]) {
  return names.map((name) => `"${name}"`).join(", ");
}

function readRecentPlaylistIds() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_ADMIN_PLAYLIST_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

function writeRecentPlaylistIds(ids: number[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_ADMIN_PLAYLIST_IDS_KEY, JSON.stringify(ids));
}

export default function AdminAddToPlaylistModal({
  isOpen,
  song,
  onClose,
}: AdminAddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState("");
  const [recentPlaylistIds, setRecentPlaylistIds] = useState<number[]>(() =>
    readRecentPlaylistIds(),
  );
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function refetchPlaylists() {
    try {
      setPlaylistsLoading(true);
      setPlaylistsError("");
      const res = await fetch("/api/admin/curated-playlists");
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to load playlists");
      if (!Array.isArray(data)) throw new Error("Invalid playlists response");

      setPlaylists(data);
    } catch (err) {
      setPlaylistsError(err instanceof Error ? err.message : "Failed to load playlists");
    } finally {
      setPlaylistsLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    setRecentPlaylistIds(readRecentPlaylistIds());
    setSearch("");
    const timeout = window.setTimeout(() => {
      refetchPlaylists();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!isOpen || !song) return;

    const activeSong = song;
    let cancelled = false;

    async function loadSelectedPlaylists() {
      setSelectedLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/admin/songs/${encodeURIComponent(activeSong.id)}/curated-playlists`,
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to load playlist selections");
        if (!Array.isArray(data?.selected_playlist_ids)) {
          throw new Error("Invalid playlist selections response");
        }

        if (!cancelled) {
          const selected = new Set<number>(
            data.selected_playlist_ids.map((id: number | string) => Number(id)),
          );
          setSelectedIds(new Set(selected));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load playlist selections");
          setSelectedIds(new Set());
        }
      } finally {
        if (!cancelled) setSelectedLoading(false);
      }
    }

    loadSelectedPlaylists();
    return () => {
      cancelled = true;
    };
  }, [isOpen, song]);

  const displayedPlaylists = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredPlaylists = playlists.filter((playlist) => {
      if (!query) return true;
      return [playlist.name, playlist.kicker, playlist.description].some(
        (value) => String(value || "").toLowerCase().includes(query),
      );
    });
    const recentIdSet = new Set(recentPlaylistIds);
    const recent = filteredPlaylists
      .filter((playlist) => recentIdSet.has(playlist.id))
      .sort((a, b) => recentPlaylistIds.indexOf(a.id) - recentPlaylistIds.indexOf(b.id));
    const remaining = filteredPlaylists
      .filter((playlist) => !recentIdSet.has(playlist.id))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return [...recent, ...remaining];
  }, [playlists, recentPlaylistIds, search]);

  function updateRecentPlaylists(playlistId: number) {
    const current = readRecentPlaylistIds();
    const next = [
      playlistId,
      ...current.filter((id) => id !== playlistId),
    ].slice(0, RECENT_PLAYLIST_LIMIT);
    writeRecentPlaylistIds(next);
    setRecentPlaylistIds(next);
  }

  async function togglePlaylist(playlist: CuratedPlaylist) {
    if (!song || selectedLoading) return;

    const wasSelected = selectedIds.has(playlist.id);
    const nextSelected = !wasSelected;

    setError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (nextSelected) next.add(playlist.id);
      else next.delete(playlist.id);
      return next;
    });

    try {
      const res = await fetch(
        `/api/admin/songs/${encodeURIComponent(song.id)}/curated-playlists`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlist_id: playlist.id,
            selected: nextSelected,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update playlist");

      if (nextSelected) {
        updateRecentPlaylists(playlist.id);
        setToastMessage(`Added to "${playlist.name}"`);
      } else {
        setToastMessage(`Removed from "${playlist.name}"`);
      }
    } catch (err) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (wasSelected) next.add(playlist.id);
        else next.delete(playlist.id);
        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to update playlist");
    }
  }

  if (!song) return null;

  const loading = playlistsLoading;
  const displayedError = error || playlistsError;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        title="Add to Playlist"
        onClose={onClose}
        closeLabel="Close add to playlist modal"
        maxHeight="506px"
        bodyClassName="flex min-h-0 flex-1 flex-col px-7 pb-0"
        contentClassName="h-[506px] max-h-[calc(100vh-64px)]"
      >
        <div className="flex flex-shrink-0 items-center justify-center px-7 pb-5 pt-0 text-center">
          <div className="mx-auto flex min-w-0 items-center justify-center gap-2">
            <span
              className="relative block shrink-0 overflow-hidden rounded-none bg-[var(--bg-secondary)]"
              style={{ width: "24px", height: "24px", minWidth: "24px", minHeight: "24px" }}
            >
              {song.coverArt ? (
                <Image
                  src={song.coverArt}
                  alt={song.title}
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                  <PlaylistIcon size={10} />
                </span>
              )}
            </span>
            <span className="block max-w-[300px] truncate text-[12px] font-normal tracking-[-0.015em] text-[var(--text-primary)]">
              {song.title} by {song.artist}
            </span>
          </div>
        </div>

        <div className="-mx-7 flex min-h-0 flex-1 flex-col bg-[var(--bg-primary)] px-5">
          <label className="flex h-12 flex-shrink-0 items-center gap-3 bg-[var(--bg-hover)] px-4 text-[var(--text-muted)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search playlists"
              className="h-full min-w-0 flex-1 !rounded-none !border-0 !bg-transparent p-0 text-sm text-[var(--text-primary)] !outline-none placeholder:text-[var(--text-muted)] focus:!border-0"
            />
          </label>

          <div className="min-h-0 flex-1 overflow-y-auto pb-5 pt-2.5">
            {(loading || selectedLoading) ? (
              <div className="grid gap-1">
                {Array.from({ length: playlists.length || 6 }).map((_, index) => (
                  <div key={index} className="flex min-h-[58px] items-center justify-between gap-3 p-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-[var(--bg-hover)]" />
                      <div className="h-3 w-32 bg-[var(--bg-hover)]" />
                    </div>
                    <div className="h-5 w-5 bg-[var(--bg-hover)]" />
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && !selectedLoading && displayedError ? (
              <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="text-xs font-medium text-[var(--danger)]">{displayedError}</div>
                {playlistsError ? (
                  <BackendButton type="button" compact onClick={refetchPlaylists}>
                    Try Again
                  </BackendButton>
                ) : null}
              </div>
            ) : null}

            {!loading && !selectedLoading && !displayedError && displayedPlaylists.length === 0 ? (
              <div className="flex min-h-full items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
                {search.trim()
                  ? "No curated playlists match your search."
                  : "No curated playlists yet. Create one in Playlist Manager."}
              </div>
            ) : null}

            {!loading && !selectedLoading && !displayedError ? (
              <div className="grid gap-1">
                {displayedPlaylists.map((playlist) => {
                  const isSelected = selectedIds.has(playlist.id);
                  return (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => togglePlaylist(playlist)}
                      disabled={selectedLoading}
                      className={`group flex min-h-[58px] w-full items-center gap-3 rounded-none p-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-70 ${
                        isSelected
                          ? "bg-[var(--bg-hover)]"
                          : "cursor-pointer hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-none bg-[var(--bg-hover)] text-[var(--text-muted)]">
                        {playlist.cover_image_url ? (
                          <Image
                            src={playlist.cover_image_url}
                            alt={playlist.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <PlaylistIcon size={13} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-normal leading-[1.35] text-[var(--text-primary)]">
                          {playlist.name}
                        </span>
                        <span className="mt-[2px] block truncate text-[11.5px] leading-[1.35] text-[var(--text-subtle)]">
                          {isSelected ? "Added" : "Click to add"}
                        </span>
                      </span>
                      {isSelected ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-primary)]">
                          <CheckIcon size={16} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </ModalShell>

      <Toast message={toastMessage} bottomOffset="96px" />
    </>
  );
}
