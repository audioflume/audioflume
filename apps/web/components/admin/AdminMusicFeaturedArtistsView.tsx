"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import AdminArtistShelfPickerModal from "@/components/admin/AdminArtistShelfPickerModal";
import { PlaylistManagerCollapsibleSection } from "@/components/admin/AdminPlaylistManagerShared";
import { BackendButton } from "@/components/backend/BackendControls";
import PlusIcon from "@/components/icons/PlusIcon";
import Toast from "@/components/Toast";
import styles from "./AdminMusicFeaturedArtistsView.module.css";

type FeaturedItem = {
  artist_id: string;
  position: number;
  focal_x: number;
  focal_y: number;
  overlay_opacity: number;
  artist: {
    id: string;
    name: string;
    slug: string;
    designation: string | null;
    hero_image_url: string | null;
  };
};
const API = "/api/admin/music-featured-artists";

export default function AdminMusicFeaturedArtistsView() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { x: number; y: number }>>({});
  const [overlayDrafts, setOverlayDrafts] = useState<Record<string, number>>({});
  const [cropEditingId, setCropEditingId] = useState<string | null>(null);
  const [cropDragging, setCropDragging] = useState(false);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPosition: { x: number; y: number };
  } | null>(null);

  async function refresh() {
    const response = await fetch(API, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load Music featured artists");
    const next = Array.isArray(data.items) ? data.items as FeaturedItem[] : [];
    setItems(next);
    setDrafts(Object.fromEntries(next.map(item => [item.artist_id, { x: Number(item.focal_x), y: Number(item.focal_y) }])));
    setOverlayDrafts(Object.fromEntries(next.map(item => [item.artist_id, Number(item.overlay_opacity)])));
  }

  useEffect(() => {
    let active = true;
    fetch(API, { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load Music featured artists");
        if (!active) return;
        const next = Array.isArray(data.items) ? data.items as FeaturedItem[] : [];
        setItems(next);
        setDrafts(Object.fromEntries(next.map(item => [item.artist_id, { x: Number(item.focal_x), y: Number(item.focal_y) }])));
        setOverlayDrafts(Object.fromEntries(next.map(item => [item.artist_id, Number(item.overlay_opacity)])));
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Unable to load artists"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function mutate(method: "POST" | "PATCH" | "DELETE", body: object) {
    const response = await fetch(API, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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
      setToast("Music featured artists updated");
    } catch (err) { setToast(err instanceof Error ? err.message : "Unable to add artist"); }
    finally { setSaving(false); }
  }

  async function remove(item: FeaturedItem) {
    if (saving || !window.confirm(`Remove "${item.artist.name}" from Music featured artists?`)) return;
    setSaving(true);
    try {
      await mutate("DELETE", { artist_id: item.artist_id });
      await refresh();
      setToast("Artist removed");
    } catch (err) { setToast(err instanceof Error ? err.message : "Unable to remove artist"); }
    finally { setSaving(false); }
  }

  async function move(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (saving || newIndex < 0 || newIndex >= items.length) return;
    const next = [...items];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setSaving(true);
    try {
      await mutate("PATCH", { artist_ids: next.map(item => item.artist_id) });
      setItems(next);
      setToast("Artist order updated");
    } catch (err) { setToast(err instanceof Error ? err.message : "Unable to reorder"); }
    finally { setSaving(false); }
  }

  function setDraft(id: string, x: number, y: number) {
    setDrafts(current => ({ ...current, [id]: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } }));
  }

  function handleCropPointerDown(event: ReactPointerEvent<HTMLDivElement>, point: { x: number; y: number }) {
    if (saving || !cropEditingId) return;
    cropDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: point,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setCropDragging(true);
    event.preventDefault();
  }

  function handleCropPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    const image = cropImageRef.current;
    if (!cropEditingId || !drag || drag.pointerId !== event.pointerId || !image) return;
    const width = event.currentTarget.clientWidth;
    const height = event.currentTarget.clientHeight;
    if (width <= 0 || height <= 0 || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const overflowX = Math.max(0, image.naturalWidth * scale - width);
    const overflowY = Math.max(0, image.naturalHeight * scale - height);
    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    setDraft(cropEditingId,
      overflowX > 0.5 ? drag.startPosition.x - (deltaX / overflowX) * 100 : drag.startPosition.x,
      overflowY > 0.5 ? drag.startPosition.y - (deltaY / overflowY) * 100 : drag.startPosition.y);
  }

  function finishCropDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropDragRef.current = null;
    setCropDragging(false);
  }

  function toggleCrop(item: FeaturedItem) {
    if (saving) return;
    if (cropEditingId === item.artist_id) {
      void saveFocal(item);
      return;
    }
    cropDragRef.current = null;
    setCropDragging(false);
    setDraft(item.artist_id, Number(item.focal_x), Number(item.focal_y));
    setOverlayDrafts(current => ({ ...current, [item.artist_id]: Number(item.overlay_opacity) }));
    setCropEditingId(item.artist_id);
  }

  async function saveFocal(item: FeaturedItem) {
    const point = drafts[item.artist_id];
    if (!point || saving) return;
    setSaving(true);
    try {
      await mutate("PATCH", { artist_id: item.artist_id, focal_x: point.x, focal_y: point.y, overlay_opacity: overlayDrafts[item.artist_id] ?? Number(item.overlay_opacity) });
      await refresh();
      setCropEditingId(null);
      setToast(`Banner focal point saved for ${item.artist.name}`);
    } catch (err) { setToast(err instanceof Error ? err.message : "Unable to save focal point"); }
    finally { setSaving(false); }
  }

  if (loading) return <section className="h-48 animate-pulse bg-[var(--bg-tertiary)]" />;
  if (error) return <section className="p-5 text-sm text-[var(--danger)]">{error}</section>;

  return <>
    <PlaylistManagerCollapsibleSection
      title="Featured Artists"
      subtitle={`${items.length} of 4 artists · Music banner`}
      collapsed={collapsed}
      onToggle={() => setCollapsed(value => !value)}
      wrapHeader
      wrapActions
      actions={<BackendButton type="button" onClick={() => setPickerOpen(true)} disabled={saving || items.length >= 4}><PlusIcon size={12} /><span>Add</span></BackendButton>}
    >
      <div className="grid gap-4">
        {items.map((item, index) => {
          const point = drafts[item.artist_id] ?? { x: Number(item.focal_x), y: Number(item.focal_y) };
          const overlay = overlayDrafts[item.artist_id] ?? Number(item.overlay_opacity);
          return <article key={item.artist_id} className="min-w-0 border border-[var(--border)] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <strong className="block text-sm font-medium">{item.artist.name}</strong>
                <span className="text-[11px] text-[var(--text-muted)]">{item.artist.designation ?? "No designation"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={saving || index === 0} onClick={() => void move(index, -1)} aria-label={`Move ${item.artist.name} up`} className="border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-30">↑</button>
                <button type="button" disabled={saving || index === items.length - 1} onClick={() => void move(index, 1)} aria-label={`Move ${item.artist.name} down`} className="border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-30">↓</button>
                <button type="button" disabled={saving} onClick={() => void remove(item)} className="border border-[var(--border)] px-3 py-1 text-xs disabled:opacity-40">Remove</button>
              </div>
            </div>
            {item.artist.hero_image_url ? (
              <div className="relative aspect-[4.5/1] min-h-[130px] select-none overflow-hidden bg-[var(--bg-tertiary)]">
                <img
                  ref={cropEditingId === item.artist_id ? cropImageRef : null}
                  src={item.artist.hero_image_url}
                  alt={`${item.artist.name} hero`}
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: `${point.x}% ${point.y}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: `rgba(0, 0, 0, ${overlay / 100})` }}
                />
                {cropEditingId === item.artist_id ? (
                  <div
                    className={`absolute inset-0 z-[1] ${cropDragging ? "cursor-grabbing" : "cursor-grab"}`}
                    style={{ touchAction: "none" }}
                    onPointerDown={event => handleCropPointerDown(event, point)}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={finishCropDrag}
                    onPointerCancel={finishCropDrag}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleCrop(item)}
                  disabled={saving}
                  aria-label={cropEditingId === item.artist_id ? "Save crop" : "Adjust crop"}
                  title={cropEditingId === item.artist_id ? "Save crop" : "Adjust crop"}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[var(--filmwave-backend-control-radius)] border-[1.25px] border-white/25 bg-black/55 text-white transition-colors hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cropEditingId === item.artist_id ? (
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
                      <path d="M3.25 8.2 6.45 11.25 12.75 4.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
                      <path d="M5 2H2v3M11 2h3v3M14 11v3h-3M5 14H2v-3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                {cropEditingId === item.artist_id ? (
                  <label className={`absolute bottom-3 left-3 z-[3] flex items-center gap-3 rounded-[5px] bg-black/55 px-3 py-2 text-[11px] ${styles.overlayControl}`}>
                    <div className={styles.overlayText}>Dark overlay</div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={overlay}
                      disabled={saving}
                      aria-label={`Dark overlay strength for ${item.artist.name}`}
                      className={styles.overlaySlider}
                      style={{ "--overlay-progress": `${overlay}%` } as CSSProperties}
                      onChange={event => setOverlayDrafts(current => ({ ...current, [item.artist_id]: Number(event.target.value) }))}
                    />
                    <span className={`w-8 text-right tabular-nums ${styles.overlayText}`}>{overlay}%</span>
                  </label>
                ) : null}
                {cropEditingId === item.artist_id ? (
                  <div className="pointer-events-none absolute bottom-3 left-1/2 z-[2] -translate-x-1/2 rounded-[5px] bg-black/55 px-3 py-2 text-[10px] text-white">
                    {saving ? "Saving..." : cropDragging ? "Repositioning..." : "Drag to reposition"}
                  </div>
                ) : null}
              </div>
            ) : <p className="p-6 text-xs text-[var(--text-muted)]">This artist has no banner image.</p>}
          </article>;
        })}
        {!items.length && <p className="py-8 text-center text-xs text-[var(--text-muted)]">No Music featured artists. Add an approved artist with a banner image.</p>}
      </div>
    </PlaylistManagerCollapsibleSection>
    {pickerOpen && <AdminArtistShelfPickerModal
      isOpen
      existingIds={items.map(item => item.artist_id)}
      maxSelections={4 - items.length}
      saving={saving}
      onClose={() => setPickerOpen(false)}
      onAdd={add}
      title="Music Featured Artists"
    />}
    <Toast message={toast} bottomOffset="24px" />
  </>;
}
