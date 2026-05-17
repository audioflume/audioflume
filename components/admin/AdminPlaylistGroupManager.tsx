"use client";

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
import Toast from "@/components/Toast";
import DropdownShell from "@/components/DropdownShell";
import DragIconSmall from "@/components/icons/DragIconSmall";
import MoreIcon from "@/components/icons/MoreIcon";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  type CuratedPlaylistGroup,
} from "@/lib/curatedPlaylists";
import {
  iconButtonActiveClass,
  primaryPillButtonClass,
  secondaryPillButtonClass,
  smallIconButtonClass,
} from "@/components/uiClasses";

// ─── Sortable group row (embedded mode) ───────────────────────────────────────

function SortableGroupRow({
  group,
  index,
  total,
  editingGroupId,
  editingGroupName,
  setEditingGroupName,
  savingGroupId,
  openDropdownId,
  setOpenDropdownId,
  onBeginEditing,
  onCancelEditing,
  onSaveGroup,
  onDeleteGroup,
}: {
  group: CuratedPlaylistGroup;
  index: number;
  total: number;
  editingGroupId: number | null;
  editingGroupName: string;
  setEditingGroupName: (v: string) => void;
  savingGroupId: number | null;
  openDropdownId: number | null;
  setOpenDropdownId: (id: number | null) => void;
  onBeginEditing: (group: CuratedPlaylistGroup) => void;
  onCancelEditing: () => void;
  onSaveGroup: (group: CuratedPlaylistGroup) => void;
  onDeleteGroup: (group: CuratedPlaylistGroup) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const editing = editingGroupId === group.id;
  const saving = savingGroupId === group.id;
  const isDefaultGroup = group.name === DEFAULT_CURATED_PLAYLIST_GROUP;
  const dropdownOpen = openDropdownId === group.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        borderBottom: index < total - 1 ? "1px solid var(--border-subtle)" : "none",
      }}
      className="flex items-center bg-[var(--bg-secondary)] transition hover:bg-[var(--bg-hover)]"
    >
      {editing ? (
        <div className="flex flex-1 items-center gap-2 px-4 py-2">
          <input
            value={editingGroupName}
            onChange={(e) => setEditingGroupName(e.target.value)}
            className="h-7 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
            autoFocus
          />
          <button
            type="button"
            className="h-7 shrink-0 rounded-full border border-[var(--border)] px-2 text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
            onClick={onCancelEditing}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-7 shrink-0 rounded-full border border-[var(--border)] px-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--text-muted)] disabled:opacity-50"
            onClick={() => onSaveGroup(group)}
            disabled={saving}
          >
            {saving ? "..." : "Save"}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="flex h-full cursor-grab items-center px-3 py-2.5 text-[var(--text-muted)] opacity-40 active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <DragIconSmall />
          </button>

          <div className="min-w-0 flex-1 py-2">
            <div className="truncate text-sm font-medium text-[var(--text-primary)]">
              {group.name}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {group.playlist_count || 0} playlist
              {group.playlist_count === 1 ? "" : "s"}
              {isDefaultGroup ? " · Default" : ""}
            </div>
          </div>

          <div className="shrink-0 pr-2">
            <DropdownShell
              open={dropdownOpen}
              onOpenChange={(o) => setOpenDropdownId(o ? group.id : null)}
              placement="bottom-end"
              trigger={({ open }) => (
                <button
                  type="button"
                  className={`${smallIconButtonClass} ${open ? iconButtonActiveClass : ""}`}
                  aria-label="More options"
                  disabled={saving}
                >
                  <MoreIcon size={14} />
                </button>
              )}
            >
              <button type="button" onClick={() => onBeginEditing(group)}>
                Edit Group
              </button>
              <button
                type="button"
                className="danger-hover"
                onClick={() => onDeleteGroup(group)}
                disabled={isDefaultGroup}
                title={isDefaultGroup ? "Default group cannot be deleted" : undefined}
              >
                Delete Group
              </button>
            </DropdownShell>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Drag overlay (embedded mode) ─────────────────────────────────────────────

function GroupDragOverlayRow({ group }: { group: CuratedPlaylistGroup }) {
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl">
      <div className="flex items-center px-3 py-2.5 text-[var(--text-muted)] opacity-40">
        <DragIconSmall />
      </div>
      <div className="min-w-0 flex-1 py-2 pr-4">
        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
          {group.name}
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          {group.playlist_count || 0} playlist{group.playlist_count === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type AdminPlaylistGroupManagerProps = {
  onGroupsChanged?: () => void;
  embedded?: boolean;
};

export default function AdminPlaylistGroupManager({
  onGroupsChanged,
  embedded = false,
}: AdminPlaylistGroupManagerProps) {
  const [groups, setGroups] = useState<CuratedPlaylistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [savingGroupId, setSavingGroupId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.position - b.position),
    [groups],
  );

  const activeGroup = useMemo(
    () => (activeGroupId ? (groups.find((g) => g.id === activeGroupId) ?? null) : null),
    [activeGroupId, groups],
  );

  async function loadGroups() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/curated-playlist-groups");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load groups");
      if (!Array.isArray(data)) throw new Error("Invalid playlist groups response");
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitialGroups() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/admin/curated-playlist-groups");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load groups");
        if (!Array.isArray(data)) throw new Error("Invalid playlist groups response");
        if (!cancelled) setGroups(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load groups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInitialGroups();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = newGroupName.trim();
    if (!cleanName || creating) return;
    try {
      setCreating(true);
      const res = await fetch("/api/admin/curated-playlist-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create group");
      setGroups((prev) => [...prev, data]);
      setNewGroupName("");
      setToastMessage("Playlist group created");
      onGroupsChanged?.();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  function beginEditing(group: CuratedPlaylistGroup) {
    setOpenDropdownId(null);
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  }

  function cancelEditing() {
    setEditingGroupId(null);
    setEditingGroupName("");
  }

  async function saveGroup(group: CuratedPlaylistGroup) {
    const cleanName = editingGroupName.trim();
    if (!cleanName || savingGroupId) return;
    try {
      setSavingGroupId(group.id);
      const res = await fetch(`/api/admin/curated-playlist-groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update group");
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, name: data.name } : g)));
      cancelEditing();
      setToastMessage("Playlist group updated");
      onGroupsChanged?.();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Failed to update group");
    } finally {
      setSavingGroupId(null);
    }
  }

  async function deleteGroup(group: CuratedPlaylistGroup) {
    setOpenDropdownId(null);
    const confirmed = window.confirm(
      group.playlist_count && group.playlist_count > 0
        ? `Delete "${group.name}"? ${group.playlist_count} playlist${group.playlist_count === 1 ? "" : "s"} will move to ${DEFAULT_CURATED_PLAYLIST_GROUP}.`
        : `Delete "${group.name}"?`,
    );
    if (!confirmed) return;
    try {
      setSavingGroupId(group.id);
      const res = await fetch(`/api/admin/curated-playlist-groups/${group.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete group");
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      setToastMessage("Playlist group deleted");
      onGroupsChanged?.();
      loadGroups();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setSavingGroupId(null);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveGroupId(event.active.id as number);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveGroupId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = sortedGroups.findIndex((g) => g.id === active.id);
    const newIndex = sortedGroups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedGroups, oldIndex, newIndex);
    setGroups(reordered.map((g, i) => ({ ...g, position: i })));

    fetch("/api/admin/curated-playlist-groups/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: reordered.map((g, i) => ({ id: g.id, position: i })) }),
    }).catch(console.error);
  }

  // ─── Embedded panel mode ────────────────────────────────────────────────────

  if (embedded) {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex h-[58px] items-center border-b border-[var(--border)] px-4">
          <div>
            <h2 className="text-sm font-medium text-[var(--text-primary)]">Playlist Groups</h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              {loading ? "Loading..." : `${sortedGroups.length} group${sortedGroups.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <form onSubmit={createGroup} className="flex gap-2 border-b border-[var(--border)] px-4 py-3">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
            placeholder="New group name"
          />
          <button
            type="submit"
            className="h-8 shrink-0 rounded-full border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
            disabled={creating}
          >
            {creating ? "Adding..." : "Add"}
          </button>
        </form>

        {loading && (
          <div className="grid gap-2 px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[46px] animate-pulse rounded-lg bg-[var(--bg-tertiary)]" />
            ))}
          </div>
        )}

        {!loading && error && <div className="px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}

        {!loading && !error && sortedGroups.length === 0 && (
          <div className="flex min-h-[100px] items-center justify-center px-4 text-sm text-[var(--text-secondary)]">
            No groups yet.
          </div>
        )}

        {!loading && !error && sortedGroups.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              {sortedGroups.map((group, index) => (
                <SortableGroupRow
                  key={group.id}
                  group={group}
                  index={index}
                  total={sortedGroups.length}
                  editingGroupId={editingGroupId}
                  editingGroupName={editingGroupName}
                  setEditingGroupName={setEditingGroupName}
                  savingGroupId={savingGroupId}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  onBeginEditing={beginEditing}
                  onCancelEditing={cancelEditing}
                  onSaveGroup={saveGroup}
                  onDeleteGroup={deleteGroup}
                />
              ))}
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeGroup ? <GroupDragOverlayRow group={activeGroup} /> : null}
            </DragOverlay>
          </DndContext>
        )}

        <Toast message={toastMessage} bottomOffset="24px" />
      </div>
    );
  }

  // ─── Standalone page mode ───────────────────────────────────────────────────

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
      <div className="mb-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">Groups</div>
        <h2 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">Playlist Groups</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Create, rename, and delete the row headers used on the Curated Playlists page.</p>
      </div>

      <form onSubmit={createGroup} className="mb-4 flex gap-2">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
          placeholder="New group name"
        />
        <button type="submit" className={primaryPillButtonClass} disabled={creating}>
          {creating ? "Adding..." : "Add Group"}
        </button>
      </form>

      {loading && (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[54px] animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && !error && sortedGroups.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">No groups yet.</div>
      )}

      {!loading && !error && sortedGroups.length > 0 && (
        <div className="grid gap-2">
          {sortedGroups.map((group) => {
            const editing = editingGroupId === group.id;
            const saving = savingGroupId === group.id;
            const isDefaultGroup = group.name === DEFAULT_CURATED_PLAYLIST_GROUP;
            return (
              <div key={group.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-2">
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <input
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="truncate text-sm font-medium text-[var(--text-primary)]">{group.name}</div>
                      <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {group.playlist_count || 0} playlist{group.playlist_count === 1 ? "" : "s"}
                        {isDefaultGroup ? " · Default" : ""}
                      </div>
                    </>
                  )}
                </div>
                {editing ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" className={secondaryPillButtonClass} onClick={cancelEditing} disabled={saving}>Cancel</button>
                    <button type="button" className={primaryPillButtonClass} onClick={() => saveGroup(group)} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  </div>
                ) : (
                  <DropdownShell
                    open={openDropdownId === group.id}
                    onOpenChange={(o) => setOpenDropdownId(o ? group.id : null)}
                    placement="bottom-end"
                    trigger={({ open }) => (
                      <button type="button" className={`${smallIconButtonClass} ${open ? iconButtonActiveClass : ""}`} aria-label="More options" disabled={saving}>
                        <MoreIcon size={14} />
                      </button>
                    )}
                  >
                    <button type="button" onClick={() => beginEditing(group)}>Edit Group</button>
                    <button type="button" className="danger-hover" onClick={() => deleteGroup(group)} disabled={isDefaultGroup} title={isDefaultGroup ? "Default group cannot be deleted" : undefined}>Delete Group</button>
                  </DropdownShell>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Toast message={toastMessage} bottomOffset="24px" />
    </section>
  );
}
