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
  PlaylistManagerSortableCard,
} from "@/components/admin/AdminPlaylistManagerShared";
import { BackendButton } from "@/components/backend/BackendControls";
import Toast from "@/components/Toast";
import PlusIcon from "@/components/icons/PlusIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import {
  DISCOVER_SECTION_SHELF_KEYS,
  DISCOVER_SECTION_SHELF_LABELS,
  type DiscoverSectionShelfKey,
  type DiscoverSectionShelfState,
} from "@/lib/discoverSections";

type Props = {
  playlists: CuratedPlaylist[];
  loading: boolean;
  error: string;
};

function emptySectionState(): DiscoverSectionShelfState {
  return {
    discover_moods: [],
    discover_curated: [],
    discover_production: [],
  };
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
}: Props) {
  const [sectionState, setSectionState] =
    useState<DiscoverSectionShelfState>(emptySectionState);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionError, setSectionError] = useState("");
  const [pickerSection, setPickerSection] =
    useState<DiscoverSectionShelfKey | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<DiscoverSectionShelfKey, boolean>
  >({
    discover_moods: false,
    discover_curated: false,
    discover_production: false,
  });

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

  const playlistById = useMemo(
    () => new Map(playlists.map((playlist) => [playlist.id, playlist] as const)),
    [playlists],
  );

  function getSectionPlaylists(sectionKey: DiscoverSectionShelfKey) {
    return sectionState[sectionKey]
      .map((item) => playlistById.get(item.playlist_id))
      .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist));
  }

  function toggleSection(sectionKey: DiscoverSectionShelfKey) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
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
      setPickerSection(null);
      setToastMessage(
        playlistIds.length === 1
          ? `Added to ${DISCOVER_SECTION_SHELF_LABELS[sectionKey]}`
          : `Added ${playlistIds.length} playlists to ${DISCOVER_SECTION_SHELF_LABELS[sectionKey]}`,
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
      <div className="grid gap-3">
        {DISCOVER_SECTION_SHELF_KEYS.map((sectionKey) => {
          const sectionLabel = DISCOVER_SECTION_SHELF_LABELS[sectionKey];
          const sectionPlaylists = getSectionPlaylists(sectionKey);
          const sectionCollapsed = collapsedSections[sectionKey];

          return (
            <PlaylistManagerCollapsibleSection
              key={sectionKey}
              title={sectionLabel}
              subtitle={`${sectionPlaylists.length} playlist${sectionPlaylists.length === 1 ? "" : "s"}`}
              collapsed={sectionCollapsed}
              onToggle={() => toggleSection(sectionKey)}
              wrapHeader
              wrapActions
              actions={
                <BackendButton
                  type="button"
                  onClick={() => setPickerSection(sectionKey)}
                  disabled={savingSection}
                >
                  <PlusIcon size={12} />
                  <span>Add</span>
                </BackendButton>
              }
            >
              {sectionPlaylists.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-xs text-[var(--text-secondary)]">
                  Add a playlist to this section.
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
                    <div className={PLAYLIST_MANAGER_GRID_CLASS}>
                      {sectionPlaylists.map((playlist) => (
                        <PlaylistManagerSortableCard
                          key={playlist.id}
                          playlist={playlist}
                          editHref={`/admin/playlist-manager/${playlist.id}/edit`}
                          meta={`${playlist.song_count || 0} songs`}
                          removeAriaLabel={`Remove ${playlist.name} from ${sectionLabel}`}
                          removeTitle={`Remove from ${sectionLabel}`}
                          onRemove={() =>
                            void removeFromSection(sectionKey, playlist)
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </PlaylistManagerCollapsibleSection>
          );
        })}
      </div>

      {pickerSection && (
        <AdminPlaylistShelfPickerModal
          isOpen
          title={DISCOVER_SECTION_SHELF_LABELS[pickerSection]}
          playlists={playlists}
          existingIds={sectionState[pickerSection].map((item) => item.playlist_id)}
          saving={savingSection}
          onClose={() => setPickerSection(null)}
          onAdd={(playlistIds) => addToSection(pickerSection, playlistIds)}
        />
      )}

      <Toast message={toastMessage} bottomOffset="24px" />
    </>
  );
}
