"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "@/components/ModalShell";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import XIcon from "@/components/icons/XIcon";
import { modalPrimaryButtonClass } from "@/components/uiClasses";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
  const listRef = useRef<HTMLDivElement>(null);

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

  const availableLetters = useMemo(
    () =>
      new Set(
        displayedPlaylists
          .map((playlist) => playlist.name.trim().charAt(0).toUpperCase())
          .filter((letter) => /^[A-Z]$/.test(letter)),
      ),
    [displayedPlaylists],
  );

  function togglePlaylist(playlistId: number) {
    if (existingIdSet.has(playlistId) || saving) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(playlistId)) next.delete(playlistId);
      else next.add(playlistId);
      return next;
    });
  }

  function scrollToLetter(letter: string) {
    const list = listRef.current;
    if (!list) return;

    const target = list.querySelector<HTMLElement>(
      `[data-alpha-letter="${letter}"]`,
    );
    const firstItem = list.querySelector<HTMLElement>("[data-alpha-letter]");
    if (!target || !firstItem) return;

    list.scrollTo({
      top: target.offsetTop - firstItem.offsetTop,
      behavior: "smooth",
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
      maxWidth="max-w-[540px]"
      maxHeight="560px"
      centerTitle
      bodyClassName="flex min-h-0 flex-1 flex-col px-5 pb-0"
      contentClassName="h-[560px] max-h-[calc(100vh-64px)] !rounded-[10px] [&>div:first-of-type>h2]:!text-base [&>div:first-of-type>h2]:!font-medium [&>div:first-of-type>h2]:!tracking-[-0.03em]"
      footerClassName="justify-end bg-[var(--bg-primary)]"
      footer={
        <button
          type="button"
          onClick={handleAdd}
          className={modalPrimaryButtonClass}
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
      <div className="pb-4">
        <div className="relative">
          <input
            type="text"
            role="searchbox"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={resolvedSearchPlaceholder}
            className="h-10 w-full rounded-none border border-[var(--border)] bg-[var(--bg-primary)] px-3 pr-10 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-0 top-0 flex h-10 w-10 cursor-pointer items-center justify-center bg-transparent text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[10px] bg-[var(--bg-primary)]">
        {displayedPlaylists.length > 0 && (
          <nav
            aria-label={`${itemLabel} alphabet navigation`}
            className="flex h-full w-7 shrink-0 flex-col items-center justify-between py-3"
          >
            {ALPHABET.map((letter) => {
              const available = availableLetters.has(letter);

              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => scrollToLetter(letter)}
                  disabled={!available}
                  className={`flex w-full flex-1 items-center justify-center text-[10px] font-medium leading-none transition-colors ${
                    available
                      ? "cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      : "cursor-default text-[var(--text-muted)] opacity-25"
                  }`}
                  aria-label={`Jump to ${letter}`}
                >
                  {letter}
                </button>
              );
            })}
          </nav>
        )}

        <div
          ref={listRef}
          className="h-full min-w-0 flex-1 overflow-y-auto py-3"
        >
          {displayedPlaylists.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
              {resolvedEmptyMessage}
            </div>
          ) : (
            <div className="grid gap-1">
              {displayedPlaylists.map((playlist) => {
                const alreadyAdded = existingIdSet.has(playlist.id);
                const selected = selectedIds.has(playlist.id);
                const alphaLetter = playlist.name.trim().charAt(0).toUpperCase();

                return (
                  <button
                    key={playlist.id}
                    type="button"
                    data-alpha-letter={/^[A-Z]$/.test(alphaLetter) ? alphaLetter : undefined}
                    onClick={() => togglePlaylist(playlist.id)}
                    disabled={alreadyAdded || saving}
                    className={`group flex min-h-[60px] w-full items-center gap-3 p-2 text-left transition-colors ${
                      alreadyAdded || selected
                        ? "bg-[var(--bg-primary)]"
                        : "cursor-pointer hover:bg-[var(--bg-hover)]"
                    } disabled:cursor-default`}
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden bg-[var(--bg-primary)] text-[var(--text-muted)]">
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
                        <PlaylistIcon size={14} />
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
