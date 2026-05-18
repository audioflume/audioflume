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
import { DISCOVER_SECTION_OPTIONS } from "@/lib/curatedPlaylists";

// ─── Sortable playlist row ────────────────────────────────────────────────────

function SortablePlaylistRow({
  playlist,
  isLastInGroup,
  openDropdownId,
  setOpenDropdownId,
  deletingId,
  onDelete,
  editHref,
  editLabel = "Edit Playlist",
}: {
  playlist: CuratedPlaylist;
  isLastInGroup: boolean;
  openDropdownId: number | null;
  setOpenDropdownId: (id: number | null) => void;
  deletingId: number | null;
  onDelete: (playlist: CuratedPlaylist) => void;
  editHref: string;
  editLabel?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: playlist.id });

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
      className="group flex items-center bg-[var(--bg-secondary)] transition hover:bg-[var(--bg-hover)]"
    >
      <button
        type="button"
        className="flex h-full cursor-grab items-center px-3 py-2.5 text-[var(--text-muted)] opacity-40 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <DragIconSmall />
      </button>

      <Link href={editHref} className="flex flex-1 items-center gap-3 py-2.5">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--bg-tertiary)]">
          {playlist.cover_image_url && (
            <Image src={playlist.cover_image_url} alt={playlist.name} fill sizes="32px" className="object-cover" unoptimized />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--text-primary)]">{playlist.name}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{playlist.song_count || 0} songs</div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-1 pr-2">
        <Link href={editHref} className={smallIconButtonClass} title={editLabel}>
          <EditIcon size={14} />
        </Link>

        <DropdownShell
          open={openDropdownId === playlist.id}
          onOpenChange={(o) => setOpenDropdownId(o ? playlist.id : null)}
          placement="bottom-end"
          trigger={({ open }) => (
            <button type="button" className={`${smallIconButtonClass} ${open ? iconButtonActiveClass : ""}`} aria-label="More options">
              <MoreIcon size={14} />
            </button>
          )}
        >
          <Link href={editHref} onClick={() => setOpenDropdownId(null)}>{editLabel}</Link>
          <button
            type="button"
            className="danger-hover"
            disabled={deletingId === playlist.id}
            onClick={() => { setOpenDropdownId(null); onDelete(playlist); }}
          >
            {deletingId === playlist.id ? "Deleting..." : "Delete Playlist"}
          </button>
        </DropdownShell>
      </div>
    </div>
  );
}

function DragOverlayRow({ playlist }: { playlist: CuratedPlaylist }) {
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl">
      <div className="flex items-center px-3 py-2.5 text-[var(--text-muted)] opacity-40"><DragIconSmall /></div>
      <div className="flex flex-1 items-center gap-3 py-2.5 pr-4">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--bg-tertiary)]">
          {playlist.cover_image_url && (
            <Image src={playlist.cover_image_url} alt={playlist.name} fill sizes="32px" className="object-cover" unoptimized />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--text-primary)]">{playlist.name}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{playlist.song_count || 0} songs</div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ManagerTab = "playlists" | "discover";

const DISCOVER_CURATED_GROUP = "Curated Playlists";
const DISCOVER_GROUPS = [
  ...DISCOVER_SECTION_OPTIONS.map((option) => option.label),
  DISCOVER_CURATED_GROUP,
];

function getDiscoverGroupName(playlist: CuratedPlaylist) {
  if (playlist.discover_section) {
    return DISCOVER_SECTION_OPTIONS.find((option) => option.value === playlist.discover_section)?.label ?? null;
  }

  if (playlist.show_on_discover) return DISCOVER_CURATED_GROUP;

  return null;
}

function getDiscoverSortPosition(playlist: CuratedPlaylist) {
  return playlist.discover_position ?? playlist.position ?? 0;
}

export default function PlaylistManagerPage() {
  const [activeTab, setActiveTab] = useState<ManagerTab>("playlists");
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [groups, setGroups] = useState<CuratedPlaylistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
        const [playlistData, groupData] = await Promise.all([playlistRes.json(), groupRes.json()]);
        if (!playlistRes.ok) throw new Error(playlistData?.error || "Failed to load playlists");
        if (!groupRes.ok) throw new Error(groupData?.error || "Failed to load groups");
        if (!cancelled) {
          setPlaylists(Array.isArray(playlistData) ? playlistData : []);
          setGroups(Array.isArray(groupData) ? [...groupData].sort((a, b) => a.position - b.position) : []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const playlistsByGroup = useMemo(() => {
    const map = new Map<string, CuratedPlaylist[]>();

    if (activeTab === "discover") {
      for (const name of DISCOVER_GROUPS) map.set(name, []);
      for (const p of playlists) {
        const key = getDiscoverGroupName(p);
        if (key) map.get(key)?.push(p);
      }
      for (const pls of map.values()) {
        pls.sort((a, b) => getDiscoverSortPosition(a) - getDiscoverSortPosition(b));
      }
      return map;
    }

    for (const g of groups) map.set(g.name, []);
    for (const p of playlists) {
      if (p.discover_section) continue;
      const key = p.playlist_group;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    for (const pls of map.values()) pls.sort((a, b) => a.position - b.position);
    return map;
  }, [activeTab, playlists, groups]);

  const orderedGroupNames = useMemo(
    () =>
      activeTab === "discover"
        ? DISCOVER_GROUPS
        : [...playlistsByGroup.keys()].filter((name) => (playlistsByGroup.get(name)?.length ?? 0) > 0),
    [activeTab, playlistsByGroup],
  );

  const activePlaylist = useMemo(
    () => (activeId ? (playlists.find((p) => p.id === activeId) ?? null) : null),
    [activeId, playlists],
  );

  function handleDragStart(event: DragStartEvent) { setActiveId(event.active.id as number); }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    let groupName: string | null = null;
    for (const [name, pls] of playlistsByGroup) {
      if (pls.some((p) => p.id === active.id)) { groupName = name; break; }
    }
    if (!groupName) return;

    const groupPlaylists = playlistsByGroup.get(groupName) ?? [];
    const oldIndex = groupPlaylists.findIndex((p) => p.id === active.id);
    const newIndex = groupPlaylists.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(groupPlaylists, oldIndex, newIndex);
    setPlaylists((prev) =>
      prev.map((playlist) => {
        const nextIndex = reordered.findIndex((item) => item.id === playlist.id);
        if (nextIndex === -1) return playlist;

        return activeTab === "discover"
          ? { ...playlist, discover_position: nextIndex }
          : { ...playlist, position: nextIndex };
      }),
    );
    fetch("/api/admin/curated-playlists/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: activeTab,
        updates: reordered.map((p, i) => ({ id: p.id, position: i })),
      }),
    }).catch(console.error);
  }

  async function deletePlaylist(playlist: CuratedPlaylist) {
    const confirmed = window.confirm(`Delete "${playlist.name}"?`);
    if (!confirmed) return;
    try {
      setDeletingId(playlist.id);
      const res = await fetch(`/api/admin/curated-playlists/${playlist.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete playlist");
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete playlist");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPlaylists = activeTab === "discover"
    ? playlists.filter((playlist) => getDiscoverGroupName(playlist)).length
    : playlists.length;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <div className="flex items-end justify-between gap-4 px-8 pt-14 pb-8">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            Playlist Manager
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Manage curated playlists and the content blocks on Discover.</p>
        </div>
        <Link href={activeTab === "discover" ? "/admin/playlist-manager/new?discoverSection=discover_block_1" : "/admin/playlist-manager/new"} className={`${primaryPillButtonClass} hidden md:flex`}>
          <PlusIcon /><span>{activeTab === "discover" ? "New Discover Block" : "New Playlist"}</span>
        </Link>
      </div>

      <div className="px-8 pb-4">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
          {(["playlists", "discover"] as ManagerTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-9 rounded-full px-4 text-xs font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab === "playlists" ? "Playlists" : "Discover"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 px-8 pb-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
            <div>
              <h2 className="text-sm font-medium text-[var(--text-primary)]">{activeTab === "discover" ? "Discover Content" : "Curated Playlists"}</h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {loading ? "Loading..." : `${totalPlaylists} item${totalPlaylists === 1 ? "" : "s"}`}
              </p>
            </div>
            <Link href={activeTab === "discover" ? "/admin/playlist-manager/new?discoverSection=discover_block_1" : "/admin/playlist-manager/new"} className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">+ New</Link>
          </div>

          {loading && (
            <div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex h-[52px] animate-pulse items-center gap-3 px-4" style={{ borderBottom: i < 5 ? "1px solid var(--border-subtle)" : "none" }}>
                  <div className="h-8 w-8 shrink-0 rounded bg-[var(--bg-tertiary)]" />
                  <div className="flex-1">
                    <div className="h-2 w-[45%] rounded bg-[var(--bg-tertiary)]" />
                    <div className="mt-1.5 h-2 w-[30%] rounded bg-[var(--bg-tertiary)]" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && error && <div className="p-4 text-sm text-[var(--danger)]">{error}</div>}
          {!loading && !error && activeTab === "playlists" && totalPlaylists === 0 && (
            <div className="flex min-h-[140px] items-center justify-center px-4 text-sm text-[var(--text-secondary)]">No playlists yet.</div>
          )}

          {!loading && !error && (activeTab === "discover" || totalPlaylists > 0) && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {orderedGroupNames.map((groupName, groupIndex) => {
                const groupPlaylists = playlistsByGroup.get(groupName) ?? [];
                const isLastGroup = groupIndex === orderedGroupNames.length - 1;
                return (
                  <div key={groupName}>
                    <div
                      className="flex h-8 items-center px-4"
                      style={{
                        borderTop: groupIndex > 0 ? "1px solid var(--border)" : undefined,
                        borderBottom: "1px solid var(--border-subtle)",
                        background: "var(--bg-tertiary)",
                      }}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">{groupName}</span>
                      <span className="ml-2 text-[11px] text-[var(--text-muted)] opacity-60">{groupPlaylists.length}</span>
                    </div>
                    {groupPlaylists.length === 0 ? (
                      <div className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-3 text-xs text-[var(--text-muted)]">
                        <span>No item assigned.</span>
                        {activeTab === "discover" && groupName !== DISCOVER_CURATED_GROUP && (
                          <Link
                            href={`/admin/playlist-manager/new?discoverSection=${DISCOVER_SECTION_OPTIONS.find((option) => option.label === groupName)?.value ?? "discover_block_1"}`}
                            className="font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                          >
                            Add block
                          </Link>
                        )}
                      </div>
                    ) : (
                      <SortableContext items={groupPlaylists.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                      {groupPlaylists.map((playlist, index) => (
                        <SortablePlaylistRow
                          key={playlist.id}
                          playlist={playlist}
                          isLastInGroup={index === groupPlaylists.length - 1 && isLastGroup}
                          openDropdownId={openDropdownId}
                          setOpenDropdownId={setOpenDropdownId}
                          deletingId={deletingId}
                          onDelete={deletePlaylist}
                          editHref={getEditHref(playlist, activeTab)}
                          editLabel={activeTab === "discover" && playlist.discover_section ? "Edit Discover Block" : "Edit Playlist"}
                        />
                      ))}
                      </SortableContext>
                    )}
                  </div>
                );
              })}
              <DragOverlay dropAnimation={null}>
                {activePlaylist ? <DragOverlayRow playlist={activePlaylist} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {activeTab === "playlists" ? (
          <AdminPlaylistGroupManager
            embedded
            onGroupsReordered={(reordered) =>
              setGroups([...reordered].sort((a, b) => a.position - b.position))
            }
          />
        ) : (
          <aside className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-xl font-medium tracking-[-0.05em]">Discover sections</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Assign playlists to the four main Discover cards, four production style cards, or check &quot;Show in Discover curated playlists&quot; on the edit page to include them in the shelf.
            </p>
            <div className="mt-4 grid gap-2 text-xs text-[var(--text-muted)]">
              <div>Main Blocks: Discover Block 1–4</div>
              <div>Production Style Blocks: Production Style 1–4</div>
              <div>Curated Playlists: checkbox driven</div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
