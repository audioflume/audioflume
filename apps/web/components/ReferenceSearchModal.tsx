"use client";

import { useEffect, useRef, useState } from "react";

import WaveformIcon from "@/components/icons/WaveformIcon";
import XIcon from "@/components/icons/XIcon";

import styles from "./ReferenceSearchModal.module.css";

type ReferenceCatalogResult = {
  id: string;
  kind: "track" | "artist";
  name: string;
  artist: string;
  secondary: string;
  imageUrl: string | null;
  externalUrl: string | null;
  searchQuery: string;
};

type ReferenceSearchModalProps = {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (value: string) => void;
};

const SEARCH_DEBOUNCE_MS = 600;
const MIN_CATALOG_QUERY_LENGTH = 2;

function isMusicLink(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export default function ReferenceSearchModal({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
}: ReferenceSearchModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [results, setResults] = useState<ReferenceCatalogResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setResults([]);
      setLoading(false);
      return;
    }

    const query = value.trim();

    if (
      query.length < MIN_CATALOG_QUERY_LENGTH ||
      isMusicLink(query)
    ) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/music/reference-catalog?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Reference catalog search failed");
        }

        const data = await response.json();
        const nextResults = Array.isArray(data?.results)
          ? data.results.filter(
              (result: unknown): result is ReferenceCatalogResult =>
                Boolean(
                  result &&
                    typeof result === "object" &&
                    typeof (result as ReferenceCatalogResult).id === "string" &&
                    typeof (result as ReferenceCatalogResult).searchQuery ===
                      "string",
                ),
            )
          : [];

        setResults(nextResults);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Reference catalog search failed:", error);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, value]);

  if (!open) return null;

  function submitQuery(query: string) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    onChange(cleanQuery);
    onSubmit(cleanQuery);
  }

  const showDropdown =
    !isMusicLink(value) &&
    value.trim().length >= MIN_CATALOG_QUERY_LENGTH &&
    (loading || results.length > 0);

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
            className={styles.searchForm}
            onSubmit={(event) => {
              event.preventDefault();
              submitQuery(value);
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
                autoComplete="off"
              />
              <span>Song / Link</span>
            </label>

            {showDropdown ? (
              <div className={styles.results} role="listbox">
                {loading ? (
                  <div className={styles.status}>Searching songs and artists…</div>
                ) : (
                  results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className={styles.result}
                      role="option"
                      aria-selected="false"
                      onClick={() => submitQuery(result.searchQuery)}
                    >
                      <span className={styles.resultArtwork} aria-hidden="true">
                        {result.imageUrl ? (
                          <img src={result.imageUrl} alt="" draggable={false} />
                        ) : (
                          <span className={styles.resultArtworkFallback}>
                            <WaveformIcon size={16} />
                          </span>
                        )}
                      </span>
                      <span className={styles.resultCopy}>
                        <strong>{result.name}</strong>
                        <small>
                          {result.kind === "track"
                            ? result.artist
                            : result.secondary}
                        </small>
                      </span>
                      <span className={styles.resultKind}>
                        {result.kind === "track" ? "Track" : "Artist"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  );
}
