"use client";

import { useRef } from "react";
import ModalShell from "@/components/ModalShell";
import {
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
} from "@/components/uiClasses";
import LoadingSpinner from "@/components/LoadingSpinner";

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

function UploadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 16V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7.5 8.5L12 4L16.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

  if (!isOpen || !playlist) return null;

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeCoverImage() {
    if (isSaving) return;

    onCoverPreviewChange(null);
    clearFileInput();
  }

  function handleCoverChange(file: File) {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        onCoverPreviewChange(reader.result);
      }
    };

    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!isSaving) onSave();
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title="Edit Playlist"
      onClose={isSaving ? () => {} : onClose}
      closeLabel="Close edit playlist modal"
      maxWidth="max-w-[430px]"
      maxHeight="460px"
      bodyClassName="px-5 py-5"
      footerClassName="justify-between"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={onDelete}
            className="flex h-9 cursor-pointer items-center justify-center rounded-none px-3 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger-hover)] hover:text-[var(--danger)] disabled:cursor-default disabled:opacity-70"
          >
            Delete
          </button>

          <button
            type="button"
            disabled={isSaving || !name.trim()}
            onClick={handleSubmit}
            className={modalPrimaryButtonClass}
          >
            {isSaving ? (
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
            disabled={isSaving}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              handleCoverChange(file);
            }}
          />

          {coverPreview ? (
            <div className="group relative mt-2 h-[112px] w-[112px] overflow-visible">
              <button
                type="button"
                disabled={isSaving}
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
                  if (!isSaving) fileInputRef.current?.click();
                }}
                className="relative h-full w-full cursor-pointer overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg-primary)] transition hover:border-[var(--border-hover)]"
              >
                <img
                  src={coverPreview}
                  alt="Playlist cover preview"
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 flex items-center justify-center bg-transparent p-2 opacity-0 transition group-hover:bg-[var(--media-overlay-preview)] group-hover:opacity-100">
                  <span className="whitespace-nowrap rounded-none bg-[var(--media-overlay-label)] px-2.5 py-1.5 text-[10px] font-medium leading-none text-[var(--media-overlay-contrast)]">
                    Change image
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                if (!isSaving) fileInputRef.current?.click();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (isSaving) return;
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                handleCoverChange(file);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="group mt-2 flex h-[112px] cursor-pointer items-center justify-center gap-3 rounded-none border border-dashed border-[var(--border)] bg-[var(--bg-tertiary)] px-3 transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary-hover)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[var(--bg-tertiary-hover)] text-[var(--text-muted)] transition group-hover:bg-[var(--bg-primary)] group-hover:text-[var(--text-secondary)]">
                <UploadIcon />
              </div>

              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  Drop image here
                </div>

                <div className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                  Click to upload a playlist cover.
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
