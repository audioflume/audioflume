"use client";

import { useEffect, useRef, useState } from "react";
import ModalShell from "@/components/ModalShell";
import {
  modalDeleteButtonClass,
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
} from "@/components/uiClasses";
import LoadingSpinner from "@/components/LoadingSpinner";
import UploadIcon from "@/components/icons/UploadIcon";

type Playlist = {
  id: number;
  name: string;
  cover_image_url: string | null;
};

type EditPlaylistModalProps = {
  isOpen: boolean;
  playlist: Playlist | null;
  name: string;
  coverPreview: string | null;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onCoverPreviewChange: (value: string | null) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function EditPlaylistModal({
  isOpen,
  playlist,
  name,
  coverPreview,
  isSaving,
  onNameChange,
  onCoverPreviewChange,
  onSave,
  onDelete,
  onClose,
}: EditPlaylistModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localCoverPreviewRef = useRef<string | null>(null);
  const [localCoverPreview, setLocalCoverPreview] = useState<string | null>(
    null,
  );
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const busy = isSaving || isUploadingCover;
  const visibleCoverPreview = localCoverPreview || coverPreview;

  useEffect(() => {
    return () => {
      if (localCoverPreviewRef.current) {
        URL.revokeObjectURL(localCoverPreviewRef.current);
      }
    };
  }, []);

  if (!isOpen || !playlist) return null;

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function releaseLocalCoverPreview() {
    if (localCoverPreviewRef.current) {
      URL.revokeObjectURL(localCoverPreviewRef.current);
      localCoverPreviewRef.current = null;
    }

    setLocalCoverPreview(null);
  }

  function removeCoverImage() {
    if (busy) return;

    releaseLocalCoverPreview();
    setCoverUploadError(null);
    onCoverPreviewChange(null);
    clearFileInput();
  }

  async function handleCoverChange(file: File) {
    if (busy) return;

    releaseLocalCoverPreview();
    setCoverUploadError(null);

    const objectUrl = URL.createObjectURL(file);
    localCoverPreviewRef.current = objectUrl;
    setLocalCoverPreview(objectUrl);
    setIsUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim() || playlist.name);

      const response = await fetch("/api/playlists/images/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || typeof data?.imageUrl !== "string") {
        throw new Error(data?.error || "Failed to upload playlist cover");
      }

      onCoverPreviewChange(data.imageUrl);
    } catch (error) {
      setCoverUploadError(
        error instanceof Error
          ? error.message
          : "Failed to upload playlist cover",
      );
    } finally {
      releaseLocalCoverPreview();
      setIsUploadingCover(false);
      clearFileInput();
    }
  }

  function handleSubmit() {
    if (!busy) onSave();
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title="Edit Playlist"
      onClose={busy ? () => {} : onClose}
      closeLabel="Close edit playlist modal"
      maxWidth="max-w-[430px]"
      maxHeight="460px"
      bodyClassName="px-5 py-5"
      footerClassName="justify-between"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className={modalDeleteButtonClass}
          >
            Delete
          </button>

          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={handleSubmit}
            className={modalPrimaryButtonClass}
          >
            {busy ? (
              <LoadingSpinner size={18} stroke={9} color="var(--bg-primary)" />
            ) : (
              "Save"
            )}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="playlist-name" className={modalFieldLabelClass}>
            Playlist Name
          </label>

          <input
            id="playlist-name"
            type="text"
            value={name}
            disabled={isSaving}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Example: Cinematic Favorites"
            className={modalInputClass}
          />
        </div>

        <div>
          <div className={modalFieldLabelClass}>Cover Image</div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void handleCoverChange(file);
            }}
          />

          {visibleCoverPreview ? (
            <div className="group relative mt-2 h-[112px] w-[112px] overflow-visible">
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  removeCoverImage();
                }}
                className="absolute right-1 top-1 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-none bg-[var(--media-overlay-control)] text-[13px] font-medium leading-none text-[var(--media-overlay-contrast)] transition hover:bg-[var(--media-overlay-control-hover)] disabled:cursor-default disabled:opacity-70"
                aria-label="Remove cover image"
              >
                ×
              </button>

              <div
                onClick={() => {
                  if (!busy) fileInputRef.current?.click();
                }}
                className="relative h-full w-full cursor-pointer overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg-primary)] transition hover:border-[var(--border-hover)]"
              >
                <img
                  src={visibleCoverPreview}
                  alt="Playlist cover preview"
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 flex items-center justify-center bg-transparent p-2 opacity-0 transition group-hover:bg-[var(--media-overlay-preview)] group-hover:opacity-100">
                  <span className="whitespace-nowrap rounded-none bg-[var(--media-overlay-label)] px-2.5 py-1.5 text-[10px] font-medium leading-none text-[var(--media-overlay-contrast)]">
                    Change image
                  </span>
                </div>

                {isUploadingCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-preview)]">
                    <LoadingSpinner size={20} stroke={8} color="white" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                if (!busy) fileInputRef.current?.click();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (busy) return;
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                void handleCoverChange(file);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="group mt-2 flex h-[112px] cursor-pointer items-center justify-center gap-3 rounded-none border border-dashed border-[var(--border)] bg-[var(--bg-tertiary)] px-3 transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary-hover)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[var(--bg-tertiary-hover)] text-[var(--text-muted)] transition group-hover:bg-[var(--icon-button-hover)] group-hover:text-[var(--text-secondary)]">
                {isUploadingCover ? (
                  <LoadingSpinner size={18} stroke={8} />
                ) : (
                  <UploadIcon />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  {isUploadingCover ? "Uploading…" : "Drop image here"}
                </div>

                <div className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                  Click to upload a playlist cover.
                </div>
              </div>
            </div>
          )}

          {coverUploadError && (
            <p className="mt-2 text-[11px] text-[var(--danger)]">
              {coverUploadError}
            </p>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
