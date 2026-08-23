"use client";

import Image from "next/image";
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

import Toast from "@/components/Toast";
import AdminArtistShelfPickerModal from "@/components/admin/AdminArtistShelfPickerModal";
import AdminDiscoverFeatureCardArtists from "@/components/admin/AdminDiscoverFeatureCardArtists";
import AdminPlaylistShelfPickerModal from "@/components/admin/AdminPlaylistShelfPickerModal";
import {
  PLAYLIST_MANAGER_GRID_CLASS,
  PlaylistManagerCollapsibleSection,
  PlaylistManagerSortableCard,
} from "@/components/admin/AdminPlaylistManagerShared";
import { BackendButton } from "@/components/backend/BackendControls";
import BackendDragHandle from "@/components/backend/BackendDragHandle";
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

type FeaturedArtist = {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
  hero_image_url: string | null;
  status: string;
};

type FeaturedArtistItem = {
  artist_id: string;
  position: number;
  artist: FeaturedArtist;
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

async function fetchFeaturedArtists() {
  const res = await fetch("/api/admin/discover-featured-artists");
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load featured artists");
  return (Array.isArray(data?.items) ? data.items : []) as FeaturedArtistItem[];
}

function FeaturedArtistSortableCard({
  item,
  onRemove,
}: {
  item: FeaturedArtistItem;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.artist_id });
  const { artist } = item;

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 2 : "auto",
      }}
      className="admin-cover-hover group relative min-w-0"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]">
        {artist.hero_image_url ? (
          <Image
            src={artist.hero_image_url}
            alt={artist.name}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--text-muted)] font-[320]">
            No feature image
          </span>
        )}

        <BackendDragHandle
          variant="overlay"
          className="absolute left-2 top-2 z-10 opacity-0 group-hover:opacity-100"
          aria-label={`Drag ${artist.name} to reorder`}
          {...attributes}
          {...listeners}
        />

        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[var(--bg-primary)] text-lg leading-none text-[var(--text-secondary)] opacity-0 transition hover:bg-[color-mix(in_srgb,var(--bg-primary)_90%,var(--danger)_10%)] hover:text-[var(--danger)] group-hover:opacity-100 font-[200]"
          aria-label={`Remove ${artist.name} from Featured Artists`}
          title="Remove from Featured Artists"
        >
          ×
        </button>
      </div>

      <div className="mt-2.5 min-w-0">
        <h4 className="truncate text-[13px] tracking-[-0.02em] text-[var(--text-primary)] font-[320]">
          {artist.name}
        </h4>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)] font-[320]">
          /artists/{artist.slug}
        </p>
      </div>
    </article>
  );
}

export default function AdminDiscoverLibraryView({
  playlists,
  loading,
  error,
}: Props) {
  const [sectionState, setSectionState] =
    useState<DiscoverSectionShelfState>(emptySectionState);
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtistItem[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [sectionError, setSectionError] = useState("");
  const [featuredError, setFeaturedError] = useState("");
  const [pickerSection, setPickerSection] =
    useState<DiscoverSectionShelfKey | null>(null);
  const [artistPickerOpen, setArtistPickerOpen] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [featuredCollapsed, setFeaturedCollapsed] = useState(false);
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

  async function refreshFeaturedArtists() {
    const next = await fetchFeaturedArtists();
    setFeaturedArtists(next);
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
    let cancelled = false;

    async function loadFeaturedArtists() {
      try {
        setFeaturedLoading(true);
        setFeaturedError("");
        const next = await fetchFeaturedArtists();
        if (!cancelled) setFeaturedArtists(next);
      } catch (err) {
        if (!cancelled) {
          setFeaturedError(
            err instanceof Error ? err.message : "Failed to load featured artists",
          );
        }
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    }

    void loadFeaturedArtists();

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

  async function addFeaturedArtists(artistIds: string[]) {
    if (savingFeatured || artistIds.length === 0) return;

    try {
      setSavingFeatured(true);
      const res = await fetch("/api/admin/discover-featured-artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_ids: artistIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add featured artists");

      await refreshFeaturedArtists();
      setArtistPickerOpen(false);
      setToastMessage(
        artistIds.length === 1
          ? "Added to Featured Artists"
          : `Added ${artistIds.length} artists to Featured Artists`,
      );
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to add featured artists",
      );
    } finally {
      setSavingFeatured(false);
    }
  }

  async function removeFeaturedArtist(item: FeaturedArtistItem) {
    const confirmed = window.confirm(
      `Remove "${item.artist.name}" from Featured Artists?`,
    );
    if (!confirmed || savingFeatured) return;

    try {
      setSavingFeatured(true);
      const res = await fetch("/api/admin/discover-featured-artists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_id: item.artist_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to remove featured artist");

      await refreshFeaturedArtists();
      setToastMessage("Removed from Featured Artists");
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to remove featured artist",
      );
    } finally {
      setSavingFeatured(false);
    }
  }

  async function reorderFeaturedArtists(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || savingFeatured) return;

    const oldIndex = featuredArtists.findIndex(
      (item) => item.artist_id === String(active.id),
    );
    const newIndex = featuredArtists.findIndex(
      (item) => item.artist_id === String(over.id),
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = featuredArtists;
    const reordered = arrayMove(featuredArtists, oldIndex, newIndex).map(
      (item, position) => ({ ...item, position }),
    );
    setFeaturedArtists(reordered);

    try {
      setSavingFeatured(true);
      const res = await fetch("/api/admin/discover-featured-artists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_ids: reordered.map((item) => item.artist_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to reorder featured artists");
    } catch (err) {
      setFeaturedArtists(previous);
      setToastMessage(
        err instanceof Error ? err.message : "Failed to reorder featured artists",
      );
    } finally {
      setSavingFeatured(false);
    }
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

  const combinedError = error || featuredError || sectionError;
  const combinedLoading = loading || featuredLoading || sectionsLoading;

  if (combinedLoading) {
    return (
      <div className="grid gap-12">
        {Array.from({ length: DISCOVER_SECTION_SHELF_KEYS.length + 1 }).map(
          (_, sectionIndex) => (
            <div key={sectionIndex} className="animate-pulse">
              <div className="mb-4 h-5 w-44 bg-[var(--bg-tertiary)]" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[16/9] bg-[var(--bg-tertiary)]"
                  />
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    );
  }

  if (combinedError) {
    return <div className="py-10 text-sm text-[var(--danger)] font-[320]">{combinedError}</div>;
  }

  return (
    <>
      <div className="grid gap-3">
        <PlaylistManagerCollapsibleSection
          title="Featured Artists"
          subtitle={`${featuredArtists.length} artist${featuredArtists.length === 1 ? "" : "s"}`}
          collapsed={featuredCollapsed}
          onToggle={() => setFeaturedCollapsed((current) => !current)}
          wrapHeader
          wrapActions
          actions={
            <BackendButton
              type="button"
              onClick={() => setArtistPickerOpen(true)}
              disabled={savingFeatured}
            >
              <PlusIcon size={12} />
              <span>Add</span>
            </BackendButton>
          }
        >
          {featuredArtists.length === 0 ? (
            <div className="flex min-h-[120px] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-xs text-[var(--text-secondary)] font-[320]">
              Add an artist to the Discover feature banner.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void reorderFeaturedArtists(event)}
            >
              <SortableContext
                items={featuredArtists.map((item) => item.artist_id)}
                strategy={rectSortingStrategy}
              >
                <div className={PLAYLIST_MANAGER_GRID_CLASS}>
                  {featuredArtists.map((item) => (
                    <FeaturedArtistSortableCard
                      key={item.artist_id}
                      item={item}
                      onRemove={() => void removeFeaturedArtist(item)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </PlaylistManagerCollapsibleSection>

        <AdminDiscoverFeatureCardArtists />

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
                <div className="flex min-h-[120px] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-xs text-[var(--text-secondary)] font-[320]">
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

      {artistPickerOpen && (
        <AdminArtistShelfPickerModal
          isOpen
          existingIds={featuredArtists.map((item) => item.artist_id)}
          saving={savingFeatured}
          onClose={() => setArtistPickerOpen(false)}
          onAdd={addFeaturedArtists}
        />
      )}

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
