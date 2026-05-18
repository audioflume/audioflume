"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  currentUrl: string;
  onUploaded: (url: string) => void;
  onDeleted?: () => void;
  target: "playlist" | "discover";
  slug: string;
  variant?: "card" | "hero" | "thumb";
};

function extractImageKey(url: string): string | null {
  try {
    const path = new URL(url).pathname.replace(/^\//, "");
    if (path.startsWith("images/")) return path;
    return null;
  } catch {
    return null;
  }
}

export default function AdminImageUpload({
  currentUrl,
  onUploaded,
  onDeleted,
  target,
  slug,
  variant = "card",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl);
  // Track whether the user has made a local change so we don't clobber it
  const userEditedRef = useRef(false);

  // Sync preview when parent loads data asynchronously (e.g. edit mode fetch)
  useEffect(() => {
    if (!userEditedRef.current) {
      setPreview(currentUrl);
    }
  }, [currentUrl]);

  async function handleFile(file: File) {
    userEditedRef.current = true;
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
      onUploaded(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      // Revert to the last known good URL
      setPreview(currentUrl);
      userEditedRef.current = false;
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!preview || deleting) return;
    const confirmed = window.confirm("Remove this image? It will be deleted from storage.");
    if (!confirmed) return;

    const imageKey = extractImageKey(preview);
    setDeleting(true);
    setError("");

    try {
      if (imageKey) {
        const res = await fetch("/api/admin/images/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageKey }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.error || "Delete failed");
        }
      }
      userEditedRef.current = true;
      setPreview("");
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

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Cover image</span>
        {preview && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-[11px] font-medium text-[var(--danger)] transition hover:opacity-70 disabled:opacity-40"
          >
            {deleting ? "Removing\u2026" : "Remove image"}
          </button>
        )}
      </div>

      {/* Square drop zone, max 280px */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative w-full max-w-[280px] cursor-pointer overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] transition hover:border-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
        style={{ aspectRatio: "1 / 1" }}
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Cover preview"
              fill
              sizes="280px"
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
                {uploading ? "Uploading\u2026" : "Click or drop to replace"}
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="text-xl text-[var(--text-muted)]">\u2191</div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              {uploading ? "Uploading\u2026" : "Click or drag an image"}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">JPG, PNG, WEBP</p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />

      <label className="grid gap-1.5 text-xs font-medium text-[var(--text-muted)]">
        Or paste image URL
        <input
          type="url"
          value={preview}
          onChange={(e) => {
            userEditedRef.current = true;
            setPreview(e.target.value);
            onUploaded(e.target.value);
          }}
          placeholder="https://\u2026"
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
        />
      </label>
    </div>
  );
}
