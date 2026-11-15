"use client";

import { useEffect, useState, type MouseEvent } from "react";
import AdminArtistShelfPickerModal from "@/components/admin/AdminArtistShelfPickerModal";
import { PlaylistManagerCollapsibleSection } from "@/components/admin/AdminPlaylistManagerShared";
import { BackendButton } from "@/components/backend/BackendControls";
import PlusIcon from "@/components/icons/PlusIcon";
import Toast from "@/components/Toast";

type FeaturedItem = {
  artist_id: string;
  position: number;
  focal_x: number;
  focal_y: number;
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

  async function refresh() {
    const response = await fetch(API, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load Music featured artists");
    const next = Array.isArray(data.items) ? data.items as FeaturedItem[] : [];
    setItems(next);
    setDrafts(Object.fromEntries(next.map(item => [item.artist_id, { x: Number(item.focal_x), y: Number(item.focal_y) }])));
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

  function pickPoint(event: MouseEvent<HTMLButtonElement>, id: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    setDraft(id, Math.round(((event.clientX - rect.left) / rect.width) * 100), Math.round(((event.clientY - rect.top) / rect.height) * 100));
  }

  async function saveFocal(item: FeaturedItem) {
    const point = drafts[item.artist_id];
    if (!point || saving) return;
    setSaving(true);
    try {
      await mutate("PATCH", { artist_id: item.artist_id, focal_x: point.x, focal_y: point.y });
      await refresh();
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
      <p className="mb-4 text-xs text-[var(--text-secondary)]">Choose up to four artists for the Music page banner. Click an image to select its focal point, then save. The preview uses a wide banner crop.</p>
      <div className="grid gap-4">
        {items.map((item, index) => {
          const point = drafts[item.artist_id] ?? { x: Number(item.focal_x), y: Number(item.focal_y) };
          const changed = point.x !== Number(item.focal_x) || point.y !== Number(item.focal_y);
          return <article key={item.artist_id} className="min-w-0 border border-[var(--border)] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <strong className="block text-sm font-medium">{index + 1}. {item.artist.name}</strong>
                <span className="text-[11px] text-[var(--text-muted)]">{item.artist.designation ?? "No designation"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={saving || index === 0} onClick={() => void move(index, -1)} aria-label={`Move ${item.artist.name} up`} className="border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-30">↑</button>
                <button type="button" disabled={saving || index === items.length - 1} onClick={() => void move(index, 1)} aria-label={`Move ${item.artist.name} down`} className="border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-30">↓</button>
                <button type="button" disabled={saving} onClick={() => void remove(item)} className="border border-[var(--border)] px-3 py-1 text-xs disabled:opacity-40">Remove</button>
              </div>
            </div>
            {item.artist.hero_image_url ? (
              <button
                type="button"
                aria-label={`Choose focal point for ${item.artist.name}`}
                onClick={event => pickPoint(event, item.artist_id)}
                disabled={saving}
                className="relative block aspect-[4.5/1] min-h-[130px] w-full cursor-crosshair overflow-hidden bg-[var(--bg-tertiary)]"
                style={{
                  backgroundImage: `url("${item.artist.hero_image_url.replaceAll('"', '\\"')}")`,
                  backgroundSize: "cover",
                  backgroundPosition: `${point.x}% ${point.y}%`,
                }}
              >
                <span className="absolute inset-0 border border-white/20" aria-hidden="true" />
                <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-black/40" aria-hidden="true" />
              </button>
            ) : <p className="p-6 text-xs text-[var(--text-muted)]">This artist has no banner image.</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs">Horizontal
                <input type="range" min={0} max={100} value={point.x} disabled={saving} onChange={event => setDraft(item.artist_id, Number(event.target.value), point.y)} />
                <span className="w-8 tabular-nums">{Math.round(point.x)}%</span>
              </label>
              <label className="flex items-center gap-2 text-xs">Vertical
                <input type="range" min={0} max={100} value={point.y} disabled={saving} onChange={event => setDraft(item.artist_id, point.x, Number(event.target.value))} />
                <span className="w-8 tabular-nums">{Math.round(point.y)}%</span>
              </label>
              <button type="button" onClick={() => void saveFocal(item)} disabled={saving || !changed} className="ml-auto border border-[var(--text-primary)] bg-[var(--text-primary)] px-4 py-2 text-xs text-[var(--bg-primary)] disabled:opacity-40">Save focal point</button>
            </div>
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
