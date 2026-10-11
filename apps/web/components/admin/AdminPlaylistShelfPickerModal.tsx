"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ModalShell";
import { backendModalPrimaryButtonClass } from "@/components/backend/backendClasses";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

type Props = {
  isOpen: boolean;
  title: string;
  playlists: CuratedPlaylist[];
  existingIds: readonly number[];
  saving?: boolean;
  itemLabel?: string;
  itemLabelPlural?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onClose: () => void;
  onAdd: (playlistIds: number[]) => void | Promise<void>;
};

export default function AdminPlaylistShelfPickerModal({
  isOpen,
  title,
  playlists,
  existingIds,
  saving = false,
  itemLabel = "Playlist",
  itemLabelPlural,
  searchPlaceholder,
  emptyMessage,
  onClose,
  onAdd,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setSelectedIds(new Set());
  }, [isOpen]);

  const existingIdSet = useMemo(() => new Set(existingIds), [existingIds]);
  const displayedPlaylists = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...playlists]
      .filter((playlist) => {
        if (!query) return true;
        return [playlist.name, playlist.kicker, playlist.description].some(
          (value) => String(value || "").toLowerCase().includes(query),
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [playlists, search]);

  function togglePlaylist(playlistId: number) {
    if (existingIdSet.has(playlistId) || saving) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(playlistId)) next.delete(playlistId);
      else next.add(playlistId);
      return next;
    });
  }

  async function handleAdd() {
    if (selectedIds.size === 0 || saving) return;
    await onAdd([...selectedIds]);
  }

  const selectedCount = selectedIds.size;
  const pluralLabel = itemLabelPlural || `${itemLabel}s`;
  const resolvedSearchPlaceholder =
    searchPlaceholder || `Search ${pluralLabel.toLowerCase()}`;
  const resolvedEmptyMessage =
    emptyMessage || `No ${pluralLabel.toLowerCase()} match your search.`;

  return (
    <ModalShell
      isOpen={isOpen}
      title={`Add to ${title}`}
      onClose={onClose}
      closeLabel={`Close ${title} ${itemLabel.toLowerCase()} picker`}
      maxHeight="506px"
      bodyClassName="flex min-h-0 flex-1 flex-col px-5 pb-0"
      contentClassName="h-[506px] max-h-[calc(100vh-64px)]"
      footer={
        <button
          type="button"
          onClick={handleAdd}
          className={`${backendModalPrimaryButtonClass} !rounded-none`}
          disabled={selectedCount === 0 || saving}
        >
          {saving
            ? "Adding..."
            : selectedCount === 1
              ? `Add ${itemLabel}`
              : `Add ${selectedCount} ${pluralLabel}`}
        </button>
      }
    >
      <div className="-mx-5 flex min-h-0 flex-1 flex-col px-3">
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
            placeholder={resolvedSearchPlaceholder}
            className="h-full min-w-0 flex-1 !rounded-none !border-0 !bg-transparent p-0 text-sm text-[var(--text-primary)] !outline-none placeholder:text-[var(--text-muted)] focus:!border-0"
          />
        </label>

        <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-3">
          {displayedPlaylists.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
              {resolvedEmptyMessage}
            </div>
          ) : (
            <div className="grid gap-1">
              {displayedPlaylists.map((playlist) => {
                const alreadyAdded = existingIdSet.has(playlist.id);
                const selected = selectedIds.has(playlist.id);

                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => togglePlaylist(playlist.id)}
                    disabled={alreadyAdded || saving}
                    className={`group flex min-h-[52px] w-full items-center gap-3 rounded-none p-2 text-left transition-colors ${
                      alreadyAdded || selected
                        ? "bg-[var(--bg-primary)]"
                        : "cursor-pointer hover:bg-[var(--bg-hover)]"
                    } disabled:cursor-default`}
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-none bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                      {playlist.cover_image_url ? (
                        <Image
                          src={playlist.cover_image_url}
                          alt={playlist.name}
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <PlaylistIcon size={13} />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                        {playlist.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                        {alreadyAdded
                          ? "Already added"
                          : `${playlist.song_count || 0} songs`}
                      </span>
                    </span>

                    {(alreadyAdded || selected) && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-primary)]">
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
