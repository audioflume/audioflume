"use client";

import { useEffect, useState } from "react";
import AdminImageUpload from "@/components/admin/AdminImageUpload";
import { PlaylistManagerCollapsibleSection } from "@/components/admin/AdminPlaylistManagerShared";
import Toast from "@/components/Toast";

type Images = { hero: string; lowerBanner: string };

export default function AdminHomeImagesView() {
  const [images, setImages] = useState<Images | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/home-images", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load homepage images");
        setImages(body as Images);
      })
      .catch((error) => setToast(error instanceof Error ? error.message : "Unable to load images"));
  }, []);

  async function save(key: keyof Images, url: string) {
    if (!images || saving) return;
    const next = { ...images, [key]: url };
    setSaving(true);
    try {
      const response = await fetch("/api/home-images", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save image");
      setImages(result);
      setToast("Homepage image updated");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to save image");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PlaylistManagerCollapsibleSection
        title="Homepage Images"
        subtitle="Top hero and lower photographic banner"
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        wrapHeader
      >
        {images ? (
          <div className="flex flex-wrap items-start gap-8">
            <div className="w-[180px] shrink-0">
              <AdminImageUpload
                currentUrl={images.hero}
                onUploaded={(url) => void save("hero", url)}
                target="home"
                slug="top-hero-banner"
                variant="hero"
                allowRemove={false}
                showUrlInput={false}
                title="Hero Banner"
                titleBelowPreview
                dropDescription="The full-width image behind the main homepage headline."
              />
            </div>
            <div className="w-[180px] shrink-0">
              <AdminImageUpload
                currentUrl={images.lowerBanner}
                onUploaded={(url) => void save("lowerBanner", url)}
                target="home"
                slug="lower-photographic-banner"
                variant="hero"
                allowRemove={false}
                showUrlInput={false}
                title="Lower Banner"
                titleBelowPreview
                dropDescription="The image behind ‘Human Made Music. Story Driven Sound.’"
              />
            </div>
          </div>
        ) : <div className="h-28 animate-pulse bg-[var(--bg-tertiary)]" />}
        {saving && <p className="mt-3 text-xs text-[var(--text-muted)]">Saving image…</p>}
      </PlaylistManagerCollapsibleSection>
      <Toast message={toast} bottomOffset="24px" />
    </>
  );
}
