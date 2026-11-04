"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import AdminArtistShelfPickerModal from "@/components/admin/AdminArtistShelfPickerModal";
import { PlaylistManagerCollapsibleSection } from "@/components/admin/AdminPlaylistManagerShared";
import { BackendButton } from "@/components/backend/BackendControls";
import Toast from "@/components/Toast";

type Artist = {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
  hero_image_url: string | null;
};

const API = "/api/admin/artist-directory-feature";

export default function AdminArtistDirectoryFeatureView() {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState("");

  async function refresh() {
    const response = await fetch(API, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load featured artist");
    setArtist(data.artist ?? null);
  }

  useEffect(() => {
    let active = true;
    fetch(API, { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load featured artist");
        if (active) setArtist(data.artist ?? null);
      })
      .catch(error => { if (active) setToast(error instanceof Error ? error.message : "Unable to load featured artist"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(artistId: string | null) {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_id: artistId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save featured artist");
      await refresh();
      setPickerOpen(false);
      setToast(artistId ? "Featured artist updated" : "Featured artist removed");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to save featured artist");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PlaylistManagerCollapsibleSection
        title="Featured Artist"
        subtitle="Choose one artist for the directory's featured block."
        collapsed={collapsed}
        onToggle={() => setCollapsed(value => !value)}
        wrapHeader
        wrapActions
        actions={<BackendButton type="button" disabled={saving || loading} onClick={() => setPickerOpen(true)}>{artist ? "Change Artist" : "Add Artist"}</BackendButton>}
      >
        {loading ? (
          <div className="h-32 animate-pulse bg-[var(--bg-tertiary)]" />
        ) : artist ? (
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-32 shrink-0 overflow-hidden bg-[var(--bg-tertiary)]">
              {(artist.hero_image_url || artist.profile_image_url) && (
                <Image src={(artist.hero_image_url || artist.profile_image_url)!} alt="" fill sizes="128px" unoptimized className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{artist.name}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">/artists/{artist.slug}</p>
            </div>
            <BackendButton type="button" disabled={saving} onClick={() => void save(null)}>Remove</BackendButton>
          </div>
        ) : (
          <p className="py-5 text-xs text-[var(--text-secondary)]">No artist selected. Choose one to feature on the Artists page.</p>
        )}
      </PlaylistManagerCollapsibleSection>
      {pickerOpen && (
        <AdminArtistShelfPickerModal
          isOpen
          existingIds={[]}
          maxSelections={1}
          saving={saving}
          title="Artist Directory Feature"
          onClose={() => setPickerOpen(false)}
          onAdd={ids => void save(ids[0])}
        />
      )}
      <Toast message={toast} bottomOffset="24px" />
    </>
  );
}
