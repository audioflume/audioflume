"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AdminPlaylistShelfPickerModal from "@/components/admin/AdminPlaylistShelfPickerModal";
import DropdownShell from "@/components/DropdownShell";
import Toast from "@/components/Toast";
import DragIconSmall from "@/components/icons/DragIconSmall";
import MoreIcon from "@/components/icons/MoreIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import {
  CURATED_PLAYLIST_SHELF_LABELS,
  type CuratedPlaylistShelfKey,
  type CuratedPlaylistShelfState,
} from "@/lib/curatedPlaylistShelves";

type Props = {
  playlists: CuratedPlaylist[];
  loading: boolean;
  error: string;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
};

type ShelfIds = Record<CuratedPlaylistShelfKey, number[]>;

const EMPTY_SHELF_IDS: ShelfIds = {
  popular: [],
  trending: [],
};

function sortNewestFirst(a: CuratedPlaylist, b: CuratedPlaylist) {
  const aTime = a.created_at ? Date.parse(a.created_at) : 0;
  const bTime = b.created_at ? Date.parse(b.created_at) : 0;

  if (aTime !== bTime) return bTime - aTime;
  return b.id - a.id;
}

function PlaylistArtwork({
  playlist,
  sizes,
}: {
  playlist: CuratedPlaylist;
  sizes: string;
}) {
  return playlist.cover_image_url ? (
    <Image
      src={playlist.cover_image_url}
      alt={playlist.name}
      fill
      sizes={sizes}
      className="object-cover"
      unoptimized
    />
  ) : (
    <span className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
      <PlaylistIcon size={18} />
    </span>
  );
}

function MasterPlaylistCard({
  playlist,
  openMenuId,
  setOpenMenuId,
  deletingId,
  onDeletePlaylist,
}: {
  playlist: CuratedPlaylist;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
}) {
  const editHref = `/admin/playlist-manager/${playlist.id}/edit`;
  const menuOpen = openMenuId === playlist.id;

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]">
        <Link href={editHref} className="absolute inset-0 block">
          <PlaylistArtwork
            playlist={playlist}
            sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </Link>
      </div>

      <div className="mt-3 flex min-w-0 items-start gap-3">
        <Link href={editHref} className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-medium tracking-[-0.025em] text-[var(--text-primary)]">
            {playlist.name}
          </h3>
          <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
            {playlist.song_count || 0} songs
            {playlist.kicker ? ` · ${playlist.kicker}` : ""}
          </p>
        </Link>

        <DropdownShell
          open={menuOpen}
          onOpenChange={(open) => setOpenMenuId(open ? playlist.id : null)}
          placement="bottom-end"
          trigger={() => (
            <button
              type="button"
              className={`flex h-7 w-7 shrink-0 items-center justify-center bg-transparent text-[var(--text-muted)] transition-colors hover:text-[var(--filmwave-black)] ${
                menuOpen ? "text-[var(--filmwave-black)]" : ""
              }`}
              aria-label={`Manage ${playlist.name}`}
            >
              <MoreIcon size={14} />
            </button>
          )}
        >
          <Link href={editHref} onClick={() => setOpenMenuId(null)}>
            Edit Playlist
          </Link>
          <button
            type="button"
            className="danger-hover"
            disabled={deletingId === playlist.id}
            onClick={() => {
              setOpenMenuId(null);
              void onDeletePlaylist(playlist);
            }}
          >
            {deletingId === playlist.id ? "Deleting..." : "Delete Playlist"}
          </button>
        </DropdownShell>
      </div>
    </article>
  );
}

function SortableShelfPlaylistCard({
  playlist,
  onRemove,
}: {
  playlist: CuratedPlaylist;
  onRemove: (playlistId: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 2 : "auto",
      }}
      className="group relative min-w-0"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]">
        <Link
          href={`/admin/playlist-manager/${playlist.id}/edit`}
          className="absolute inset-0 block"
        >
          <PlaylistArtwork
            playlist={playlist}
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
          />
        </Link>

        <button
          type="button"
          className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center text-white opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
          aria-label={`Drag ${playlist.name} to reorder`}
          {...attributes}
          {...listeners}
        >
          <span className="inline-flex scale-x-[1.45]">
            <DragIconSmall />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onRemove(playlist.id)}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center bg-[var(--bg-primary)] text-lg font-light leading-none text-[var(--text-secondary)] opacity-0 transition hover:text-[var(--text-primary)] group-hover:opacity-100"
          aria-label={`Remove ${playlist.name} from shelf`}
          title="Remove from shelf"
        >
          ×
        </button>
      </div>

      <Link
        href={`/admin/playlist-manager/${playlist.id}/edit`}
        className="mt-2.5 block min-w-0"
      >
        <h4 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {playlist.name}
        </h4>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
          {playlist.song_count || 0} songs
        </p>
      </Link>
    </article>
  );
}

function AutomaticShelfPlaylistCard({ playlist }: { playlist: CuratedPlaylist }) {
  return (
    <article className="min-w-0">
      <Link
        href={`/admin/playlist-manager/${playlist.id}/edit`}
        className="relative block aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]"
      >
        <PlaylistArtwork
          playlist={playlist}
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
        />
      </Link>
      <Link
        href={`/admin/playlist-manager/${playlist.id}/edit`}
        className="mt-2.5 block min-w-0"
      >
        <h4 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {playlist.name}
        </h4>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
          {playlist.song_count || 0} songs
        </p>
      </Link>
    </article>
  );
}

export default function AdminPlaylistLibraryView({
  playlists,
  loading,
  error,
  deletingId,
  onDeletePlaylist,
}: Props) {
  const [shelfIds, setShelfIds] = useState<ShelfIds>(EMPTY_SHELF_IDS);
  const [shelvesLoading, setShelvesLoading] = useState(true);
  const [shelfError, setShelfError] = useState("");
  const [pickerShelf, setPickerShelf] =
    useState<CuratedPlaylistShelfKey | null>(null);
  const [addingShelf, setAddingShelf] =
    useState<CuratedPlaylistShelfKey | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadShelves() {
      try {
        setShelvesLoading(true);
        setShelfError("");
        const res = await fetch("/api/curated-playlist-shelves");
        const data = (await res.json()) as Partial<CuratedPlaylistShelfState> & {
          error?: string;
        };

        if (!res.ok) throw new Error(data?.error || "Failed to load shelves");
        if (cancelled) return;

        setShelfIds({
          popular: Array.isArray(data.popular)
            ? data.popular.map((item) => Number(item.playlist_id))
            : [],
          trending: Array.isArray(data.trending)
            ? data.trending.map((item) => Number(item.playlist_id))
            : [],
        });
      } catch (err) {
        if (!cancelled) {
          setShelfError(
            err instanceof Error ? err.message : "Failed to load shelves",
          );
        }
      } finally {
        if (!cancelled) setShelvesLoading(false);
      }
    }

    loadShelves();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const playlistById = useMemo(
    () => new Map(playlists.map((playlist) => [playlist.id, playlist])),
    [playlists],
  );

  const masterPlaylists = useMemo(
    () => [...playlists].sort(sortNewestFirst),
    [playlists],
  );

  const newlyAdded = useMemo(
    () => [...playlists].sort(sortNewestFirst).slice(0, 10),
    [playlists],
  );

  const shelfPlaylists = useMemo(
    () => ({
      popular: shelfIds.popular
        .map((id) => playlistById.get(id))
        .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist)),
      trending: shelfIds.trending
        .map((id) => playlistById.get(id))
        .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist)),
    }),
    [playlistById, shelfIds],
  );

  async function addToShelf(
    shelfKey: CuratedPlaylistShelfKey,
    playlistIds: number[],
  ) {
    if (playlistIds.length === 0 || addingShelf) return;

    try {
      setAddingShelf(shelfKey);
      const res = await fetch("/api/admin/curated-playlist-shelves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelf_key: shelfKey,
          playlist_ids: playlistIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add playlists");

      const addedIds = Array.isArray(data.added_playlist_ids)
        ? data.added_playlist_ids.map((id: number | string) => Number(id))
        : playlistIds;

      setShelfIds((current) => ({
        ...current,
        [shelfKey]: [
          ...current[shelfKey],
          ...addedIds.filter((id: number) => !current[shelfKey].includes(id)),
        ],
      }));
      setPickerShelf(null);
      setToastMessage(
        addedIds.length === 1
          ? `Added to ${CURATED_PLAYLIST_SHELF_LABELS[shelfKey]}`
          : `Added ${addedIds.length} playlists to ${CURATED_PLAYLIST_SHELF_LABELS[shelfKey]}`,
      );
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to add playlists",
      );
    } finally {
      setAddingShelf(null);
    }
  }

  async function removeFromShelf(
    shelfKey: CuratedPlaylistShelfKey,
    playlistId: number,
  ) {
    try {
      const res = await fetch("/api/admin/curated-playlist-shelves", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelf_key: shelfKey,
          playlist_id: playlistId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to remove playlist");

      setShelfIds((current) => ({
        ...current,
        [shelfKey]: current[shelfKey].filter((id) => id !== playlistId),
      }));
      setToastMessage(
        `Removed from ${CURATED_PLAYLIST_SHELF_LABELS[shelfKey]}`,
      );
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to remove playlist",
      );
    }
  }

  async function reorderShelf(
    shelfKey: CuratedPlaylistShelfKey,
    event: DragEndEvent,
  ) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIds = shelfIds[shelfKey];
    const oldIndex = currentIds.indexOf(Number(active.id));
    const newIndex = currentIds.indexOf(Number(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentIds, oldIndex, newIndex);
    setShelfIds((current) => ({ ...current, [shelfKey]: reordered }));

    try {
      const res = await fetch("/api/admin/curated-playlist-shelves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelf_key: shelfKey,
          playlist_ids: reordered,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to reorder shelf");
    } catch (err) {
      setShelfIds((current) => ({ ...current, [shelfKey]: currentIds }));
      setToastMessage(
        err instanceof Error ? err.message : "Failed to reorder shelf",
      );
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[16/9] bg-[var(--bg-tertiary)]" />
            <div className="mt-3 h-3 w-2/3 bg-[var(--bg-tertiary)]" />
            <div className="mt-2 h-2 w-1/3 bg-[var(--bg-tertiary)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="py-10 text-sm text-[var(--danger)]">{error}</div>;
  }

  return (
    <>
      {shelfError && (
        <div className="border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-xs text-[var(--danger)]">
          {shelfError}
        </div>
      )}

      <div className="grid gap-3">
        {(["popular", "trending"] as CuratedPlaylistShelfKey[]).map(
          (shelfKey, shelfIndex) => {
            const title = CURATED_PLAYLIST_SHELF_LABELS[shelfKey];
            const items = shelfPlaylists[shelfKey];
            const renderNewlyAddedAfterPopular = shelfIndex === 0;

            return (
              <div key={shelfKey} className="grid gap-3">
                <section className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-4 sm:p-5">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                        {title}
                      </h3>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {shelvesLoading
                          ? "Loading..."
                          : `${items.length} playlist${items.length === 1 ? "" : "s"}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPickerShelf(shelfKey)}
                      className={secondaryPillButtonClass}
                      disabled={shelvesLoading}
                    >
                      <PlusIcon size={12} />
                      <span>Add</span>
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setPickerShelf(shelfKey)}
                      className="flex min-h-[120px] w-full items-center justify-center border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)]"
                    >
                      Add playlists from All Playlists
                    </button>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => void reorderShelf(shelfKey, event)}
                    >
                      <SortableContext
                        items={items.map((playlist) => playlist.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
                          {items.map((playlist) => (
                            <SortableShelfPlaylistCard
                              key={playlist.id}
                              playlist={playlist}
                              onRemove={(playlistId) => {
                                const confirmed = window.confirm(
                                  `Remove "${playlist.name}" from ${title}?`,
                                );
                                if (!confirmed) return;
                                void removeFromShelf(shelfKey, playlistId);
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </section>

                {renderNewlyAddedAfterPopular && (
                  <section className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-4 sm:p-5">
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                          Newly Added
                        </h3>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {newlyAdded.length} playlist{newlyAdded.length === 1 ? "" : "s"} · Automatic
                        </p>
                      </div>
                      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Newest 10
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
                      {newlyAdded.map((playlist) => (
                        <AutomaticShelfPlaylistCard
                          key={playlist.id}
                          playlist={playlist}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            );
          },
        )}
      </div>

      <section className="mt-0">
        <div className="mb-5 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-[22px] font-medium tracking-[-0.045em] text-[var(--text-primary)]">
              All Playlists
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {masterPlaylists.length} playlist{masterPlaylists.length === 1 ? "" : "s"} · Master library
            </p>
          </div>

          <Link
            href="/admin/playlist-manager/new"
            className={primaryPillButtonClass}
          >
            <PlusIcon size={13} />
            <span>New Playlist</span>
          </Link>
        </div>

        {masterPlaylists.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center border border-[var(--border)] text-sm text-[var(--text-secondary)]">
            No playlists yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {masterPlaylists.map((playlist) => (
              <MasterPlaylistCard
                key={playlist.id}
                playlist={playlist}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                deletingId={deletingId}
                onDeletePlaylist={onDeletePlaylist}
              />
            ))}
          </div>
        )}
      </section>

      {pickerShelf && (
        <AdminPlaylistShelfPickerModal
          isOpen
          title={CURATED_PLAYLIST_SHELF_LABELS[pickerShelf]}
          playlists={masterPlaylists}
          existingIds={shelfIds[pickerShelf]}
          saving={addingShelf === pickerShelf}
          onClose={() => setPickerShelf(null)}
          onAdd={(playlistIds) => addToShelf(pickerShelf, playlistIds)}
        />
      )}

      <Toast message={toastMessage} bottomOffset="24px" />
    </>
  );
}
