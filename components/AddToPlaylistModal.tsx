"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import Toast from "@/components/Toast";
import ModalShell from "@/components/ModalShell";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import { modalPrimaryButtonClass } from "@/components/uiClasses";

const RECENT_PLAYLIST_IDS_KEY = "filmwaveRecentPlaylistIds";
const RECENT_PLAYLIST_LIMIT = 3;

type AddToPlaylistModalProps = {
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
    const raw = window.localStorage.getItem(RECENT_PLAYLIST_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

function writeRecentPlaylistIds(ids: number[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(RECENT_PLAYLIST_IDS_KEY, JSON.stringify(ids));
}

export default function AddToPlaylistModal({
  isOpen,
  song,
  onClose,
}: AddToPlaylistModalProps) {
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  const {
    playlists,
    loading: playlistsLoading,
    error: playlistsError,
    refetchPlaylists,
  } = usePlaylists();

  const [recentPlaylistIds, setRecentPlaylistIds] = useState<number[]>([]);
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setRecentPlaylistIds(readRecentPlaylistIds());
  }, [isOpen]);

  useEffect(() => {
    if (!toastMessage) return;

    const timeout = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);

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
          `/api/songs/${encodeURIComponent(activeSong.id)}/playlists`,
        );
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load playlist selections");
        }

        if (!Array.isArray(data?.selected_playlist_ids)) {
          throw new Error("Invalid playlist selections response");
        }

        if (cancelled) return;

        const selected = new Set<number>(
          data.selected_playlist_ids.map((id: number | string) => Number(id)),
        );

        setInitialSelectedIds(selected);
        setSelectedIds(new Set(selected));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load playlist selections",
          );
          setInitialSelectedIds(new Set());
          setSelectedIds(new Set());
        }
      } finally {
        if (!cancelled) {
          setSelectedLoading(false);
        }
      }
    }

    loadSelectedPlaylists();

    return () => {
      cancelled = true;
    };
  }, [isOpen, song]);

  const displayedPlaylists = useMemo(() => {
    const recentIdSet = new Set(recentPlaylistIds);

    const recent = playlists
      .filter((playlist) => recentIdSet.has(playlist.id))
      .sort(
        (a, b) =>
          recentPlaylistIds.indexOf(a.id) - recentPlaylistIds.indexOf(b.id),
      );

    const remaining = playlists
      .filter((playlist) => !recentIdSet.has(playlist.id))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );

    return [...recent, ...remaining];
  }, [playlists, recentPlaylistIds]);

  const hasChanges = useMemo(() => {
    if (initialSelectedIds.size !== selectedIds.size) return true;

    for (const id of selectedIds) {
      if (!initialSelectedIds.has(id)) return true;
    }

    return false;
  }, [initialSelectedIds, selectedIds]);

  function togglePlaylist(playlistId: number) {
    if (selectedLoading) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }

      return next;
    });
  }

  function updateRecentPlaylists(addedPlaylistIds: number[]) {
    if (addedPlaylistIds.length === 0) return;

    const current = readRecentPlaylistIds();

    const next = [
      ...addedPlaylistIds,
      ...current.filter((id) => !addedPlaylistIds.includes(id)),
    ].slice(0, RECENT_PLAYLIST_LIMIT);

    writeRecentPlaylistIds(next);
    setRecentPlaylistIds(next);
  }

  async function handleSave() {
    if (!song || saving || selectedLoading) return;

    const activeSong = song;

    setSaving(true);
    setError(null);

    try {
      const addedPlaylistIds: number[] = [];
      const addedPlaylistNames: string[] = [];
      const removedPlaylistNames: string[] = [];

      const updates = playlists
        .map((playlist) => {
          const wasSelected = initialSelectedIds.has(playlist.id);
          const isSelected = selectedIds.has(playlist.id);

          if (wasSelected === isSelected) return null;

          if (isSelected) {
            addedPlaylistIds.push(playlist.id);
            addedPlaylistNames.push(playlist.name);
          } else {
            removedPlaylistNames.push(playlist.name);
          }

          return {
            playlist_id: playlist.id,
            selected: isSelected,
          };
        })
        .filter(
          (update): update is { playlist_id: number; selected: boolean } =>
            update !== null,
        );

      for (const update of updates) {
        const res = await fetch(
          `/api/songs/${encodeURIComponent(activeSong.id)}/playlists`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(update),
          },
        );

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to update playlist");
        }
      }

      setInitialSelectedIds(new Set(selectedIds));
      updateRecentPlaylists(addedPlaylistIds);

      if (addedPlaylistNames.length > 0 && removedPlaylistNames.length > 0) {
        setToastMessage(
          `Added to ${formatPlaylistNames(
            addedPlaylistNames,
          )} · Removed from ${formatPlaylistNames(removedPlaylistNames)}`,
        );
      } else if (addedPlaylistNames.length > 0) {
        setToastMessage(`Added to ${formatPlaylistNames(addedPlaylistNames)}`);
      } else if (removedPlaylistNames.length > 0) {
        setToastMessage(
          `Removed from ${formatPlaylistNames(removedPlaylistNames)}`,
        );
      }

      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save playlist changes",
      );
    } finally {
      setSaving(false);
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
        centerTitle
        maxHeight="480px"
        bodyScroll
        bodyClassName="flex flex-col pb-0"
        footerClassName="justify-center"
        footer={
          <button
            type="button"
            onClick={handleSave}
            className={`${modalPrimaryButtonClass} w-full`}
            disabled={saving || loading || selectedLoading || !hasChanges}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        }
      >
        {/* Song strip — -mx-5 px-5 extends border-b to modal edges */}
        <div className="-mx-5 mb-1 flex flex-shrink-0 items-center gap-3 border-b border-[var(--border)] pb-4 px-5">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-tertiary)]">
            {song.coverArt && (
              <Image
                src={song.coverArt}
                alt={song.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--text-primary)]">
              {song.title}
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {song.artist}
            </div>
          </div>
        </div>

        {/* Playlist rows — edge-to-edge, pb-2 only so rows clip flush at the border */}
        <div className="-mx-5 min-h-[200px] flex-1 overflow-y-auto px-2 pb-2">
          {/* Loading skeleton */}
          {(loading || selectedLoading) && (
            <div className="grid gap-0.5 pt-2">
              {Array.from({ length: playlists.length || 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex h-11 items-center gap-3 rounded-xl px-3"
                >
                  <div className="h-7 w-7 animate-pulse rounded-lg bg-[var(--bg-tertiary)]" />
                  <div className="h-2.5 w-28 animate-pulse rounded bg-[var(--bg-tertiary)]" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && !selectedLoading && displayedError && (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="text-xs font-medium text-[var(--danger)]">
                {displayedError}
              </div>

              {playlistsError && (
                <button
                  type="button"
                  onClick={refetchPlaylists}
                  className="h-8 rounded-md bg-[var(--text-primary)] px-3.5 text-xs font-semibold text-[var(--bg-primary)] transition hover:opacity-80"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading &&
            !selectedLoading &&
            !displayedError &&
            displayedPlaylists.length === 0 && (
              <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
                You don&apos;t have any playlists yet.
              </div>
            )}

          {/* Playlist rows */}
          {!loading &&
            !selectedLoading &&
            !displayedError &&
            displayedPlaylists.length > 0 &&
            displayedPlaylists.map((playlist) => {
              const isSelected = selectedIds.has(playlist.id);

              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => togglePlaylist(playlist.id)}
                  disabled={selectedLoading}
                  className={`group flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-70 ${
                    isSelected
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[var(--accent)] text-black"
                        : "bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--bg-hover-strong)] group-hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {isSelected ? (
                      <CheckIcon size={13} />
                    ) : (
                      <PlaylistIcon size={13} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1 truncate">{playlist.name}</span>
                </button>
              );
            })}
        </div>
      </ModalShell>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "96px" : "24px"}
      />
    </>
  );
}
