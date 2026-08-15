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
  DISCOVER_SECTION_SHELF_KEYS,
  DISCOVER_SECTION_SHELF_LABELS,
  type DiscoverSectionShelfKey,
  type DiscoverSectionShelfState,
} from "@/lib/discoverSections";

type PlaylistUpdate = {
  id: number;
  changes: Partial<CuratedPlaylist>;
};

type Props = {
  playlists: CuratedPlaylist[];
  loading: boolean;
  error: string;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
  onUpdatePlaylists?: (updates: PlaylistUpdate[]) => void;
};

type PickerState = {
  sectionKey: DiscoverSectionShelfKey;
  source: "playlist" | "discover";
};

function emptySectionState(): DiscoverSectionShelfState {
  return {
    discover_moods: [],
    discover_curated: [],
    discover_production: [],
  };
}

function sortNewestFirst(a: CuratedPlaylist, b: CuratedPlaylist) {
  const aTime = a.created_at ? Date.parse(a.created_at) : 0;
  const bTime = b.created_at ? Date.parse(b.created_at) : 0;

  if (aTime !== bTime) return bTime - aTime;
  return b.id - a.id;
}

function isDiscoverContent(playlist: CuratedPlaylist) {
  return Boolean(playlist.discover_section);
}

function getEditHref(playlist: CuratedPlaylist) {
  return isDiscoverContent(playlist)
    ? `/admin/playlist-manager/discover/${playlist.id}/edit`
    : `/admin/playlist-manager/${playlist.id}/edit`;
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

function SortableDiscoverSectionCard({
  playlist,
  sectionLabel,
  onRemove,
}: {
  playlist: CuratedPlaylist;
  sectionLabel: string;
  onRemove: (playlist: CuratedPlaylist) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id });
  const editHref = getEditHref(playlist);

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
        <Link href={editHref} className="absolute inset-0 block">
          <PlaylistArtwork
            playlist={playlist}
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
          />
        </Link>

        <button
          type="button"
          className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center bg-transparent text-white opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
          aria-label={`Drag ${playlist.name} to reorder`}
          {...attributes}
          {...listeners}
        >
          <DragIconSmall />
        </button>

        <button
          type="button"
          onClick={() => onRemove(playlist)}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center bg-[var(--bg-primary)] text-lg font-light leading-none text-[var(--text-secondary)] opacity-0 transition hover:text-[var(--text-primary)] group-hover:opacity-100"
          aria-label={`Remove ${playlist.name} from ${sectionLabel}`}
          title={`Remove from ${sectionLabel}`}
        >
          ×
        </button>
      </div>

      <Link href={editHref} className="mt-2.5 block min-w-0">
        <h4 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {playlist.name}
        </h4>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
          {isDiscoverContent(playlist)
            ? "Discover Content"
            : `${playlist.song_count || 0} songs · Playlist`}
        </p>
      </Link>
    </article>
  );
}

function DiscoverContentCard({
  playlist,
  placementLabels,
  menuOpen,
  setMenuOpen,
  deletingId,
  onDeletePlaylist,
}: {
  playlist: CuratedPlaylist;
  placementLabels: string[];
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
}) {
  const editHref = getEditHref(playlist);
  const placement =
    placementLabels.length === 0
      ? "Not added to a Discover section"
      : placementLabels.length === 1
        ? placementLabels[0]
        : `${placementLabels.length} Discover sections`;

  return (
    <article className="min-w-0">
      <Link
        href={editHref}
        className="relative block aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]"
      >
        <PlaylistArtwork
          playlist={playlist}
          sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </Link>

      <div className="mt-3 flex min-w-0 items-start gap-3">
        <Link href={editHref} className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-medium tracking-[-0.025em] text-[var(--text-primary)]">
            {playlist.name}
          </h3>
          <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
            {playlist.song_count || 0} songs · {placement}
          </p>
        </Link>

        <DropdownShell
          open={menuOpen}
          onOpenChange={setMenuOpen}
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
          <Link href={editHref} onClick={() => setMenuOpen(false)}>
            Edit Content
          </Link>
          <button
            type="button"
            className="danger-hover"
            disabled={deletingId === playlist.id}
            onClick={() => {
              setMenuOpen(false);
              void onDeletePlaylist(playlist);
            }}
          >
            {deletingId === playlist.id ? "Deleting..." : "Delete Content"}
          </button>
        </DropdownShell>
      </div>
    </article>
  );
}

async function fetchSectionState() {
  const res = await fetch("/api/discover-sections");
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load Discover sections");
  return data as DiscoverSectionShelfState;
}

export default function AdminDiscoverLibraryView({
  playlists,
  loading,
  error,
  deletingId,
  onDeletePlaylist,
}: Props) {
  const [sectionState, setSectionState] =
    useState<DiscoverSectionShelfState>(emptySectionState);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionError, setSectionError] = useState("");
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [openLibraryMenu, setOpenLibraryMenu] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function refreshSections() {
    const next = await fetchSectionState();
    setSectionState(next);
    return next;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      try {
        setSectionsLoading(true);
        setSectionError("");
        const next = await fetchSectionState();
        if (!cancelled) setSectionState(next);
      } catch (err) {
        if (!cancelled) {
          setSectionError(
            err instanceof Error ? err.message : "Failed to load Discover sections",
          );
        }
      } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    }

    void loadSections();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const masterPlaylists = useMemo(
    () => playlists.filter((playlist) => !playlist.discover_section),
    [playlists],
  );

  const discoverContent = useMemo(
    () => playlists.filter((playlist) => Boolean(playlist.discover_section)),
    [playlists],
  );

  const allDiscoverContent = useMemo(
    () => [...discoverContent].sort(sortNewestFirst),
    [discoverContent],
  );

  const playlistById = useMemo(
    () => new Map(playlists.map((playlist) => [playlist.id, playlist] as const)),
    [playlists],
  );

  const placementsById = useMemo(() => {
    const placements = new Map<number, string[]>();

    for (const key of DISCOVER_SECTION_SHELF_KEYS) {
      const label = DISCOVER_SECTION_SHELF_LABELS[key];
      for (const item of sectionState[key]) {
        const labels = placements.get(item.playlist_id) || [];
        labels.push(label);
        placements.set(item.playlist_id, labels);
      }
    }

    return placements;
  }, [sectionState]);

  function getSectionPlaylists(sectionKey: DiscoverSectionShelfKey) {
    return sectionState[sectionKey]
      .map((item) => playlistById.get(item.playlist_id))
      .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist));
  }

  async function addToSection(
    sectionKey: DiscoverSectionShelfKey,
    playlistIds: number[],
  ) {
    if (savingSection || playlistIds.length === 0) return;

    try {
      setSavingSection(true);
      const res = await fetch("/api/admin/discover-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelf_key: sectionKey,
          playlist_ids: playlistIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add to Discover section");

      await refreshSections();
      setPicker(null);
      setToastMessage(
        playlistIds.length === 1
          ? `Added to ${DISCOVER_SECTION_SHELF_LABELS[sectionKey]}`
          : `Added ${playlistIds.length} items to ${DISCOVER_SECTION_SHELF_LABELS[sectionKey]}`,
      );
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to add to Discover section",
      );
    } finally {
      setSavingSection(false);
    }
  }

  async function removeFromSection(
    sectionKey: DiscoverSectionShelfKey,
    playlist: CuratedPlaylist,
  ) {
    const label = DISCOVER_SECTION_SHELF_LABELS[sectionKey];
    const confirmed = window.confirm(`Remove "${playlist.name}" from ${label}?`);
    if (!confirmed || savingSection) return;

    try {
      setSavingSection(true);
      const res = await fetch("/api/admin/discover-sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelf_key: sectionKey,
          playlist_id: playlist.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to remove from Discover section");

      await refreshSections();
      setToastMessage(`Removed from ${label}`);
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to remove from Discover section",
      );
    } finally {
      setSavingSection(false);
    }
  }

  async function reorderSection(
    sectionKey: DiscoverSectionShelfKey,
    event: DragEndEvent,
  ) {
    const { active, over } = event;
    if (!over || active.id === over.id || savingSection) return;

    const currentItems = sectionState[sectionKey];
    const oldIndex = currentItems.findIndex(
      (item) => item.playlist_id === Number(active.id),
    );
    const newIndex = currentItems.findIndex(
      (item) => item.playlist_id === Number(over.id),
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = currentItems;
    const reordered = arrayMove(currentItems, oldIndex, newIndex).map(
      (item, position) => ({ ...item, position }),
    );

    setSectionState((current) => ({
      ...current,
      [sectionKey]: reordered,
    }));

    try {
      setSavingSection(true);
      const res = await fetch("/api/admin/discover-sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelf_key: sectionKey,
          playlist_ids: reordered.map((item) => item.playlist_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to reorder Discover section");
    } catch (err) {
      setSectionState((current) => ({
        ...current,
        [sectionKey]: previous,
      }));
      setToastMessage(
        err instanceof Error ? err.message : "Failed to reorder Discover section",
      );
    } finally {
      setSavingSection(false);
    }
  }

  const combinedError = error || sectionError;
  const combinedLoading = loading || sectionsLoading;

  if (combinedLoading) {
    return (
      <div className="grid gap-12">
        {DISCOVER_SECTION_SHELF_KEYS.map((key) => (
          <div key={key} className="animate-pulse">
            <div className="mb-4 h-5 w-44 bg-[var(--bg-tertiary)]" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="aspect-[16/9] bg-[var(--bg-tertiary)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (combinedError) {
    return <div className="py-10 text-sm text-[var(--danger)]">{combinedError}</div>;
  }

  return (
    <>
      <section>
        <div className="mb-8">
          <h2 className="text-[22px] font-medium tracking-[-0.045em] text-[var(--text-primary)]">
            Discover Sections
          </h2>
          <p className="mt-1 max-w-[680px] text-xs leading-5 text-[var(--text-secondary)]">
            Build each Discover section from regular playlists, reusable Discover content, or a mix of both.
          </p>
        </div>

        <div className="grid gap-12">
          {DISCOVER_SECTION_SHELF_KEYS.map((sectionKey) => {
            const sectionLabel = DISCOVER_SECTION_SHELF_LABELS[sectionKey];
            const sectionPlaylists = getSectionPlaylists(sectionKey);

            return (
              <section key={sectionKey}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                      {sectionLabel}
                    </h3>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      {sectionPlaylists.length} item{sectionPlaylists.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPicker({ sectionKey, source: "playlist" })}
                      className={secondaryPillButtonClass}
                      disabled={savingSection}
                    >
                      <PlusIcon size={12} />
                      <span>Add Playlist</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPicker({ sectionKey, source: "discover" })}
                      className={secondaryPillButtonClass}
                      disabled={savingSection}
                    >
                      <PlusIcon size={12} />
                      <span>Add Discover Content</span>
                    </button>
                  </div>
                </div>

                {sectionPlaylists.length === 0 ? (
                  <div className="flex min-h-[120px] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-xs text-[var(--text-secondary)]">
                    Add a playlist or Discover content to this section.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => void reorderSection(sectionKey, event)}
                  >
                    <SortableContext
                      items={sectionPlaylists.map((playlist) => playlist.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
                        {sectionPlaylists.map((playlist) => (
                          <SortableDiscoverSectionCard
                            key={playlist.id}
                            playlist={playlist}
                            sectionLabel={sectionLabel}
                            onRemove={(item) =>
                              void removeFromSection(sectionKey, item)
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <section className="mt-16 border-t border-[var(--border)] pt-10">
        <div className="mb-5 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-[22px] font-medium tracking-[-0.045em] text-[var(--text-primary)]">
              All Discover Content
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {allDiscoverContent.length} item{allDiscoverContent.length === 1 ? "" : "s"} · Master library
            </p>
          </div>

          <Link
            href="/admin/playlist-manager/discover/new"
            className={primaryPillButtonClass}
          >
            <PlusIcon size={13} />
            <span>New Discover Content</span>
          </Link>
        </div>

        {allDiscoverContent.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center border border-[var(--border)] text-sm text-[var(--text-secondary)]">
            No Discover content yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {allDiscoverContent.map((playlist) => (
              <DiscoverContentCard
                key={playlist.id}
                playlist={playlist}
                placementLabels={placementsById.get(playlist.id) || []}
                menuOpen={openLibraryMenu === playlist.id}
                setMenuOpen={(open) =>
                  setOpenLibraryMenu(open ? playlist.id : null)
                }
                deletingId={deletingId}
                onDeletePlaylist={onDeletePlaylist}
              />
            ))}
          </div>
        )}
      </section>

      {picker && (
        <AdminPlaylistShelfPickerModal
          isOpen
          title={DISCOVER_SECTION_SHELF_LABELS[picker.sectionKey]}
          playlists={picker.source === "playlist" ? masterPlaylists : discoverContent}
          existingIds={sectionState[picker.sectionKey].map((item) => item.playlist_id)}
          saving={savingSection}
          itemLabel={picker.source === "playlist" ? "Playlist" : "Discover Content"}
          itemLabelPlural={picker.source === "playlist" ? "Playlists" : "Discover Items"}
          searchPlaceholder={
            picker.source === "playlist"
              ? "Search playlists"
              : "Search Discover content"
          }
          emptyMessage={
            picker.source === "playlist"
              ? "No playlists match your search."
              : "No Discover content matches your search."
          }
          onClose={() => setPicker(null)}
          onAdd={(playlistIds) => addToSection(picker.sectionKey, playlistIds)}
        />
      )}

      <Toast message={toastMessage} bottomOffset="24px" />
    </>
  );
}
