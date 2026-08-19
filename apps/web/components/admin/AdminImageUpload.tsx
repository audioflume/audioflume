"use client";

import { useEffect, useRef, useState } from "react";
import BackendArtworkUpload from "@/components/backend/BackendArtworkUpload";
import { BackendInput } from "@/components/backend/BackendControls";

type Props = {
  currentUrl: string;
  onUploaded: (url: string) => void;
  onDeleted?: () => void;
  target: "playlist" | "discover";
  slug: string;
  variant?: "card" | "hero" | "thumb";
  uploadFile?: (file: File) => Promise<string>;
  allowRemove?: boolean;
  showUrlInput?: boolean;
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
  uploadFile,
  allowRemove = true,
  showUrlInput = true,
}: Props) {
  const localPreviewRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl);

  useEffect(() => {
    setPreview(currentUrl);
    setSelectedFile(null);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  function clearLocalPreview() {
    if (!localPreviewRef.current) return;
    URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = null;
  }

  async function handleFile(file: File | null) {
    if (!file || uploading || deleting) return;

    setError("");
    setUploading(true);
    setSelectedFile(file);
    clearLocalPreview();

    const localUrl = URL.createObjectURL(file);
    localPreviewRef.current = localUrl;
    setPreview(localUrl);

    try {
      let imageUrl: string;

      if (uploadFile) {
        imageUrl = await uploadFile(file);
      } else {
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
        imageUrl = data.imageUrl;
      }

      clearLocalPreview();
      setSelectedFile(null);
      setPreview(imageUrl);
      onUploaded(imageUrl);
    } catch (uploadError) {
      clearLocalPreview();
      setSelectedFile(null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!preview || deleting || uploading) return;

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

      clearLocalPreview();
      setSelectedFile(null);
      setPreview("");
      onUploaded("");
      onDeleted?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <BackendArtworkUpload
        file={selectedFile}
        previewUrl={preview || null}
        onFileChange={(file) => void handleFile(file)}
        onRemove={allowRemove ? () => void handleDelete() : undefined}
        disabled={uploading || deleting}
        title="Cover image"
        dropTitle={uploading ? "Uploading…" : "Drop image here"}
        dropDescription="Click to upload a playlist cover."
        variant="compact"
        allowRemove={allowRemove}
        footer={
          error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null
        }
      />

      {showUrlInput ? (
        <label className="grid gap-1.5 text-xs font-medium text-[var(--text-muted)]">
          Or paste image URL
          <BackendInput
            type="url"
            value={preview}
            onChange={(event) => {
              clearLocalPreview();
              setSelectedFile(null);
              setPreview(event.target.value);
              onUploaded(event.target.value);
            }}
            placeholder="https://…"
          />
        </label>
      ) : null}
    </div>
  );
}
