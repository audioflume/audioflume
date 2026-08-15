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
import AdminDiscoverContentPickerModal from "@/components/admin/AdminDiscoverContentPickerModal";
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
import { DISCOVER_LIBRARY_SECTION } from "@/lib/discoverAdmin";
import {
  DISCOVER_SECTION_LABELS,
  DISCOVER_SECTION_OPTIONS,
  type CuratedPlaylist,
} from "@/lib/curatedPlaylists";

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
  onUpdatePlaylists: (updates: PlaylistUpdate[]) => void;
};

type SectionOption = (typeof DISCOVER_SECTION_OPTIONS)[number];

const DISCOVER_GROUPS = [
  { title: "Explore These Moods", category: "Main Blocks" },
  { title: "Production Styles", category: "Production Style Blocks" },
] as const;

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

function DiscoverPlacementCard({
  section,
  playlist,
  menuOpen,
  setMenuOpen,
  onChoose,
  onRemove,
}: {
  section: SectionOption;
  playlist: CuratedPlaylist | null;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onChoose: () => void;
  onRemove: () => void;
}) {
  if (!playlist) {
    return (
      <article className="min-w-0">
        <button
          type="button"
          onClick={onChoose}
          className="flex aspect-[16/9] w-full items-center justify-center border border-dashed border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <span className="flex items-center gap-2 text-xs font-medium">
            <PlusIcon size={13} />
            Add Content
          </span>
        </button>
        <div className="mt-2.5 min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {section.label}
          </p>
          <p className="mt-1 truncate text-[13px] font-medium text-[var(--text-secondary)]">
            No content assigned
          </p>
        </div>
      </article>
    );
  }

  const editHref = `/admin/playlist-manager/discover/${playlist.id}/edit`;

  return (
    <article className="min-w-0">
      <Link
        href={editHref}
        className="relative block aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]"
      >
        <PlaylistArtwork
          playlist={playlist}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
        />
      </Link>

      <div className="mt-2.5 flex min-w-0 items-start gap-3">
        <Link href={editHref} className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {section.label}
          </p>
          <h4 className="mt-1 truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
            {playlist.name}
          </h4>
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
              aria-label={`Manage ${section.label}`}
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
            onClick={() => {
              setMenuOpen(false);
              onChoose();
            }}
          >
            Change Content
          </button>
          <button
            type="button"
            className="danger-hover"
            onClick={() => {
              setMenuOpen(false);
              onRemove();
            }}
          >
            Remove from Section
          </button>
        </DropdownShell>
      </div>
    </article>
  );
}

function DiscoverContentCard({
  playlist,
  menuOpen,
  setMenuOpen,
  deletingId,
  onDeletePlaylist,
}: {
  playlist: CuratedPlaylist;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
}) {
  const editHref = `/admin/playlist-manager/discover/${playlist.id}/edit`;
  const placement =
    playlist.discover_section === DISCOVER_LIBRARY_SECTION
      ? "Unassigned"
      : DISCOVER_SECTION_LABELS.get(playlist.discover_section || "") ||
        "Unassigned";

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

function SortableCuratedPlaylistCard({
  playlist,
  onRemove,
}: {
  playlist: CuratedPlaylist;
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
          <DragIconSmall />
        </button>

        <button
          type="button"
          onClick={() => onRemove(playlist)}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center bg-[var(--bg-primary)] text-lg font-light leading-none text-[var(--text-secondary)] opacity-0 transition hover:text-[var(--text-primary)] group-hover:opacity-100"
          aria-label={`Remove ${playlist.name} from Curated Playlists`}
          title="Remove from Curated Playlists"
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

export default function AdminDiscoverLibraryView({
  playlists,
  loading,
  error,
  deletingId,
  onDeletePlaylist,
  onUpdatePlaylists,
}: Props) {
  const [pickerSection, setPickerSection] = useState<string | null>(null);
  const [curatedPickerOpen, setCuratedPickerOpen] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [savingCurated, setSavingCurated] = useState(false);
  const [openPlacementMenu, setOpenPlacementMenu] = useState<string | null>(null);
  const [openLibraryMenu, setOpenLibraryMenu] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const discoverContent = useMemo(
    () => playlists.filter((playlist) => Boolean(playlist.discover_section)),
    [playlists],
  );

  const allDiscoverContent = useMemo(
    () => [...discoverContent].sort(sortNewestFirst),
    [discoverContent],
  );

  const masterPlaylists = useMemo(
    () => playlists.filter((playlist) => !playlist.discover_section),
    [playlists],
  );

  const curatedPlaylists = useMemo(
    () =>
      masterPlaylists
        .filter((playlist) => playlist.show_on_discover)
        .sort((a, b) => a.discover_position - b.discover_position),
    [masterPlaylists],
  );

  const assignments = useMemo(() => {
    const map = new Map<string, CuratedPlaylist>();

    for (const playlist of discoverContent) {
      if (
        playlist.discover_section &&
        playlist.discover_section !== DISCOVER_LIBRARY_SECTION
      ) {
        map.set(playlist.discover_section, playlist);
      }
    }

    return map;
  }, [discoverContent]);

  async function saveSectionAssignments(
    updates: Array<{ id: number; section: string }>,
  ) {
    const res = await fetch("/api/admin/curated-playlists/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "discover-sections", updates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to update Discover section");
  }

  async function assignSection(section: string, playlistId: number) {
    if (savingSection) return;

    const selected = discoverContent.find((playlist) => playlist.id === playlistId);
    if (!selected) return;

    const current = assignments.get(section) || null;
    if (current?.id === selected.id) {
      setPickerSection(null);
      return;
    }

    const sectionUpdates = [
      ...(current && current.id !== selected.id
        ? [{ id: current.id, section: DISCOVER_LIBRARY_SECTION }]
        : []),
      { id: selected.id, section },
    ];

    try {
      setSavingSection(true);
      await saveSectionAssignments(sectionUpdates);
      onUpdatePlaylists(
        sectionUpdates.map((update) => ({
          id: update.id,
          changes: { discover_section: update.section },
        })),
      );
      setPickerSection(null);
      setToastMessage(`Assigned to ${DISCOVER_SECTION_LABELS.get(section) || "Discover section"}`);
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to update Discover section",
      );
    } finally {
      setSavingSection(false);
    }
  }

  async function removeSection(section: string, playlist: CuratedPlaylist) {
    const label = DISCOVER_SECTION_LABELS.get(section) || "this section";
    const confirmed = window.confirm(`Remove "${playlist.name}" from ${label}?`);
    if (!confirmed || savingSection) return;

    try {
      setSavingSection(true);
      await saveSectionAssignments([
        { id: playlist.id, section: DISCOVER_LIBRARY_SECTION },
      ]);
      onUpdatePlaylists([
        {
          id: playlist.id,
          changes: { discover_section: DISCOVER_LIBRARY_SECTION },
        },
      ]);
      setToastMessage(`Removed from ${label}`);
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to update Discover section",
      );
    } finally {
      setSavingSection(false);
    }
  }

  async function saveCuratedMembership(
    visiblePlaylists: CuratedPlaylist[],
    hiddenIds: number[] = [],
  ) {
    const updates = [
      ...visiblePlaylists.map((playlist, index) => ({
        id: playlist.id,
        visible: true,
        position: index,
      })),
      ...hiddenIds.map((id) => ({ id, visible: false, position: 0 })),
    ];

    const res = await fetch("/api/admin/curated-playlists/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "discover-membership", updates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to update Curated Playlists");
  }

  async function addCuratedPlaylists(playlistIds: number[]) {
    if (savingCurated || playlistIds.length === 0) return;

    const existingIds = new Set(curatedPlaylists.map((playlist) => playlist.id));
    const additions = playlistIds
      .filter((id) => !existingIds.has(id))
      .map((id) => masterPlaylists.find((playlist) => playlist.id === id))
      .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist));

    if (additions.length === 0) {
      setCuratedPickerOpen(false);
      return;
    }

    const next = [...curatedPlaylists, ...additions];

    try {
      setSavingCurated(true);
      await saveCuratedMembership(next);
      onUpdatePlaylists(
        next.map((playlist, index) => ({
          id: playlist.id,
          changes: { show_on_discover: true, discover_position: index },
        })),
      );
      setCuratedPickerOpen(false);
      setToastMessage(
        additions.length === 1
          ? "Added to Curated Playlists"
          : `Added ${additions.length} playlists to Curated Playlists`,
      );
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to update Curated Playlists",
      );
    } finally {
      setSavingCurated(false);
    }
  }

  async function removeCuratedPlaylist(playlist: CuratedPlaylist) {
    const confirmed = window.confirm(
      `Remove "${playlist.name}" from Curated Playlists?`,
    );
    if (!confirmed || savingCurated) return;

    const next = curatedPlaylists.filter((item) => item.id !== playlist.id);

    try {
      setSavingCurated(true);
      await saveCuratedMembership(next, [playlist.id]);
      onUpdatePlaylists([
        ...next.map((item, index) => ({
          id: item.id,
          changes: { show_on_discover: true, discover_position: index },
        })),
        {
          id: playlist.id,
          changes: { show_on_discover: false },
        },
      ]);
      setToastMessage("Removed from Curated Playlists");
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to update Curated Playlists",
      );
    } finally {
      setSavingCurated(false);
    }
  }

  async function reorderCuratedPlaylists(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || savingCurated) return;

    const oldIndex = curatedPlaylists.findIndex(
      (playlist) => playlist.id === Number(active.id),
    );
    const newIndex = curatedPlaylists.findIndex(
      (playlist) => playlist.id === Number(over.id),
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(curatedPlaylists, oldIndex, newIndex);
    const previousUpdates = curatedPlaylists.map((playlist, index) => ({
      id: playlist.id,
      changes: { discover_position: index },
    }));

    onUpdatePlaylists(
      reordered.map((playlist, index) => ({
        id: playlist.id,
        changes: { discover_position: index },
      })),
    );

    try {
      setSavingCurated(true);
      await saveCuratedMembership(reordered);
    } catch (err) {
      onUpdatePlaylists(previousUpdates);
      setToastMessage(
        err instanceof Error ? err.message : "Failed to reorder Curated Playlists",
      );
    } finally {
      setSavingCurated(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-12">
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[16/9] bg-[var(--bg-tertiary)]" />
              <div className="mt-3 h-3 w-2/3 bg-[var(--bg-tertiary)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="py-10 text-sm text-[var(--danger)]">{error}</div>;
  }

  return (
    <>
      <section>
        <div className="mb-8">
          <h2 className="text-[22px] font-medium tracking-[-0.045em] text-[var(--text-primary)]">
            Discover Sections
          </h2>
          <p className="mt-1 max-w-[650px] text-xs leading-5 text-[var(--text-secondary)]">
            Arrange reusable Discover content into the fixed page sections, then choose which master playlists appear in the Curated Playlists shelf.
          </p>
        </div>

        <div className="grid gap-12">
          {DISCOVER_GROUPS.map((group) => {
            const sections = DISCOVER_SECTION_OPTIONS.filter(
              (option) => option.category === group.category,
            );

            return (
              <section key={group.title}>
                <div className="mb-4">
                  <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                    {group.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {sections.length} fixed slots
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-4">
                  {sections.map((section) => {
                    const playlist = assignments.get(section.value) || null;
                    return (
                      <DiscoverPlacementCard
                        key={section.value}
                        section={section}
                        playlist={playlist}
                        menuOpen={openPlacementMenu === section.value}
                        setMenuOpen={(open) =>
                          setOpenPlacementMenu(open ? section.value : null)
                        }
                        onChoose={() => setPickerSection(section.value)}
                        onRemove={() => {
                          if (playlist) void removeSection(section.value, playlist);
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                  Curated Playlists
                </h3>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {curatedPlaylists.length} playlist{curatedPlaylists.length === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCuratedPickerOpen(true)}
                className={secondaryPillButtonClass}
                disabled={savingCurated}
              >
                <PlusIcon size={12} />
                <span>Add</span>
              </button>
            </div>

            {curatedPlaylists.length === 0 ? (
              <button
                type="button"
                onClick={() => setCuratedPickerOpen(true)}
                className="flex min-h-[120px] w-full items-center justify-center border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)]"
              >
                Add playlists from All Playlists
              </button>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => void reorderCuratedPlaylists(event)}
              >
                <SortableContext
                  items={curatedPlaylists.map((playlist) => playlist.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
                    {curatedPlaylists.map((playlist) => (
                      <SortableCuratedPlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onRemove={(item) => void removeCuratedPlaylist(item)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
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

      {pickerSection && (
        <AdminDiscoverContentPickerModal
          isOpen
          title={DISCOVER_SECTION_LABELS.get(pickerSection) || "Discover section"}
          playlists={allDiscoverContent}
          currentId={assignments.get(pickerSection)?.id || null}
          saving={savingSection}
          onClose={() => setPickerSection(null)}
          onAssign={(playlistId) => assignSection(pickerSection, playlistId)}
        />
      )}

      {curatedPickerOpen && (
        <AdminPlaylistShelfPickerModal
          isOpen
          title="Curated Playlists"
          playlists={masterPlaylists}
          existingIds={curatedPlaylists.map((playlist) => playlist.id)}
          saving={savingCurated}
          onClose={() => setCuratedPickerOpen(false)}
          onAdd={addCuratedPlaylists}
        />
      )}

      <Toast message={toastMessage} bottomOffset="24px" />
    </>
  );
}
