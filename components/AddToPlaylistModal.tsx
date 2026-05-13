"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import Toast from "@/components/Toast";
import ModalShell, { modalPrimaryButtonClass } from "@/components/ModalShell";

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

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5V19"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlaylistIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 17H11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
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
        maxHeight="462px"
        bodyScroll
        bodyClassName="flex flex-col pb-0"
        footer={
          <button
            type="button"
            onClick={handleSave}
            className={modalPrimaryButtonClass}
            disabled={saving || loading || selectedLoading || !hasChanges}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        }
      >
        <style>{`
          .add-playlist-row:hover .add-playlist-action {
            background: var(--bg-primary);
            color: var(--text-primary);
          }

          .add-playlist-row.is-selected .add-playlist-action {
            background: var(--text-primary);
            color: var(--bg-primary);
          }
        `}</style>

        <div className="mb-3 flex flex-shrink-0 items-center gap-2.5 rounded-lg bg-[var(--bg-primary)] pl-2 pb-1.5">
          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-[var(--bg-tertiary)]">
            {song.coverArt && (
              <Image
                src={song.coverArt}
                alt={song.title}
                fill
                sizes="32px"
                className="object-cover"
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-[var(--text-primary)]">
              {song.title}
            </div>

            <div className="mt-0.5 truncate text-[11px] text-[var(--text-subtle)]">
              {song.artist}
            </div>
          </div>
        </div>

        <div className="-mx-4 min-h-0 flex-1 overflow-y-auto border-t border-[var(--border)] px-4 pt-3">
          {loading && (
            <div className="grid gap-1.5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex h-9 items-center gap-2.5 rounded-lg px-2.5"
                >
                  <div className="h-5 w-5 rounded-md bg-[var(--bg-tertiary)]" />
                  <div className="h-2.5 w-32 bg-[var(--bg-tertiary)]" />
                </div>
              ))}
            </div>
          )}

          {!loading && displayedError && (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg bg-[var(--bg-primary)] px-4 text-center">
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

          {!loading && !displayedError && displayedPlaylists.length === 0 && (
            <div className="flex min-h-[180px] items-center justify-center rounded-lg bg-[var(--bg-primary)] px-4 text-center text-xs text-[var(--text-secondary)]">
              You don&apos;t have any playlists yet.
            </div>
          )}

          {!loading &&
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
                  className={`add-playlist-row group flex h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 text-left text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-70 ${
                    isSelected
                      ? "is-selected bg-[var(--bg-hover-strong)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition ${
                        isSelected
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                          : "bg-[var(--bg-primary)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <PlaylistIcon />
                    </span>

                    <span className="min-w-0 truncate">{playlist.name}</span>
                  </span>

                  <span
                    className={`add-playlist-action flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition ${
                      isSelected
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {isSelected ? <CheckIcon /> : <PlusIcon />}
                  </span>
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
