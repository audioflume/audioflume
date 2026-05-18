"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  currentUrl: string;
  onUploaded: (url: string) => void;
  onDeleted?: () => void;
  imageKey?: string;
  target: "playlist" | "discover";
  slug: string;
  variant?: "card" | "hero" | "thumb";
};

export default function AdminImageUpload({
  currentUrl,
  onUploaded,
  onDeleted,
  imageKey,
  target,
  slug,
  variant = "card",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl);
  const [currentKey, setCurrentKey] = useState(imageKey ?? "");

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", target);
      formData.append("slug", slug || "untitled");
      formData.append("variant", variant);

      const res = await fetch("/api/admin/images/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      setPreview(data.imageUrl);
      setCurrentKey(data.imageKey ?? "");
      onUploaded(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Remove this image? This will delete it from storage.")) return;
    setDeleting(true);
    setError("");
    try {
      if (currentKey) {
        const res = await fetch("/api/admin/images/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageKey: currentKey }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Delete failed");
      }
      setPreview("");
      setCurrentKey("");
      onUploaded("");
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Cover image</span>
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-[11px] font-medium text-[var(--danger)] transition hover:opacity-70 disabled:opacity-40"
          >
            {deleting ? "Removing…" : "Remove image"}
          </button>
        )}
      </div>

      {/* Drop zone — fixed max-width to match the sidebar card preview */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative min-h-[200px] w-full max-w-[360px] cursor-pointer overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] transition hover:border-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Cover preview"
              fill
              sizes="360px"
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
                {uploading ? "Uploading…" : "Click or drop to replace"}
              </span>
            </div>
          </>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="text-2xl text-[var(--text-muted)]">↑</div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {uploading ? "Uploading…" : "Click or drag an image"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              JPG, PNG, WEBP — auto-converted to .webp
            </p>
          </div>
        )}

        {(uploading || deleting) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      <label className="grid gap-1.5 text-xs font-medium text-[var(--text-muted)]">
        Or paste image URL directly
        <input
          type="url"
          value={preview}
          onChange={(e) => {
            setPreview(e.target.value);
            onUploaded(e.target.value);
          }}
          placeholder="https://..."
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
        />
      </label>
    </div>
  );
}
