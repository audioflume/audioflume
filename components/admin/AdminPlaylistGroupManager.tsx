"use client";

import { useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";
import TrashIcon from "@/components/icons/TrashIcon";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  type CuratedPlaylistGroup,
} from "@/lib/curatedPlaylists";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
  smallIconButtonClass,
} from "@/components/uiClasses";

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
  const [toastMessage, setToastMessage] = useState("");

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.position - b.position),
    [groups],
  );

  async function loadGroups() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/curated-playlist-groups");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load groups");
      if (!Array.isArray(data))
        throw new Error("Invalid playlist groups response");
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
        if (!Array.isArray(data))
          throw new Error("Invalid playlist groups response");
        if (!cancelled) setGroups(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load groups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialGroups();
    return () => {
      cancelled = true;
    };
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
      setToastMessage(
        err instanceof Error ? err.message : "Failed to create group",
      );
    } finally {
      setCreating(false);
    }
  }

  function beginEditing(group: CuratedPlaylistGroup) {
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
      const res = await fetch(
        `/api/admin/curated-playlist-groups/${group.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cleanName }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update group");
      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id ? { ...g, name: data.name } : g,
        ),
      );
      cancelEditing();
      setToastMessage("Playlist group updated");
      onGroupsChanged?.();
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to update group",
      );
    } finally {
      setSavingGroupId(null);
    }
  }

  async function deleteGroup(group: CuratedPlaylistGroup) {
    const confirmed = window.confirm(
      group.playlist_count && group.playlist_count > 0
        ? `Delete "${group.name}"? ${group.playlist_count} playlist${
            group.playlist_count === 1 ? "" : "s"
          } will move to ${DEFAULT_CURATED_PLAYLIST_GROUP}.`
        : `Delete "${group.name}"?`,
    );
    if (!confirmed) return;
    try {
      setSavingGroupId(group.id);
      const res = await fetch(
        `/api/admin/curated-playlist-groups/${group.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete group");
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      setToastMessage("Playlist group deleted");
      onGroupsChanged?.();
      loadGroups();
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to delete group",
      );
    } finally {
      setSavingGroupId(null);
    }
  }

  // ─── Embedded panel mode ──────────────────────────────────────────────────

  if (embedded) {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
        {/* Header */}
        <div className="flex h-[58px] items-center border-b border-[var(--border)] px-4">
          <div>
            <h2 className="text-sm font-medium text-[var(--text-primary)]">
              Playlist Groups
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              {loading
                ? "Loading..."
                : `${sortedGroups.length} group${sortedGroups.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {/* Add form */}
        <form
          onSubmit={createGroup}
          className="flex gap-2 border-b border-[var(--border)] px-4 py-3"
        >
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

        {/* Loading */}
        {loading && (
          <div className="grid gap-2 px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[46px] animate-pulse rounded-lg bg-[var(--bg-tertiary)]"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="px-4 py-3 text-sm text-[var(--danger)]">{error}</div>
        )}

        {/* Empty */}
        {!loading && !error && sortedGroups.length === 0 && (
          <div className="flex min-h-[100px] items-center justify-center px-4 text-sm text-[var(--text-secondary)]">
            No groups yet.
          </div>
        )}

        {/* Group rows */}
        {!loading && !error && sortedGroups.length > 0 && (
          <div>
            {sortedGroups.map((group, index) => {
              const editing = editingGroupId === group.id;
              const saving = savingGroupId === group.id;
              const isDefaultGroup =
                group.name === DEFAULT_CURATED_PLAYLIST_GROUP;

              return (
                <div
                  key={group.id}
                  className="flex items-center gap-2 px-4 py-2.5 transition hover:bg-[var(--bg-hover)]"
                  style={{
                    borderBottom:
                      index < sortedGroups.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  {editing ? (
                    <>
                      <input
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        className="h-7 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="h-7 shrink-0 rounded-full border border-[var(--border)] px-2 text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="h-7 shrink-0 rounded-full border border-[var(--border)] px-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--text-muted)] disabled:opacity-50"
                        onClick={() => saveGroup(group)}
                        disabled={saving}
                      >
                        {saving ? "..." : "Save"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {group.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                          {group.playlist_count || 0} playlist
                          {group.playlist_count === 1 ? "" : "s"}
                          {isDefaultGroup ? " · Default" : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="h-6 rounded-full border border-[var(--border)] px-2 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                          onClick={() => beginEditing(group)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={smallIconButtonClass}
                          onClick={() => deleteGroup(group)}
                          disabled={saving || isDefaultGroup}
                          title={
                            isDefaultGroup
                              ? "Default group cannot be deleted"
                              : undefined
                          }
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Toast message={toastMessage} bottomOffset="24px" />
      </div>
    );
  }

  // ─── Standalone page mode ─────────────────────────────────────────────────

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
      <div className="mb-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Groups
        </div>
        <h2 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
          Playlist Groups
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Create, rename, and delete the row headers used on the Curated
          Playlists page.
        </p>
      </div>

      <form onSubmit={createGroup} className="mb-4 flex gap-2">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
          placeholder="New group name"
        />
        <button
          type="submit"
          className={primaryPillButtonClass}
          disabled={creating}
        >
          {creating ? "Adding..." : "Add Group"}
        </button>
      </form>

      {loading && (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[54px] animate-pulse rounded-xl bg-[var(--bg-tertiary)]"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {!loading && !error && sortedGroups.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
          No groups yet.
        </div>
      )}

      {!loading && !error && sortedGroups.length > 0 && (
        <div className="grid gap-2">
          {sortedGroups.map((group) => {
            const editing = editingGroupId === group.id;
            const saving = savingGroupId === group.id;
            const isDefaultGroup =
              group.name === DEFAULT_CURATED_PLAYLIST_GROUP;

            return (
              <div
                key={group.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-2"
              >
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
                      <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {group.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {group.playlist_count || 0} playlist
                        {group.playlist_count === 1 ? "" : "s"}
                        {isDefaultGroup ? " · Default" : ""}
                      </div>
                    </>
                  )}
                </div>

                {editing ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className={secondaryPillButtonClass}
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={primaryPillButtonClass}
                      onClick={() => saveGroup(group)}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="h-8 rounded-full border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => beginEditing(group)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={smallIconButtonClass}
                      onClick={() => deleteGroup(group)}
                      disabled={saving || isDefaultGroup}
                      title={
                        isDefaultGroup
                          ? "Default group cannot be deleted"
                          : undefined
                      }
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
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
