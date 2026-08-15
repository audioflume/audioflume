"use client";

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
} from "@dnd-kit/sortable";
import AdminPlaylistShelfPickerModal from "@/components/admin/AdminPlaylistShelfPickerModal";
import {
  PLAYLIST_MANAGER_GRID_CLASS,
  PlaylistManagerCollapsibleSection,
  PlaylistManagerLoadingGrid,
  PlaylistManagerSortableCard,
  PlaylistManagerStaticCard,
  sortPlaylistNewestFirst,
} from "@/components/admin/AdminPlaylistManagerShared";
import Toast from "@/components/Toast";
import PlusIcon from "@/components/icons/PlusIcon";
import { secondaryPillButtonClass } from "@/components/uiClasses";
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
};

type ShelfIds = Record<CuratedPlaylistShelfKey, number[]>;
type CollapsiblePlaylistSection = CuratedPlaylistShelfKey | "newlyAdded";

const EMPTY_SHELF_IDS: ShelfIds = {
  popular: [],
  trending: [],
};

export default function AdminPlaylistLibraryView({
  playlists,
  loading,
  error,
}: Props) {
  const [shelfIds, setShelfIds] = useState<ShelfIds>(EMPTY_SHELF_IDS);
  const [shelvesLoading, setShelvesLoading] = useState(true);
  const [shelfError, setShelfError] = useState("");
  const [pickerShelf, setPickerShelf] =
    useState<CuratedPlaylistShelfKey | null>(null);
  const [addingShelf, setAddingShelf] =
    useState<CuratedPlaylistShelfKey | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<CollapsiblePlaylistSection, boolean>
  >({
    popular: false,
    newlyAdded: false,
    trending: false,
  });

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

  const newlyAdded = useMemo(
    () => [...playlists].sort(sortPlaylistNewestFirst).slice(0, 10),
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

  function toggleSection(section: CollapsiblePlaylistSection) {
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

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
      <PlaylistManagerLoadingGrid
        count={8}
        className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      />
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
            const shelfCollapsed = collapsedSections[shelfKey];

            return (
              <div key={shelfKey} className="grid gap-3">
                <PlaylistManagerCollapsibleSection
                  title={title}
                  subtitle={
                    shelvesLoading
                      ? "Loading..."
                      : `${items.length} playlist${items.length === 1 ? "" : "s"}`
                  }
                  collapsed={shelfCollapsed}
                  onToggle={() => toggleSection(shelfKey)}
                  actions={
                    <button
                      type="button"
                      onClick={() => setPickerShelf(shelfKey)}
                      className={secondaryPillButtonClass}
                      disabled={shelvesLoading}
                    >
                      <PlusIcon size={12} />
                      <span>Add</span>
                    </button>
                  }
                >
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
                        <div className={PLAYLIST_MANAGER_GRID_CLASS}>
                          {items.map((playlist) => (
                            <PlaylistManagerSortableCard
                              key={playlist.id}
                              playlist={playlist}
                              editHref={`/admin/playlist-manager/${playlist.id}/edit`}
                              meta={`${playlist.song_count || 0} songs`}
                              removeAriaLabel={`Remove ${playlist.name} from shelf`}
                              removeTitle="Remove from shelf"
                              onRemove={() => {
                                const confirmed = window.confirm(
                                  `Remove "${playlist.name}" from ${title}?`,
                                );
                                if (!confirmed) return;
                                void removeFromShelf(shelfKey, playlist.id);
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </PlaylistManagerCollapsibleSection>

                {renderNewlyAddedAfterPopular && (
                  <PlaylistManagerCollapsibleSection
                    title="Newly Added"
                    subtitle={`${newlyAdded.length} playlist${newlyAdded.length === 1 ? "" : "s"} · Automatic`}
                    collapsed={collapsedSections.newlyAdded}
                    onToggle={() => toggleSection("newlyAdded")}
                  >
                    <div className={PLAYLIST_MANAGER_GRID_CLASS}>
                      {newlyAdded.map((playlist) => (
                        <PlaylistManagerStaticCard
                          key={playlist.id}
                          playlist={playlist}
                          editHref={`/admin/playlist-manager/${playlist.id}/edit`}
                          meta={`${playlist.song_count || 0} songs`}
                        />
                      ))}
                    </div>
                  </PlaylistManagerCollapsibleSection>
                )}
              </div>
            );
          },
        )}
      </div>

      {pickerShelf && (
        <AdminPlaylistShelfPickerModal
          isOpen
          title={CURATED_PLAYLIST_SHELF_LABELS[pickerShelf]}
          playlists={playlists}
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
