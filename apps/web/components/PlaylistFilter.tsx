"use client";

import type { PlaylistRef } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import FilterPopover from "@/components/FilterPopover";
import {
  filterClearButtonClass,
  filterDropdownHeaderClass,
  filterDropdownTitleClass,
  filterRowButtonActiveClass,
  filterRowButtonClass,
  filterRowButtonInactiveClass,
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";

type PlaylistFilterProps = {
  selected: PlaylistRef | null;
  onChange: (selected: PlaylistRef | null) => void;
};

function PlaylistFilterSkeleton() {
  return (
    <div className="grid gap-1.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex h-9 items-center gap-2.5 rounded-lg px-2.5"
        >
          <div className="h-5 w-5 rounded-md bg-[var(--bg-tertiary)]" />
          <div className="h-2.5 w-28 bg-[var(--bg-tertiary)]" />
        </div>
      ))}
    </div>
  );
}

export default function PlaylistFilter({
  selected,
  onChange,
}: PlaylistFilterProps) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { userId } = useAuth();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || playlistsLoaded) return;

    if (!userId) {
      setLoading(false);
      setPlaylistsLoaded(true);
      setPlaylists([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("playlists")
        .select("id, name")
        .eq("clerk_user_id", userId)
        .order("name");

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
        setPlaylists([]);
      } else {
        setPlaylists(data ?? []);
      }

      setLoading(false);
      setPlaylistsLoaded(true);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open, userId, playlistsLoaded]);

  function toggle(playlist: PlaylistRef) {
    onChange(selected?.id === playlist.id ? null : playlist);
  }

  function clear() {
    onChange(null);
  }

  const hasActive = selected !== null;
  const showSkeleton = loading || !playlistsLoaded;

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${filterTriggerBaseClass} ${
          hasActive ? filterTriggerActiveClass : filterTriggerInactiveClass
        } ${open ? "is-open" : ""}`}
      >
        <PlaylistIcon size={13} className="shrink-0" />

        <span>Playlists</span>

        {hasActive && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10px] font-medium text-[var(--text-primary)]">
            1
          </span>
        )}
      </button>

      <FilterPopover
        open={open}
        triggerRef={triggerRef}
        width={300}
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-ui)]"
      >
        <div className={filterDropdownHeaderClass}>
          <div className={filterDropdownTitleClass}>Playlists</div>

          {hasActive && (
            <button
              type="button"
              onClick={clear}
              className={filterClearButtonClass}
            >
              Clear
            </button>
          )}
        </div>

        {showSkeleton ? (
          <div className="p-1.5">
            <PlaylistFilterSkeleton />
          </div>
        ) : loadError ? (
          <div className="p-1.5">
            <div className="rounded-lg bg-[var(--bg-primary)] px-3 py-3">
              <div className="text-xs font-medium text-[var(--danger)]">
                Couldn&apos;t load playlists
              </div>

              <div className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                {loadError}
              </div>
            </div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="p-1.5">
            <div className="rounded-lg bg-[var(--bg-primary)] px-3 py-3">
              <div className="text-xs font-medium text-[var(--text-primary)]">
                No playlists found
              </div>

              <div className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                Create a playlist first, then use this filter to narrow your
                library.
              </div>
            </div>
          </div>
        ) : (
          <div className="max-h-[min(340px,calc(100vh-180px))] overflow-y-auto p-1.5">
            {playlists.map((playlist) => {
              const isSelected = selected?.id === playlist.id;

              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => toggle(playlist)}
                  className={`group ${filterRowButtonClass} h-9 ${
                    isSelected
                      ? filterRowButtonActiveClass
                      : filterRowButtonInactiveClass
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
                      <PlaylistIcon size={13} />
                    </span>

                    <span className="min-w-0 truncate">{playlist.name}</span>
                  </span>

                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition ${
                      isSelected
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                        : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {isSelected ? (
                      <CheckIcon size={12} />
                    ) : (
                      <PlusIcon size={12} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </FilterPopover>
    </div>
  );
}
