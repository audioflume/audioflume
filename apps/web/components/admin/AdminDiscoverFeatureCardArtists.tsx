"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
import {
  PLAYLIST_MANAGER_GRID_CLASS,
  PlaylistManagerCollapsibleSection,
} from "@/components/admin/AdminPlaylistManagerShared";
import { BackendButton } from "@/components/backend/BackendControls";
import BackendDragHandle from "@/components/backend/BackendDragHandle";
import PlusIcon from "@/components/icons/PlusIcon";

type FeatureCardArtist = {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
  hero_image_url: string | null;
  status: string;
};

type FeatureCardArtistItem = {
  artist_id: string;
  position: number;
  artist: FeatureCardArtist;
};

const FEATURE_CARD_LIMIT = 2;

async function fetchFeatureCardArtists() {
  const response = await fetch("/api/admin/discover-feature-card-artists");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Failed to load Featured Cards");
  }
  return (Array.isArray(data?.items) ? data.items : []) as FeatureCardArtistItem[];
}

function FeatureCardArtistSortableCard({
  item,
  onRemove,
}: {
  item: FeatureCardArtistItem;
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
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-[var(--text-muted)]">
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
          className="absolute right-2 top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[var(--bg-primary)] text-lg font-light leading-none text-[var(--text-secondary)] opacity-0 transition hover:bg-[color-mix(in_srgb,var(--bg-primary)_90%,var(--danger)_10%)] hover:text-[var(--danger)] group-hover:opacity-100"
          aria-label={`Remove ${artist.name} from Featured Cards`}
          title="Remove from Featured Cards"
        >
          ×
        </button>
      </div>

      <div className="mt-2.5 min-w-0">
        <h4 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {artist.name}
        </h4>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
          /artists/{artist.slug}
        </p>
      </div>
    </article>
  );
}

export default function AdminDiscoverFeatureCardArtists() {
  const [items, setItems] = useState<FeatureCardArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function refresh() {
    const next = await fetchFeatureCardArtists();
    setItems(next);
    return next;
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const next = await fetchFeatureCardArtists();
        if (!cancelled) setItems(next);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load Featured Cards",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  async function addArtists(artistIds: string[]) {
    if (saving || artistIds.length === 0) return;

    try {
      setSaving(true);
      const response = await fetch("/api/admin/discover-feature-card-artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_ids: artistIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to add Featured Card artists");
      }

      await refresh();
      setPickerOpen(false);
      setToastMessage(
        artistIds.length === 1
          ? "Added to Featured Cards"
          : `Added ${artistIds.length} artists to Featured Cards`,
      );
    } catch (addError) {
      setToastMessage(
        addError instanceof Error
          ? addError.message
          : "Failed to add Featured Card artists",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeArtist(item: FeatureCardArtistItem) {
    const confirmed = window.confirm(
      `Remove "${item.artist.name}" from Featured Cards?`,
    );
    if (!confirmed || saving) return;

    try {
      setSaving(true);
      const response = await fetch("/api/admin/discover-feature-card-artists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_id: item.artist_id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to remove Featured Card artist");
      }

      await refresh();
      setToastMessage("Removed from Featured Cards");
    } catch (removeError) {
      setToastMessage(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove Featured Card artist",
      );
    } finally {
      setSaving(false);
    }
  }

  async function reorderArtists(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || saving) return;

    const oldIndex = items.findIndex(
      (item) => item.artist_id === String(active.id),
    );
    const newIndex = items.findIndex(
      (item) => item.artist_id === String(over.id),
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = items;
    const reordered = arrayMove(items, oldIndex, newIndex).map(
      (item, position) => ({ ...item, position }),
    );
    setItems(reordered);

    try {
      setSaving(true);
      const response = await fetch("/api/admin/discover-feature-card-artists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_ids: reordered.map((item) => item.artist_id),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to reorder Featured Cards");
      }
    } catch (reorderError) {
      setItems(previous);
      setToastMessage(
        reorderError instanceof Error
          ? reorderError.message
          : "Failed to reorder Featured Cards",
      );
    } finally {
      setSaving(false);
    }
  }

  const full = items.length >= FEATURE_CARD_LIMIT;

  return (
    <>
      <PlaylistManagerCollapsibleSection
        title="Featured Cards"
        subtitle={`${items.length}/${FEATURE_CARD_LIMIT} artists`}
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
        wrapHeader
        wrapActions
        actions={
          <BackendButton
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={saving || full}
          >
            <PlusIcon size={12} />
            <span>Add</span>
          </BackendButton>
        }
      >
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[16/9] animate-pulse bg-[var(--bg-tertiary)]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex min-h-[120px] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-xs text-[var(--danger)]">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-xs text-[var(--text-secondary)]">
            Add up to two artists to the Discover feature cards.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => void reorderArtists(event)}
          >
            <SortableContext
              items={items.map((item) => item.artist_id)}
              strategy={rectSortingStrategy}
            >
              <div className={PLAYLIST_MANAGER_GRID_CLASS}>
                {items.map((item) => (
                  <FeatureCardArtistSortableCard
                    key={item.artist_id}
                    item={item}
                    onRemove={() => void removeArtist(item)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </PlaylistManagerCollapsibleSection>

      {pickerOpen && (
        <AdminArtistShelfPickerModal
          isOpen
          title="Featured Cards"
          existingIds={items.map((item) => item.artist_id)}
          saving={saving}
          maxSelections={Math.max(0, FEATURE_CARD_LIMIT - items.length)}
          onClose={() => setPickerOpen(false)}
          onAdd={addArtists}
        />
      )}

      <Toast message={toastMessage} bottomOffset="24px" />
    </>
  );
}
