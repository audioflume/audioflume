"use client";

import type { Playlist, Song } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { usePlaylists } from "@/hooks/usePlaylists";
import Toast from "@/components/Toast";
import ModalShell from "@/components/ModalShell";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import { toSmartTitleCaseInput } from "@/lib/smartTitleCase";

const RECENT_PLAYLIST_IDS_KEY = "filmwaveRecentPlaylistIds";
const RECENT_PLAYLIST_LIMIT = 3;

const PLAYLIST_FALLBACK_GRADIENTS = [
  "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)",
  "linear-gradient(135deg,#1f3d3a 0%,#111111 52%,#4d8c7b 100%)",
  "linear-gradient(135deg,#4f3529 0%,#111111 50%,#b66c45 100%)",
  "linear-gradient(135deg,#25364f 0%,#111111 52%,#6287c4 100%)",
  "linear-gradient(135deg,#45233d 0%,#111111 52%,#b75d91 100%)",
];

type AddToPlaylistModalProps = {
  isOpen: boolean;
  song: Song | null;
  onClose: () => void;
};

type PlaylistResponseBody = {
  error?: string;
  selected_playlist_ids?: Array<number | string>;
  cover_image_url?: string | null;
};

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

async function readJsonResponse<T>(
  res: Response,
  fallbackMessage: string,
): Promise<T | null> {
  const text = await res.text();

  if (!text.trim()) return null;

  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(fallbackMessage);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(fallbackMessage);
  }
}

function PlaylistThumbnail({
  playlist,
  index,
}: {
  playlist: Playlist;
  index: number;
}) {
  const cover = typeof playlist.cover_image_url === "string" && playlist.cover_image_url.trim()
    ? playlist.cover_image_url
    : null;

  return (
    <span
      className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-none bg-[var(--bg-tertiary)]"
      style={{
        background: cover
          ? "var(--bg-tertiary)"
          : PLAYLIST_FALLBACK_GRADIENTS[index % PLAYLIST_FALLBACK_GRADIENTS.length],
      }}
    >
      {cover ? (
        // Use <img> instead of Next/Image so any URL source works (R2, Unsplash, etc.)
        <img
          src={cover}
          alt={playlist.name}
          className="absolute inset-0 block h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
          <PlaylistIcon size={13} />
        </span>
      )}
    </span>
  );
}

function SongPreview({ song }: { song: Song }) {
  const cover = typeof song.coverArt === "string" && song.coverArt.trim()
    ? song.coverArt
    : null;

  return (
    <div className="flex flex-shrink-0 items-center justify-center px-7 pb-5 pt-0 text-center">
      <div className="mx-auto flex min-w-0 items-center justify-center gap-2">
        <span
          className="relative block shrink-0 overflow-hidden rounded-none bg-[var(--bg-secondary)]"
          style={{ width: "24px", height: "24px", minWidth: "24px", minHeight: "24px" }}
        >
          {cover ? (
            <img
              src={cover}
              alt={song.title}
              className="h-full w-full object-cover"
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
  );
}

export default function AddToPlaylistModal({
  isOpen,
  song,
  onClose,
}: AddToPlaylistModalProps) {
  const {
    playlists,
    setPlaylists,
    loading: playlistsLoading,
    error: playlistsError,
    refetchPlaylists,
  } = usePlaylists();

  const [recentPlaylistIds, setRecentPlaylistIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [pendingPlaylistIds, setPendingPlaylistIds] = useState<Set<number>>(new Set());
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState("");
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
        const data = await readJsonResponse<PlaylistResponseBody>(
          res,
          res.ok ? "Invalid playlist response" : "Failed to load playlist selections",
        );

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load playlist selections");
        }

        if (!Array.isArray(data?.selected_playlist_ids)) {
          throw new Error("Invalid playlist selections response");
        }

        if (cancelled) return;

        setSelectedIds(
          new Set<number>(
            data.selected_playlist_ids.map((id: number | string) => Number(id)),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load playlist selections",
          );
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

    const ordered = [...recent, ...remaining];
    const query = playlistSearch.trim().toLowerCase();

    if (!query) return ordered;

    return ordered.filter((playlist) =>
      playlist.name.toLowerCase().includes(query),
    );
  }, [playlists, recentPlaylistIds, playlistSearch]);

  function updateRecentPlaylists(playlistId: number) {
    const current = readRecentPlaylistIds();

    const next = [
      playlistId,
      ...current.filter((id) => id !== playlistId),
    ].slice(0, RECENT_PLAYLIST_LIMIT);

    writeRecentPlaylistIds(next);
    setRecentPlaylistIds(next);
  }

  function updatePlaylistCover(playlistId: number, coverImageUrl?: string | null) {
    if (!coverImageUrl) return;

    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === playlistId
          ? { ...playlist, cover_image_url: coverImageUrl }
          : playlist,
      ),
    );
  }

  function handleClose() {
    if (creatingPlaylist) return;

    setNewPlaylistOpen(false);
    setNewPlaylistName("");
    setPlaylistSearch("");
    setError(null);
    onClose();
  }

  async function updateSongPlaylist(playlistId: number, selected: boolean) {
    if (!song) throw new Error("Missing song");

    const res = await fetch(
      `/api/songs/${encodeURIComponent(song.id)}/playlists`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_id: playlistId,
          selected,
          cover_image_url: song.coverArt,
        }),
      },
    );

    const data = await readJsonResponse<PlaylistResponseBody>(
      res,
      res.ok ? "Invalid playlist response" : "Failed to update playlist",
    );

    if (!res.ok) {
      throw new Error(data?.error || "Failed to update playlist");
    }

    updatePlaylistCover(playlistId, data?.cover_image_url);
  }

  async function handlePlaylistClick(playlist: Playlist) {
    if (!song || selectedLoading || pendingPlaylistIds.has(playlist.id) || creatingPlaylist) return;

    const wasSelected = selectedIds.has(playlist.id);
    const nextSelected = !wasSelected;

    setPendingPlaylistIds((current) => new Set(current).add(playlist.id));
    setError(null);
    setSelectedIds((current) => {
      const next = new Set(current);

      if (nextSelected) next.add(playlist.id);
      else next.delete(playlist.id);

      return next;
    });

    try {
      await updateSongPlaylist(playlist.id, nextSelected);

      if (nextSelected) {
        updateRecentPlaylists(playlist.id);
        setToastMessage(`Added to "${playlist.name}"`);
      } else {
        setToastMessage(`Removed from "${playlist.name}"`);
      }
    } catch (err) {
      setSelectedIds((current) => {
        const next = new Set(current);

        if (wasSelected) next.add(playlist.id);
        else next.delete(playlist.id);

        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to update playlist");
    } finally {
      setPendingPlaylistIds((current) => {
        const next = new Set(current);
        next.delete(playlist.id);
        return next;
      });
    }
  }

  async function handleCreatePlaylist() {
    if (!song || creatingPlaylist || !newPlaylistName.trim()) return;

    const cleanName = newPlaylistName.trim();

    setCreatingPlaylist(true);
    setError(null);

    try {
      const createRes = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          position: playlists.length,
        }),
      });

      const createdPlaylist = await readJsonResponse<Playlist & { error?: string }>(
        createRes,
        createRes.ok ? "Invalid playlist response" : "Failed to create playlist",
      );

      if (!createRes.ok || !createdPlaylist?.id) {
        throw new Error(createdPlaylist?.error || "Failed to create playlist");
      }

      await updateSongPlaylist(createdPlaylist.id, true);

      const coverImageUrl =
        typeof song.coverArt === "string" && song.coverArt.trim()
          ? song.coverArt.trim()
          : createdPlaylist.cover_image_url;

      setPlaylists((current) => [
        ...current,
        { ...createdPlaylist, cover_image_url: coverImageUrl },
      ]);
      setSelectedIds((current) => new Set(current).add(createdPlaylist.id));
      updateRecentPlaylists(createdPlaylist.id);
      setNewPlaylistName("");
      setNewPlaylistOpen(false);
      setToastMessage(`Created "${createdPlaylist.name}"`);
      window.setTimeout(() => {
        setToastMessage(`Added "${song.title}" to "${createdPlaylist.name}"`);
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create playlist");
    } finally {
      setCreatingPlaylist(false);
    }
  }

  if (!song) return null;

  const loading = playlistsLoading || selectedLoading;
  const displayedError = error || playlistsError;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        title="Add to Playlist"
        onClose={handleClose}
        closeLabel="Close add to playlist modal"
        maxWidth="max-w-[600px]"
        maxHeight="526px"
        centerTitle
        eyebrow=""
        headerHeight="84px"
        contentCorners="square"
        bodyClassName="flex min-h-0 flex-1 flex-col px-7 pb-0"
        contentClassName="h-[526px] max-h-[calc(100vh-64px)]"
      >
        <SongPreview song={song} />

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
              value={playlistSearch}
              onChange={(event) => setPlaylistSearch(event.target.value)}
              placeholder="Search playlists"
              className="h-full min-w-0 flex-1 !rounded-none !border-0 !bg-transparent p-0 text-sm text-[var(--text-primary)] !outline-none placeholder:text-[var(--text-muted)] focus:!border-0"
            />
          </label>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-5 pt-2.5">
            {newPlaylistOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreatePlaylist();
                }}
                className="group mb-1 flex min-h-[58px] w-full items-center gap-3 rounded-none p-2.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[var(--text-primary)] text-[var(--bg-primary)]">
                  <PlusIcon size={18} />
                </span>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={newPlaylistName}
                    disabled={creatingPlaylist}
                    onChange={(e) => setNewPlaylistName(toSmartTitleCaseInput(e.target.value))}
                    placeholder="Name"
                    autoFocus
                    className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-[14.5px] font-normal leading-[1.35] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-0 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    disabled={creatingPlaylist}
                    onClick={() => {
                      setNewPlaylistOpen(false);
                      setNewPlaylistName("");
                    }}
                    className="h-10 shrink-0 rounded-none border-0 px-4 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creatingPlaylist || !newPlaylistName.trim()}
                    className="h-10 shrink-0 rounded-none bg-[var(--text-primary)] px-5 text-xs font-semibold text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-default disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setNewPlaylistOpen(true)}
                className="flex min-h-[58px] w-full cursor-pointer items-center gap-3 rounded-none p-2.5 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[var(--bg-hover)] text-[var(--text-primary)]">
                  <PlusIcon size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-normal leading-[1.35] text-[var(--text-primary)]">
                  New Playlist...
                </span>
              </button>
            )}

            {loading && (
              <div className="grid gap-1 pt-1">
                {Array.from({ length: playlists.length || 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex min-h-[52px] items-center gap-3 rounded-none p-2"
                  >
                    <div className="h-10 w-10 animate-pulse rounded-none bg-[var(--bg-primary)]" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 animate-pulse rounded-none bg-[var(--bg-primary)]" />
                      <div className="h-2.5 w-20 animate-pulse rounded-none bg-[var(--bg-primary)]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && displayedError && (
              <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="text-xs font-medium text-[var(--danger)]">
                  {displayedError}
                </div>

                {playlistsError && (
                  <button
                    type="button"
                    onClick={refetchPlaylists}
                    className="h-8 rounded-none bg-[var(--text-primary)] px-3.5 text-xs font-semibold text-[var(--bg-primary)] transition hover:opacity-80"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}

            {!loading && !displayedError && displayedPlaylists.length === 0 && (
              <div className="flex min-h-full items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
                {playlistSearch.trim()
                  ? "No playlists match your search."
                  : "You don&apos;t have any playlists yet."}
              </div>
            )}

            {!loading &&
              !displayedError &&
              displayedPlaylists.length > 0 &&
              displayedPlaylists.map((playlist, index) => {
                const isSelected = selectedIds.has(playlist.id);
                const isPending = pendingPlaylistIds.has(playlist.id);

                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => handlePlaylistClick(playlist)}
                    disabled={isPending || creatingPlaylist}
                    className={`group flex min-h-[58px] w-full cursor-pointer items-center gap-3 rounded-none p-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-60 ${
                      isSelected
                        ? "bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]"
                        : "hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    <PlaylistThumbnail playlist={playlist} index={index} />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-normal leading-[1.35] text-[var(--text-primary)]">
                        {playlist.name}
                      </span>
                      <span className="mt-[2px] block truncate text-[11.5px] leading-[1.35] text-[var(--text-subtle)]">
                        {isSelected ? "Added" : "Click to add"}
                      </span>
                    </span>

                    {isSelected && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-primary)]">
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </ModalShell>

      <Toast message={toastMessage} />
    </>
  );
}
