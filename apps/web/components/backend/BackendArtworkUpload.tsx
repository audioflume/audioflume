"use client";

import { useEffect, useRef, type DragEvent, type ReactNode } from "react";
import {
  MediaImageChangeOverlay,
  MediaImageRemoveButton,
} from "@/components/MediaImageOverlayControls";
import UploadIcon from "@/components/icons/UploadIcon";

type BackendArtworkUploadProps = {
  file?: File | null;
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
  required?: boolean;
  title?: string;
  dropTitle?: string;
  dropDescription?: string;
  help?: string;
  footer?: ReactNode;
  variant?: "song" | "compact";
  compactSize?: number;
  compactChooseButton?: boolean;
  allowRemove?: boolean;
};

export default function BackendArtworkUpload({
  file = null,
  previewUrl,
  onFileChange,
  onRemove,
  disabled = false,
  required = false,
  title = "Cover image",
  dropTitle = "Drop image here",
  dropDescription = "Click to upload a song cover.",
  help = "Click the preview or choose a new image to replace it.",
  footer,
  variant = "song",
  compactSize = 112,
  compactChooseButton = false,
  allowRemove = true,
}: BackendArtworkUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = "";
  }, [file]);

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (disabled) return;
    const nextFile = Array.from(event.dataTransfer.files).find((item) =>
      item.type.startsWith("image/"),
    );
    if (nextFile) onFileChange(nextFile);
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      disabled={disabled}
      className="hidden"
      onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
    />
  );

  if (variant === "compact") {
    if (compactChooseButton) {
      return (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {title}
            </span>
            {required ? (
              <span className="text-[11px] text-[var(--text-muted)]">Required</span>
            ) : null}
          </div>

          {input}

          <div
            className="relative mt-1 overflow-hidden rounded-[7px] bg-[var(--bg-tertiary)]"
            style={{ width: compactSize, height: compactSize }}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`${title} preview`}
                className="h-full w-full object-cover"
              />
            ) : null}

            {allowRemove && onRemove && previewUrl ? (
              <MediaImageRemoveButton
                disabled={disabled}
                onClick={onRemove}
                ariaLabel={`Remove ${title.toLowerCase()}`}
              />
            ) : null}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mt-1 h-9 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[11px] font-normal text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ width: compactSize }}
          >
            Choose image
          </button>

          {footer}
        </div>
      );
    }

    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {title}
          </span>
          {required ? (
            <span className="text-[11px] text-[var(--text-muted)]">Required</span>
          ) : null}
        </div>

        {input}

        {previewUrl ? (
          <div
            className="group relative mt-1 overflow-visible"
            style={{ width: compactSize, height: compactSize }}
          >
            {allowRemove && onRemove ? (
              <MediaImageRemoveButton
                disabled={disabled}
                onClick={onRemove}
                ariaLabel={`Remove ${title.toLowerCase()}`}
              />
            ) : null}

            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              className="relative h-full w-full cursor-pointer overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-primary)] transition hover:border-[var(--border-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <img
                src={previewUrl}
                alt={`${title} preview`}
                className="h-full w-full object-cover"
              />
              <MediaImageChangeOverlay />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="group mt-1 flex cursor-pointer items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--bg-primary)] px-3 transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ minHeight: compactSize }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition group-hover:bg-[var(--bg-primary)]">
              <UploadIcon />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-xs font-medium text-[var(--text-primary)]">
                {dropTitle}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-[var(--text-secondary)]">
                {dropDescription}
              </span>
            </span>
          </button>
        )}

        {footer}
      </div>
    );
  }

  return (
    <section className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-base font-medium leading-6 tracking-[-0.03em] text-[var(--text-primary)]">
          {title}
        </h2>
        {required ? (
          <span className="text-[11px] text-[var(--text-muted)]">Required</span>
        ) : null}
      </div>

      {input}

      {previewUrl ? (
        <div className="flex items-start gap-[18px] max-[720px]:flex-col">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="group relative h-[180px] w-[180px] shrink-0 cursor-pointer overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Change ${title.toLowerCase()}`}
          >
            <img
              src={previewUrl}
              alt={`${title} preview`}
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-preview)] text-[10px] font-medium text-[var(--media-overlay-contrast)] opacity-0 transition group-hover:opacity-100">
              Change image
            </span>
          </button>

          <div className="flex min-h-[180px] min-w-0 flex-1 flex-col justify-between gap-5 py-1 max-[720px]:min-h-0 max-[720px]:w-full">
            <div>
              <div className="truncate text-xs font-medium text-[var(--text-primary)]">
                {file?.name || `Current ${title.toLowerCase()}`}
              </div>
              <div className="mt-[5px] text-[11px] leading-4 text-[var(--text-secondary)]">
                {help}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="h-9 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 text-[11px] font-normal text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                Change image
              </button>
              {allowRemove && onRemove ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onRemove}
                  className="h-9 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 text-[11px] font-normal text-[var(--text-secondary)] transition hover:bg-[var(--danger-hover)] hover:text-[var(--danger)] disabled:opacity-50"
                >
                  Remove image
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          className="group flex min-h-[180px] w-full cursor-pointer items-center justify-center gap-4 rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] p-5 text-left transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition group-hover:bg-[var(--bg-primary)]">
            <UploadIcon size={18} />
          </span>
          <span>
            <span className="block text-xs font-medium text-[var(--text-primary)]">
              {dropTitle}
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-[var(--text-secondary)]">
              {dropDescription}
            </span>
          </span>
        </button>
      )}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
