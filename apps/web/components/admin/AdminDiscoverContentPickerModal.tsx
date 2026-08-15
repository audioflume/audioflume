"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ModalShell";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import { modalPrimaryButtonClass } from "@/components/uiClasses";
import { DISCOVER_LIBRARY_SECTION } from "@/lib/discoverAdmin";
import {
  DISCOVER_SECTION_LABELS,
  type CuratedPlaylist,
} from "@/lib/curatedPlaylists";

type Props = {
  isOpen: boolean;
  title: string;
  playlists: CuratedPlaylist[];
  currentId?: number | null;
  saving?: boolean;
  onClose: () => void;
  onAssign: (playlistId: number) => void | Promise<void>;
};

function getPlacementLabel(playlist: CuratedPlaylist) {
  if (
    !playlist.discover_section ||
    playlist.discover_section === DISCOVER_LIBRARY_SECTION
  ) {
    return "Available";
  }

  return DISCOVER_SECTION_LABELS.get(playlist.discover_section) || "Assigned";
}

export default function AdminDiscoverContentPickerModal({
  isOpen,
  title,
  playlists,
  currentId = null,
  saving = false,
  onClose,
  onAssign,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setSelectedId(null);
  }, [isOpen]);

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

  async function handleAssign() {
    if (selectedId == null || selectedId === currentId || saving) return;
    await onAssign(selectedId);
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title={`Choose for ${title}`}
      onClose={onClose}
      closeLabel={`Close ${title} content picker`}
      maxWidth="max-w-[540px]"
      maxHeight="560px"
      bodyClassName="flex min-h-0 flex-1 flex-col px-5 pb-0"
      contentClassName="h-[560px] max-h-[calc(100vh-64px)]"
      footerClassName="justify-end bg-[var(--bg-tertiary)]"
      footer={
        <button
          type="button"
          onClick={handleAssign}
          className={modalPrimaryButtonClass}
          disabled={selectedId == null || selectedId === currentId || saving}
        >
          {saving ? "Assigning..." : "Assign Content"}
        </button>
      }
    >
      <div className="pb-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search Discover content"
          className="h-10 w-full rounded-none border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)]"
        />
      </div>

      <div className="-mx-5 min-h-0 flex-1 overflow-y-auto bg-[var(--bg-tertiary)] p-3">
        {displayedPlaylists.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
            No Discover content matches your search.
          </div>
        ) : (
          <div className="grid gap-1">
            {displayedPlaylists.map((playlist) => {
              const isCurrent = playlist.id === currentId;
              const selected = playlist.id === selectedId;

              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => {
                    if (!isCurrent && !saving) setSelectedId(playlist.id);
                  }}
                  disabled={isCurrent || saving}
                  className={`group flex min-h-[60px] w-full items-center gap-3 p-2 text-left transition-colors ${
                    isCurrent || selected
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
                      <PlaylistIcon size={13} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                      {playlist.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                      {isCurrent ? "Currently assigned" : getPlacementLabel(playlist)}
                    </span>
                  </span>

                  {(isCurrent || selected) && (
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
    </ModalShell>
  );
}
