"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AdminArtistShelfPickerModal from "@/components/admin/AdminArtistShelfPickerModal";
import { PLAYLIST_MANAGER_GRID_CLASS, PlaylistManagerCollapsibleSection } from "@/components/admin/AdminPlaylistManagerShared";
import { BackendButton } from "@/components/backend/BackendControls";
import BackendDragHandle from "@/components/backend/BackendDragHandle";
import PlusIcon from "@/components/icons/PlusIcon";
import Toast from "@/components/Toast";

type FeaturedArtist = {
  id: string; name: string; slug: string;
  profile_image_url: string | null; hero_image_url: string | null; status: string;
};
type FeaturedArtistItem = { artist_id: string; position: number; artist: FeaturedArtist };
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
          aria-label={`Remove ${artist.name} from Featured Artists`}
          title="Remove from Featured Artists"
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


const API = "/api/admin/home-featured-artists";
export default function AdminHomeFeaturedArtistsView() {
  const [items, setItems] = useState<FeaturedArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  async function refresh() {
    const response = await fetch(API, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to load featured artists");
    setItems(Array.isArray(result.items) ? result.items : []);
  }
  useEffect(() => {
    let active = true;
    fetch(API, { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load featured artists");
      if (active) setItems(Array.isArray(data.items) ? data.items : []);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function mutate(method: string, payload: object) {
    const response = await fetch(API, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save");
  }
  async function add(ids: string[]) {
    if (saving || !ids.length) return;
    setSaving(true);
    try {
      await mutate("POST", { artist_ids: ids });
      await refresh();
      setPickerOpen(false);
      setToast("Featured artists updated");
    } catch (e) { setToast(e instanceof Error ? e.message : "Unable to add artists"); }
    finally { setSaving(false); }
  }
  async function remove(item: FeaturedArtistItem, confirmRemoval = true) {
    if (saving || (confirmRemoval && !window.confirm(`Remove "${item.artist.name}" from Home Featured Artists?`))) return;
    setSaving(true);
    try {
      await mutate("DELETE", { artist_id: item.artist_id });
      await refresh();
      setToast("Artist removed");
    } catch (e) { setToast(e instanceof Error ? e.message : "Unable to remove artist"); }
    finally { setSaving(false); }
  }
  async function reorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || saving) return;
    const from = items.findIndex(item => item.artist_id === String(active.id));
    const to = items.findIndex(item => item.artist_id === String(over.id));
    if (from < 0 || to < 0) return;
    const before = items;
    const next = arrayMove(items, from, to);
    setItems(next);
    setSaving(true);
    try { await mutate("PATCH", { artist_ids: next.map(item => item.artist_id) }); }
    catch (e) { setItems(before); setToast(e instanceof Error ? e.message : "Unable to reorder artists"); }
    finally { setSaving(false); }
  }
  if (loading) return <div className="h-48 animate-pulse bg-[var(--bg-tertiary)]" />;
  if (error) return <div className="py-10 text-sm text-[var(--danger)]">{error}</div>;
  return <>
    <PlaylistManagerCollapsibleSection title="Featured Artists" subtitle={`${items.length} artists`}
      collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} wrapHeader wrapActions
      actions={<BackendButton type="button" onClick={() => setPickerOpen(true)} disabled={saving}><PlusIcon size={12} /><span>Add</span></BackendButton>}>
      {items.length === 0
        ? <div className="flex min-h-[120px] items-center justify-center border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)]">Add artists to the homepage sliding carousel.</div>
        : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => void reorder(event)}>
            <SortableContext items={items.map(item => item.artist_id)} strategy={rectSortingStrategy}>
              <div className={PLAYLIST_MANAGER_GRID_CLASS}>
                {items.map(item => <FeaturedArtistSortableCard key={item.artist_id} item={item} onRemove={() => void remove(item, false)} />)}
              </div>
            </SortableContext>
          </DndContext>}
    </PlaylistManagerCollapsibleSection>
    {pickerOpen && <AdminArtistShelfPickerModal isOpen existingIds={items.map(item => item.artist_id)} saving={saving}
      onClose={() => setPickerOpen(false)} onAdd={add}
      onRemove={(artistId) => { const item = items.find(entry => entry.artist_id === artistId); if (item) return remove(item, false); }}
      title="Home Featured Artists" />}
    <Toast message={toast} bottomOffset="24px" />
  </>;
}
