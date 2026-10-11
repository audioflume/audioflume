"use client";

import { useEffect, useRef } from "react";

import WaveformIcon from "@/components/icons/WaveformIcon";
import XIcon from "@/components/icons/XIcon";

import styles from "./ReferenceSearchModal.module.css";

type ReferenceSearchModalProps = {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (value: string) => void;
};

export default function ReferenceSearchModal({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
}: ReferenceSearchModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audioflume-reference-search-title"
      >
        <div className={styles.image} aria-hidden="true" />
        <div className={styles.overlay} aria-hidden="true" />

        <button
          type="button"
          className={styles.close}
          aria-label="Close reference search"
          onClick={onClose}
        >
          <XIcon size={12} />
        </button>

        <div className={styles.content}>
          <div className={styles.eyebrow}>Reference search</div>
          <h2 id="audioflume-reference-search-title">
            Find something similar.
          </h2>
          <p>
            Search by artist or track, or paste a Spotify, YouTube, or Apple
            Music link.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const query = value.trim();
              if (!query) return;
              onSubmit(query);
            }}
          >
            <label className={styles.field}>
              <WaveformIcon size={20} />
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Song, artist, or music link"
                aria-label="Song, artist, or music link"
              />
              <span>Song / Link</span>
            </label>
          </form>
        </div>
      </section>
    </div>
  );
}
