"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from "react";
import BackendArtworkUpload from "@/components/backend/BackendArtworkUpload";

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function AudioActionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18.5C9 19.8807 7.65685 21 6 21C4.34315 21 3 19.8807 3 18.5C3 17.1193 4.34315 16 6 16C7.65685 16 9 17.1193 9 18.5Z" stroke="currentColor" strokeWidth="1.9" />
      <path d="M21 16.5C21 17.8807 19.6569 19 18 19C16.3431 19 15 17.8807 15 16.5C15 15.1193 16.3431 14 18 14C19.6569 14 21 15.1193 21 16.5Z" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9 18.5V5.5L21 3.5V16.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9L21 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ArtworkActionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M5.5 17L10 12.5L13 15.5L15 13.5L18.5 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StemsActionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="6" r="1.25" fill="currentColor" />
      <circle cx="5" cy="12" r="1.25" fill="currentColor" />
      <circle cx="5" cy="18" r="1.25" fill="currentColor" />
      <path d="M9 6H20M9 12H20M9 18H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

type BackendSongFileUploadProps = {
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
  audioExistingLabel?: string;
  audioStatus?: string;
  audioStatusBusy?: boolean;
  stemFiles: File[];
  onStemFilesChange: (files: File[]) => void;
  existingStemLabels?: string[];
  onClearExistingStems?: () => void;
  artworkFile: File | null;
  artworkPreviewUrl: string | null;
  onArtworkFileChange: (file: File | null) => void;
  onRemoveArtwork: () => void;
  artworkHelp?: string;
  artworkFooter?: ReactNode;
  topAction?: ReactNode;
  disabled?: boolean;
};

export default function BackendSongFileUpload({
  audioFile,
  onAudioFileChange,
  audioExistingLabel = "",
  audioStatus = "",
  audioStatusBusy = false,
  stemFiles,
  onStemFilesChange,
  existingStemLabels = [],
  onClearExistingStems,
  artworkFile,
  artworkPreviewUrl,
  onArtworkFileChange,
  onRemoveArtwork,
  artworkHelp = "Click the preview or choose a new image to replace it.",
  artworkFooter,
  topAction,
  disabled = false,
}: BackendSongFileUploadProps) {
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const artworkActionInputRef = useRef<HTMLInputElement | null>(null);
  const stemsInputRef = useRef<HTMLInputElement | null>(null);

  const hasAudio = Boolean(audioFile || audioExistingLabel);
  const hasArtwork = Boolean(artworkFile || artworkPreviewUrl);
  const hasStems = stemFiles.length > 0 || existingStemLabels.length > 0;

  const visibleStemLabels = useMemo(
    () => (stemFiles.length > 0 ? stemFiles.map((file) => file.name) : existingStemLabels),
    [existingStemLabels, stemFiles],
  );

  useEffect(() => {
    if (!audioFile && audioInputRef.current) audioInputRef.current.value = "";
  }, [audioFile]);

  useEffect(() => {
    if (!artworkFile && artworkActionInputRef.current) {
      artworkActionInputRef.current.value = "";
    }
  }, [artworkFile]);

  useEffect(() => {
    if (stemFiles.length === 0 && stemsInputRef.current) {
      stemsInputRef.current.value = "";
    }
  }, [stemFiles.length]);

  function appendStemFiles(incoming: File[]) {
    const seen = new Set<string>();
    const next = [...stemFiles, ...incoming].filter((file) => {
      const key = fileKey(file);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    onStemFilesChange(next);
  }

  function handleStemInput(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length > 0) appendStemFiles(incoming);
    event.target.value = "";
  }

  function removeStem(index: number) {
    onStemFilesChange(stemFiles.filter((_, fileIndex) => fileIndex !== index));
  }

  return (
    <div className="grid gap-4">
      <input
        ref={artworkActionInputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="hidden"
        onChange={(event) => onArtworkFileChange(event.target.files?.[0] ?? null)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => audioInputRef.current?.click()}
          className={`inline-flex h-10 min-w-[104px] items-center justify-center gap-2 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 text-xs font-normal leading-none transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${hasAudio ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
        >
          <AudioActionIcon />
          <span>Choose Audio</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => artworkActionInputRef.current?.click()}
          className={`inline-flex h-10 min-w-[104px] items-center justify-center gap-2 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 text-xs font-normal leading-none transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${hasArtwork ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
        >
          <ArtworkActionIcon />
          <span>Choose Cover Art</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => stemsInputRef.current?.click()}
          className={`inline-flex h-10 min-w-[104px] items-center justify-center gap-2 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 text-xs font-normal leading-none transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${hasStems ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
        >
          <StemsActionIcon />
          <span>Choose Stems</span>
        </button>
        {topAction ? <div className="ml-auto">{topAction}</div> : null}
      </div>

      <section className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
        <h2 className="mb-3 font-[family-name:var(--font-aktiv-grotesk)] text-base font-medium leading-6 tracking-[-0.03em] text-[var(--text-primary)]">
          Files
        </h2>

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          disabled={disabled}
          className="hidden"
          onChange={(event) => onAudioFileChange(event.target.files?.[0] ?? null)}
        />
        <input
          ref={stemsInputRef}
          type="file"
          accept="audio/*"
          multiple
          disabled={disabled}
          className="hidden"
          onChange={handleStemInput}
        />

        <div className="grid gap-2">
          <div className={`grid min-h-10 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-[7px] border border-[var(--border)] px-3 ${audioStatusBusy || (audioStatus && !/^(generated|re-generated)\s/i.test(audioStatus)) ? "py-2" : ""}`}>
            <div className="text-xs font-medium leading-[18px] text-[var(--text-primary)]">
              Audio
            </div>
            <div className="min-w-0">
              <div className={`truncate text-xs leading-[18px] ${hasAudio ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                {audioFile?.name || audioExistingLabel || "No file chosen"}
              </div>
              {audioStatus && !/^(generated|re-generated)\s/i.test(audioStatus) ? (
                <div className="mt-1 flex items-start gap-2 text-[11px] leading-4 text-[var(--text-secondary)]">
                  {audioStatusBusy ? (
                    <span className="mt-px h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-[var(--border)] border-t-[var(--text-primary)]" />
                  ) : null}
                  <span>{audioStatus}</span>
                </div>
              ) : null}
            </div>
            {audioFile ? (
              <button
                type="button"
                disabled={disabled || audioStatusBusy}
                onClick={() => onAudioFileChange(null)}
                className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>

          <div className={`grid min-h-10 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-[7px] border border-[var(--border)] px-3 ${visibleStemLabels.length > 0 ? "py-2" : ""}`}>
            <div className="text-xs font-medium leading-[18px] text-[var(--text-primary)]">
              Stems
            </div>
            <div className="min-w-0">
              <div className={`truncate text-xs leading-[18px] ${hasStems ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                {stemFiles.length > 0
                  ? `${stemFiles.length} file${stemFiles.length === 1 ? "" : "s"} chosen`
                  : existingStemLabels.length > 0
                    ? `${existingStemLabels.length} current stem${existingStemLabels.length === 1 ? "" : "s"} will be kept`
                    : "No file chosen"}
              </div>
              {visibleStemLabels.length > 0 ? (
                <div className="mt-1 grid gap-1">
                  {visibleStemLabels.map((label, index) => (
                    <div
                      key={`${label}-${index}`}
                      className="flex min-w-0 items-center justify-between gap-3 text-[11px] leading-4 text-[var(--text-secondary)]"
                    >
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {stemFiles.length > 0 ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeStem(index)}
                          aria-label={`Remove ${label}`}
                          className="shrink-0 font-medium transition hover:text-[var(--danger)] disabled:opacity-50"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {stemFiles.length === 0 && existingStemLabels.length > 0 && onClearExistingStems ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onClearExistingStems}
                className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--danger)] disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <BackendArtworkUpload
        file={artworkFile}
        previewUrl={artworkPreviewUrl}
        onFileChange={onArtworkFileChange}
        onRemove={onRemoveArtwork}
        disabled={disabled}
        title="Cover image"
        help={artworkHelp}
        footer={artworkFooter}
      />
    </div>
  );
}
