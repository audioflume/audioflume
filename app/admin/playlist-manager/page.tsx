"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminPlaylistGroupManager from "@/components/admin/AdminPlaylistGroupManager";
import DropdownShell from "@/components/DropdownShell";
import DragIconSmall from "@/components/icons/DragIconSmall";
import EditIcon from "@/components/icons/EditIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import {
  iconButtonActiveClass,
  primaryPillButtonClass,
  smallIconButtonClass,
} from "@/components/uiClasses";
import type { CuratedPlaylist, CuratedPlaylistGroup } from "@/lib/curatedPlaylists";

// ─── Sortable playlist row ────────────────────────────────────────────────────

function SortablePlaylistRow({
  playlist,
  isLastInGroup,
  openDropdownId,
  setOpenDropdownId,
  deletingId,
  onDelete,
}: {
  playlist: CuratedPlaylist;
  isLastInGroup: boolean;
  openDropdownId: number | null;
  setOpenDropdownId: (id: number | null) => void;
  deletingId: number | null;
  onDelete: (playlist: CuratedPlaylist) => void;
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
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        borderBottom: isLastInGroup ? "none" : "1px solid var(--border-subtle)",
        position: "relative",
        zIndex: isDragging ? 1 : "auto",
      }}
      className="group flex items-center bg-[var(--bg-secondary)]"
    >
      <button
        type="button"
        className="flex h-full cursor-grab items-center py-2.5 pl-3 pr-1 text-[var(--border)] hover:text-[var(--text-muted)] active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <DragIconSmall />
      </button>

      <Link
        href={`/admin/playlist-manager/${playlist.id}/edit`}
        className="flex flex-1 items-center gap-3 py-2.5 transition hover:bg-[var(--bg-hover)]"
      >
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--bg-tertiary)]">
          {playlist.cover_image_url && (
            <Image
              src={playlist.cover_image_url}
              alt={playlist.name}
              fill
              sizes="32px"
              className="object-cover"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--text-primary)]">
            {playlist.name}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {playlist.song_count || 0} songs
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-1 pr-2">
        <Link
          href={`/admin/playlist-manager/${playlist.id}/edit`}
          className={smallIconButtonClass}
          title="Edit playlist"
        >
          <EditIcon size={14} />
        </Link>

        <DropdownShell
          open={openDropdownId === playlist.id}
          onOpenChange={(o) => setOpenDropdownId(o ? playlist.id : null)}
          placement="bottom-end"
          trigger={({ open }) => (
            <button
              type="button"
              className={`${smallIconButtonClass} ${open ? iconButtonActiveClass : ""}`}
              aria-label="More options"
            >
              <MoreIcon size={14} />
            </button>
          )}
        >
          <Link
            href={`/admin/playlist-manager/${playlist.id}/edit`}
            onClick={() => setOpenDropdownId(null)}
          >
            Edit Playlist
          </Link>
          <button
            type="button"
            className="danger-hover"
            disabled={deletingId === playlist.id}
            onClick={() => {
              setOpenDropdownId(null);
              onDelete(playlist);
            }}
          >
            {deletingId === playlist.id ? "Deleting..." : "Delete Playlist"}
          </button>
        </DropdownShell>
      </div>
    </div>
  );
}

// ─── Drag overlay (static preview while dragging) ─────────────────────────────

function DragOverlayRow({ playlist }: { playlist: CuratedPlaylist }) {
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl">
      <div className="flex items-center py-2.5 pl-3 pr-1 text-[var(--text-muted)]">
        <DragIconSmall />
      </div>
      <div className="flex flex-1 items-center gap-3 py-2.5 pr-4">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--bg-tertiary)]">
          {playlist.cover_image_url && (
            <Image
              src={playlist.cover_image_url}
              alt={playlist.name}
              fill
              sizes="32px"
              className="object-cover"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--text-primary)]">
            {playlist.name}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {playlist.song_count || 0} songs
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaylistManagerPage() {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [groups, setGroups] = useState<CuratedPlaylistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [playlistRes, groupRes] = await Promise.all([
          fetch("/api/admin/curated-playlists"),
          fetch("/api/admin/curated-playlist-groups"),
        ]);

        const [playlistData, groupData] = await Promise.all([
          playlistRes.json(),
          groupRes.json(),
        ]);

        if (!playlistRes.ok)
          throw new Error(playlistData?.error || "Failed to load playlists");
        if (!groupRes.ok)
          throw new Error(groupData?.error || "Failed to load groups");

        if (!cancelled) {
          setPlaylists(Array.isArray(playlistData) ? playlistData : []);
          setGroups(
            Array.isArray(groupData)
              ? [...groupData].sort((a, b) => a.position - b.position)
              : [],
          );
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group playlists by group name, preserving group display order
  const playlistsByGroup = useMemo(() => {
    const map = new Map<string, CuratedPlaylist[]>();

    // Seed with all known groups in position order
    for (const g of groups) {
      map.set(g.name, []);
    }

    // Assign playlists
    for (const p of playlists) {
      const key = p.playlist_group;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }

    // Sort within each group by position
    for (const pls of map.values()) {
      pls.sort((a, b) => a.position - b.position);
    }

    return map;
  }, [playlists, groups]);

  // Only groups that have at least one playlist
  const orderedGroupNames = useMemo(
    () =>
      [...playlistsByGroup.keys()].filter(
        (name) => (playlistsByGroup.get(name)?.length ?? 0) > 0,
      ),
    [playlistsByGroup],
  );

  const activePlaylist = useMemo(
    () => (activeId ? (playlists.find((p) => p.id === activeId) ?? null) : null),
    [activeId, playlists],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Find the group containing the dragged item
    let groupName: string | null = null;
    for (const [name, pls] of playlistsByGroup) {
      if (pls.some((p) => p.id === active.id)) {
        groupName = name;
        break;
      }
    }

    if (!groupName) return;

    const groupPlaylists = playlistsByGroup.get(groupName) ?? [];
    const oldIndex = groupPlaylists.findIndex((p) => p.id === active.id);
    const newIndex = groupPlaylists.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(groupPlaylists, oldIndex, newIndex);

    // Optimistic state update
    setPlaylists((prev) => {
      const others = prev.filter((p) => p.playlist_group !== groupName);
      const updated = reordered.map((p, i) => ({ ...p, position: i }));
      return [...others, ...updated];
    });

    // Persist to Supabase
    const updates = reordered.map((p, i) => ({ id: p.id, position: i }));
    fetch("/api/admin/curated-playlists/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    }).catch((err) => {
      console.error("Failed to persist playlist reorder:", err);
    });
  }

  async function deletePlaylist(playlist: CuratedPlaylist) {
    const confirmed = window.confirm(`Delete "${playlist.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(playlist.id);
      const res = await fetch(`/api/admin/curated-playlists/${playlist.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete playlist");
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete playlist",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const totalPlaylists = playlists.length;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <div className="flex items-end justify-between gap-4 px-8 pt-14 pb-8">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            Playlist Manager
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage curated playlists and their groups.
          </p>
        </div>
        <Link
          href="/admin/playlist-manager/new"
          className={`${primaryPillButtonClass} hidden md:flex`}
        >
          <PlusIcon />
          <span>New Playlist</span>
        </Link>
      </div>

      <div className="grid gap-3 px-8 pb-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Playlists panel */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
            <div>
              <h2 className="text-sm font-medium text-[var(--text-primary)]">
                Curated Playlists
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {loading
                  ? "Loading..."
                  : `${totalPlaylists} playlist${totalPlaylists === 1 ? "" : "s"}`}
              </p>
            </div>
            <Link
              href="/admin/playlist-manager/new"
              className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              + New
            </Link>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-[52px] animate-pulse items-center gap-3 px-4"
                  style={{
                    borderBottom:
                      i < 5 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <div className="h-8 w-8 shrink-0 rounded bg-[var(--bg-tertiary)]" />
                  <div className="flex-1">
                    <div className="h-2 w-[45%] rounded bg-[var(--bg-tertiary)]" />
                    <div className="mt-1.5 h-2 w-[30%] rounded bg-[var(--bg-tertiary)]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="p-4 text-sm text-[var(--danger)]">{error}</div>
          )}

          {!loading && !error && totalPlaylists === 0 && (
            <div className="flex min-h-[140px] items-center justify-center px-4 text-sm text-[var(--text-secondary)]">
              No playlists yet.
            </div>
          )}

          {/* Grouped + sortable list */}
          {!loading && !error && totalPlaylists > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {orderedGroupNames.map((groupName, groupIndex) => {
                const groupPlaylists = playlistsByGroup.get(groupName) ?? [];
                const isLastGroup = groupIndex === orderedGroupNames.length - 1;

                return (
                  <div key={groupName}>
                    {/* Group header */}
                    <div
                      className="flex h-8 items-center px-4"
                      style={{
                        borderTop:
                          groupIndex > 0
                            ? "1px solid var(--border)"
                            : undefined,
                        borderBottom: "1px solid var(--border-subtle)",
                        background: "var(--bg-tertiary)",
                      }}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        {groupName}
                      </span>
                      <span className="ml-2 text-[11px] text-[var(--text-muted)] opacity-60">
                        {groupPlaylists.length}
                      </span>
                    </div>

                    <SortableContext
                      items={groupPlaylists.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {groupPlaylists.map((playlist, index) => (
                        <SortablePlaylistRow
                          key={playlist.id}
                          playlist={playlist}
                          isLastInGroup={
                            index === groupPlaylists.length - 1 && isLastGroup
                          }
                          openDropdownId={openDropdownId}
                          setOpenDropdownId={setOpenDropdownId}
                          deletingId={deletingId}
                          onDelete={deletePlaylist}
                        />
                      ))}
                    </SortableContext>
                  </div>
                );
              })}

              <DragOverlay dropAnimation={null}>
                {activePlaylist ? (
                  <DragOverlayRow playlist={activePlaylist} />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Groups panel */}
        <AdminPlaylistGroupManager embedded />
      </div>
    </main>
  );
}
