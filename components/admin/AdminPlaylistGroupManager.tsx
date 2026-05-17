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
import PlusIcon from "@/components/icons/PlusIcon";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  type CuratedPlaylistGroup,
} from "@/lib/curatedPlaylists";
import {
  iconButtonActiveClass,
  modalCancelButtonClass,
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
  modalTextareaClass,
  modalTitleClass,
  primaryPillButtonClass,
  secondaryPillButtonClass,
  smallIconButtonClass,
} from "@/components/uiClasses";

// ─── Group modal ──────────────────────────────────────────────────────────────

function GroupModal({
  mode,
  initialName,
  initialDescription,
  saving,
  onSave,
  onClose,
}: {
  mode: "create" | "edit";
  initialName: string;
  initialDescription: string;
  saving: boolean;
  onSave: (name: string, description: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    onSave(name.trim(), description.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`${modalTitleClass} mb-5`}>
          {mode === "create" ? "New Playlist Group" : "Edit Playlist Group"}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1.5">
            <span className={modalFieldLabelClass}>Group name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={modalInputClass}
              placeholder="e.g. Documentary"
              autoFocus
              required
            />
          </label>

          <label className="grid gap-1.5">
            <span className={modalFieldLabelClass}>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${modalTextareaClass} min-h-[72px]`}
              placeholder="Short description shown under the group heading…"
              rows={3}
            />
          </label>

          <div className="mt-1 flex items-center justify-end gap-2">
            <button type="button" className={modalCancelButtonClass} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={modalPrimaryButtonClass} disabled={saving || !name.trim()}>
              {saving ? "Saving…" : mode === "create" ? "Create Group" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sortable group row (embedded mode) ───────────────────────────────────────

function SortableGroupRow({
  group,
  index,
  total,
  savingGroupId,
  openDropdownId,
  setOpenDropdownId,
  onBeginEditing,
  onDeleteGroup,
}: {
  group: CuratedPlaylistGroup;
  index: number;
  total: number;
  savingGroupId: number | null;
  openDropdownId: number | null;
  setOpenDropdownId: (id: number | null) => void;
  onBeginEditing: (group: CuratedPlaylistGroup) => void;
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
        <div className="truncate text-sm font-medium text-[var(--text-primary)]">{group.name}</div>
        <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          {group.playlist_count || 0} playlist{group.playlist_count === 1 ? "" : "s"}
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
          <button type="button" onClick={() => { setOpenDropdownId(null); onBeginEditing(group); }}>
            Edit Group
          </button>
          <button
            type="button"
            className="danger-hover"
            onClick={() => { setOpenDropdownId(null); onDeleteGroup(group); }}
            disabled={isDefaultGroup}
            title={isDefaultGroup ? "Default group cannot be deleted" : undefined}
          >
            Delete Group
          </button>
        </DropdownShell>
      </div>
    </div>
  );
}

// ─── Drag overlay ─────────────────────────────────────────────────────────────

function GroupDragOverlayRow({ group }: { group: CuratedPlaylistGroup }) {
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl">
      <div className="flex items-center px-3 py-2.5 text-[var(--text-muted)] opacity-40">
        <DragIconSmall />
      </div>
      <div className="min-w-0 flex-1 py-2 pr-4">
        <div className="truncate text-sm font-medium text-[var(--text-primary)]">{group.name}</div>
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
  onGroupsReordered?: (groups: CuratedPlaylistGroup[]) => void;
  embedded?: boolean;
};

export default function AdminPlaylistGroupManager({
  onGroupsChanged,
  onGroupsReordered,
  embedded = false,
}: AdminPlaylistGroupManagerProps) {
  const [groups, setGroups] = useState<CuratedPlaylistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingGroupId, setSavingGroupId] = useState<number | null>(null);
  const [creatingModal, setCreatingModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalTargetGroup, setModalTargetGroup] = useState<CuratedPlaylistGroup | null>(null);

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
      if (!Array.isArray(data)) throw new Error("Invalid response");
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/admin/curated-playlist-groups");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load groups");
        if (!Array.isArray(data)) throw new Error("Invalid response");
        if (!cancelled) setGroups(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load groups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(""), 2400);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Modal helpers
  function openCreateModal() {
    setModalMode("create");
    setModalTargetGroup(null);
    setModalOpen(true);
  }

  function openEditModal(group: CuratedPlaylistGroup) {
    setModalMode("edit");
    setModalTargetGroup(group);
    setModalOpen(true);
  }

  async function handleModalSave(name: string, description: string) {
    if (modalMode === "create") {
      try {
        setCreatingModal(true);
        const res = await fetch("/api/admin/curated-playlist-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to create group");
        setGroups((prev) => [...prev, data]);
        setToastMessage("Playlist group created");
        onGroupsChanged?.();
        setModalOpen(false);
      } catch (err) {
        setToastMessage(err instanceof Error ? err.message : "Failed to create group");
      } finally {
        setCreatingModal(false);
      }
    } else if (modalTargetGroup) {
      try {
        setSavingGroupId(modalTargetGroup.id);
        const res = await fetch(`/api/admin/curated-playlist-groups/${modalTargetGroup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to update group");
        setGroups((prev) =>
          prev.map((g) =>
            g.id === modalTargetGroup.id ? { ...g, name: data.name, description: data.description } : g,
          ),
        );
        setToastMessage("Playlist group updated");
        onGroupsChanged?.();
        setModalOpen(false);
      } catch (err) {
        setToastMessage(err instanceof Error ? err.message : "Failed to update group");
      } finally {
        setSavingGroupId(null);
      }
    }
  }

  async function deleteGroup(group: CuratedPlaylistGroup) {
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

    const reordered = arrayMove(sortedGroups, oldIndex, newIndex).map(
      (g, i) => ({ ...g, position: i }),
    );
    setGroups(reordered);
    onGroupsReordered?.(reordered);

    fetch("/api/admin/curated-playlist-groups/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: reordered.map((g) => ({ id: g.id, position: g.position })) }),
    }).catch(console.error);
  }

  // ─── Embedded panel mode ──────────────────────────────────────────────────

  if (embedded) {
    return (
      <>
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
            <div>
              <h2 className="text-sm font-medium text-[var(--text-primary)]">Playlist Groups</h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {loading ? "Loading..." : `${sortedGroups.length} group${sortedGroups.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              <PlusIcon />
              New
            </button>
          </div>

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
                    savingGroupId={savingGroupId}
                    openDropdownId={openDropdownId}
                    setOpenDropdownId={setOpenDropdownId}
                    onBeginEditing={openEditModal}
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

        {modalOpen && (
          <GroupModal
            mode={modalMode}
            initialName={modalTargetGroup?.name ?? ""}
            initialDescription={modalTargetGroup?.description ?? ""}
            saving={creatingModal || savingGroupId === modalTargetGroup?.id}
            onSave={handleModalSave}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    );
  }

  // ─── Standalone page mode ─────────────────────────────────────────────────

  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">Groups</div>
            <h2 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">Playlist Groups</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Create, rename, and delete the row headers used on the Curated Playlists page.</p>
          </div>
          <button type="button" className={primaryPillButtonClass} onClick={openCreateModal}>
            <PlusIcon />
            New Group
          </button>
        </div>

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
              const saving = savingGroupId === group.id;
              const isDefaultGroup = group.name === DEFAULT_CURATED_PLAYLIST_GROUP;
              return (
                <div key={group.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--text-primary)]">{group.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {group.playlist_count || 0} playlist{group.playlist_count === 1 ? "" : "s"}
                      {isDefaultGroup ? " · Default" : ""}
                    </div>
                  </div>
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
                    <button type="button" onClick={() => { setOpenDropdownId(null); openEditModal(group); }}>Edit Group</button>
                    <button type="button" className="danger-hover" onClick={() => { setOpenDropdownId(null); deleteGroup(group); }} disabled={isDefaultGroup} title={isDefaultGroup ? "Default group cannot be deleted" : undefined}>Delete Group</button>
                  </DropdownShell>
                </div>
              );
            })}
          </div>
        )}

        <Toast message={toastMessage} bottomOffset="24px" />
      </section>

      {modalOpen && (
        <GroupModal
          mode={modalMode}
          initialName={modalTargetGroup?.name ?? ""}
          initialDescription={modalTargetGroup?.description ?? ""}
          saving={creatingModal || savingGroupId === modalTargetGroup?.id}
          onSave={handleModalSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
