"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import UploadIcon from "@/components/icons/UploadIcon";

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
  const userEditedRef = useRef(false);

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
      setPreview(currentUrl);
      userEditedRef.current = false;
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!preview || deleting) return;

    const confirmed = window.confirm(
      "Remove this image? It will be deleted from storage.",
    );

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

    if (uploading) return;

    const file = event.dataTransfer.files?.[0];

    if (file) handleFile(file);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Cover image
        </span>

        {preview && (
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {preview ? (
        <div className="group relative mt-1 h-[112px] w-[112px] overflow-visible">
          <button
            type="button"
            disabled={deleting || uploading}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="absolute right-1 top-1 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-[var(--media-overlay-control)] text-[13px] font-medium leading-none text-[var(--media-overlay-contrast)] transition hover:bg-[var(--media-overlay-control-hover)] disabled:cursor-default disabled:opacity-70"
            aria-label="Remove cover image"
          >
            ×
          </button>

          <div
            onClick={() => {
              if (!uploading) inputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative h-full w-full cursor-pointer overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-primary)] transition hover:border-[var(--text-secondary)]"
          >
            <Image
              src={preview}
              alt="Cover preview"
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />

            <div className="absolute inset-0 flex items-center justify-center bg-transparent p-2 opacity-0 transition group-hover:bg-[var(--media-overlay-preview)] group-hover:opacity-100">
              <span className="whitespace-nowrap rounded-md bg-[var(--media-overlay-label)] px-2.5 py-1.5 text-[10px] font-medium leading-none text-[var(--media-overlay-contrast)] shadow-[var(--shadow-ui)]">
                {uploading ? "Uploading…" : "Change image"}
              </span>
            </div>

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            if (!uploading) inputRef.current?.click();
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="mt-1 flex h-[112px] cursor-pointer items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--bg-primary)] px-3 transition hover:border-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            <UploadIcon />
          </div>

          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--text-primary)]">
              {uploading ? "Uploading…" : "Drop image here"}
            </div>

            <div className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
              Click to upload a playlist cover.
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

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
          placeholder="https://…"
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
        />
      </label>
    </div>
  );
}
