"use client";

import { useEffect, useRef, useState } from "react";

import UploadIcon from "@/components/icons/UploadIcon";

const MAX_VIDEO_SIZE_BYTES = 250 * 1024 * 1024;
const THUMBNAIL_MAX_WIDTH = 1600;
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const VIDEO_TYPE_BY_EXTENSION = new Map([
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
  ["mov", "video/quicktime"],
]);

type Props = {
  currentUrl: string;
  currentImageUrl?: string;
  onUploaded: (url: string) => void;
  onThumbnailUploaded?: (url: string) => void;
  onDeleted?: () => void;
  slug: string;
};

function extractVideoKey(url: string): string | null {
  try {
    const path = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
    return path.startsWith("playlist covers/") ? path : null;
  } catch {
    return null;
  }
}

function getVideoType(file: File) {
  if (ALLOWED_VIDEO_TYPES.has(file.type)) return file.type;

  const extension = file.name.toLowerCase().split(".").pop() || "";
  return VIDEO_TYPE_BY_EXTENSION.get(extension) || "";
}

async function createVideoThumbnail(file: File, slug: string) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");

  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      function cleanup() {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
      }

      function handleLoadedData() {
        cleanup();
        resolve();
      }

      function handleError() {
        cleanup();
        reject(new Error("The browser could not read a frame from this video"));
      }

      video.addEventListener("loadeddata", handleLoadedData, { once: true });
      video.addEventListener("error", handleError, { once: true });
      video.load();
    });

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("The video does not contain a readable frame");
    }

    const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("The browser could not create a video thumbnail");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("The browser could not encode the video thumbnail"));
          }
        },
        "image/jpeg",
        0.86,
      );
    });

    return new File([blob], `${slug || "playlist"}-video-cover.jpg`, {
      type: "image/jpeg",
    });
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadVideoThumbnail(file: File, slug: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", "playlist");
  formData.append("slug", slug || "untitled");
  formData.append("variant", "card");

  const res = await fetch("/api/admin/images/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Automatic cover image upload failed");
  }

  return String(data.imageUrl || "");
}

export default function AdminVideoUpload({
  currentUrl,
  currentImageUrl = "",
  onUploaded,
  onThumbnailUploaded,
  onDeleted,
  slug,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const userEditedRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl);

  useEffect(() => {
    if (!userEditedRef.current) {
      setPreview(currentUrl);
    }
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
    };
  }, []);

  function clearLocalPreview() {
    if (!localPreviewRef.current) return;

    URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = null;
  }

  async function handleFile(file: File) {
    userEditedRef.current = true;
    setError("");

    const contentType = getVideoType(file);

    if (!contentType) {
      userEditedRef.current = false;
      setError("Choose an MP4, WebM, or MOV video");
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      userEditedRef.current = false;
      setError("Video is too large (max 250 MB)");
      return;
    }

    setUploading(true);
    clearLocalPreview();

    const localUrl = URL.createObjectURL(file);
    localPreviewRef.current = localUrl;
    setPreview(localUrl);

    let thumbnailWarning = "";
    const shouldGenerateThumbnail =
      !currentImageUrl.trim() && Boolean(onThumbnailUploaded);
    const thumbnailFilePromise = shouldGenerateThumbnail
      ? createVideoThumbnail(file, slug).catch(() => {
          thumbnailWarning =
            "the browser could not generate an automatic cover image. Upload one manually.";
          return null;
        })
      : Promise.resolve<File | null>(null);

    try {
      const presignRes = await fetch("/api/admin/videos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: contentType,
          fileSize: file.size,
          slug: slug || "untitled",
        }),
      });

      const presignData = await presignRes.json();

      if (!presignRes.ok) {
        throw new Error(presignData?.error || "Failed to prepare upload");
      }

      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": presignData.contentType || contentType },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(
          uploadRes.status === 403
            ? "Cloudflare rejected the upload. Check the video bucket CORS settings."
            : "Video upload failed",
        );
      }

      const thumbnailFile = await thumbnailFilePromise;

      if (thumbnailFile && onThumbnailUploaded) {
        try {
          const thumbnailUrl = await uploadVideoThumbnail(thumbnailFile, slug);

          if (thumbnailUrl) onThumbnailUploaded(thumbnailUrl);
        } catch {
          thumbnailWarning =
            "the automatic cover image could not be uploaded. Upload one manually.";
        }
      }

      clearLocalPreview();
      setPreview(presignData.videoUrl);
      onUploaded(presignData.videoUrl);

      if (thumbnailWarning) {
        setError(`Video uploaded, but ${thumbnailWarning}`);
      }
    } catch (uploadError) {
      clearLocalPreview();
      setError(
        uploadError instanceof TypeError
          ? "Cloudflare could not be reached from the browser. Check the video bucket CORS policy."
          : uploadError instanceof Error
            ? uploadError.message
            : "Upload failed",
      );
      setPreview(currentUrl);
      userEditedRef.current = false;
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!preview || deleting || uploading) return;

    const confirmed = window.confirm(
      "Remove this video? It will be deleted from storage when possible.",
    );

    if (!confirmed) return;

    const videoKey = extractVideoKey(preview);
    setDeleting(true);
    setError("");

    try {
      if (videoKey) {
        const res = await fetch("/api/admin/videos/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoKey }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.error || "Delete failed");
        }
      }

      clearLocalPreview();
      userEditedRef.current = true;
      setPreview("");
      onUploaded("");
      onDeleted?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Delete failed",
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) void handleFile(file);

    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (uploading) return;

    const file = event.dataTransfer.files?.[0];

    if (file) void handleFile(file);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Cover video
        </span>

        {preview && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || uploading}
            className="text-[11px] font-medium text-[var(--danger)] transition hover:opacity-70 disabled:opacity-40"
          >
            {deleting ? "Removing…" : "Remove video"}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mov"
        className="hidden"
        onChange={handleInputChange}
      />

      {preview ? (
        <div className="group relative mt-1 h-[112px] w-[112px] overflow-visible">
          <button
            type="button"
            disabled={deleting || uploading}
            onClick={(event) => {
              event.stopPropagation();
              void handleDelete();
            }}
            className="absolute right-1 top-1 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-[var(--media-overlay-control)] text-[13px] font-medium leading-none text-[var(--media-overlay-contrast)] transition hover:bg-[var(--media-overlay-control-hover)] disabled:cursor-default disabled:opacity-70"
            aria-label="Remove cover video"
          >
            ×
          </button>

          <div
            onClick={() => {
              if (!uploading) inputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="relative h-full w-full cursor-pointer overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-primary)] transition hover:border-[var(--text-secondary)]"
          >
            <video
              src={preview}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Cover video preview"
            />

            <div className="absolute inset-0 flex items-center justify-center bg-transparent p-2 opacity-0 transition group-hover:bg-[var(--media-overlay-preview)] group-hover:opacity-100">
              <span className="whitespace-nowrap rounded-md bg-[var(--media-overlay-label)] px-2.5 py-1.5 text-[10px] font-medium leading-none text-[var(--media-overlay-contrast)] shadow-[var(--shadow-ui)]">
                {uploading ? "Uploading…" : "Change video"}
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
          onDragOver={(event) => event.preventDefault()}
          className="mt-1 flex min-h-[112px] cursor-pointer items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--bg-primary)] px-3 transition hover:border-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            <UploadIcon />
          </div>

          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--text-primary)]">
              {uploading ? "Uploading…" : "Drop video here"}
            </div>

            <div className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
              MP4, WebM, or MOV. Max 250 MB.
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <label className="grid gap-1.5 text-xs font-medium text-[var(--text-muted)]">
        Or paste video URL
        <input
          type="url"
          value={preview}
          onChange={(event) => {
            clearLocalPreview();
            userEditedRef.current = true;
            setPreview(event.target.value);
            onUploaded(event.target.value);
          }}
          placeholder="https://…"
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
        />
      </label>
    </div>
  );
}
