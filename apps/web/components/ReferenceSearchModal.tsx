"use client";

import { useEffect, useRef, useState } from "react";

import WaveformIcon from "@/components/icons/WaveformIcon";
import XIcon from "@/components/icons/XIcon";

import styles from "./ReferenceSearchModal.module.css";

export type ReferenceCatalogResult = {
  id: string;
  kind: "track" | "artist";
  name: string;
  artist: string;
  secondary: string;
  imageUrl: string | null;
  imageUrls?: string[];
  externalUrl: string | null;
  searchQuery: string;
};

type ReferenceSearchModalProps = {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (
    value: string,
    result?: ReferenceCatalogResult,
  ) => void | Promise<void>;
};

function ReferenceArtwork({
  imageUrl,
  imageUrls,
}: {
  imageUrl: string | null;
  imageUrls?: string[];
}) {
  const candidates = imageUrls?.length
    ? imageUrls
    : imageUrl
      ? [imageUrl]
      : [];
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [imageUrl, imageUrls]);

  const candidate = candidates[candidateIndex] ?? null;

  if (!candidate) {
    return (
      <span className={styles.resultArtworkFallback}>
        <WaveformIcon size={16} />
      </span>
    );
  }

  return (
    <img
      src={candidate}
      alt=""
      draggable={false}
      onError={() => setCandidateIndex((index) => index + 1)}
    />
  );
}

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
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const [results, setResults] = useState<ReferenceCatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedResult, setSelectedResult] =
    useState<ReferenceCatalogResult | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function closeModal() {
    if (submitting) return;

    onChange("");
    setResults([]);
    setLoading(false);
    setSubmitting(false);
    setSelectedResult(null);
    setDropdownOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }

    function handlePointerDown(event: MouseEvent) {
      const form = searchFormRef.current;
      if (!form || !(event.target instanceof Node)) return;
      if (!form.contains(event.target)) setDropdownOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose, open, submitting]);

  useEffect(() => {
    if (!open) {
      setResults([]);
      setLoading(false);
      setSubmitting(false);
      setSelectedResult(null);
      setDropdownOpen(false);
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
        if (nextResults.length > 0) setDropdownOpen(true);
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

  async function submitQuery(
    query: string,
    result?: ReferenceCatalogResult,
  ) {
    const cleanQuery = query.trim();
    if (!cleanQuery || submitting) return;

    if (isMusicLink(cleanQuery) && !result) {
      setLoading(true);

      try {
        const response = await fetch("/api/music/reference-resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: cleanQuery }),
        });

        if (!response.ok) {
          throw new Error("Reference link resolution failed");
        }

        const data = await response.json();
        const resolved =
          data?.result &&
          typeof data.result === "object" &&
          typeof data.result.id === "string" &&
          typeof data.result.searchQuery === "string"
            ? (data.result as ReferenceCatalogResult)
            : null;

        if (!resolved) {
          throw new Error("Reference link resolution returned no track");
        }

        onChange(resolved.searchQuery);

        if (resolved.kind === "track") {
          setSelectedResult(resolved);
          setSubmitting(true);
        }

        await onSubmit(resolved.searchQuery, resolved);
      } catch (error) {
        console.error("Reference link resolution failed:", error);
      } finally {
        setLoading(false);
        setSubmitting(false);
      }

      return;
    }

    onChange(cleanQuery);

    if (result?.kind === "track") {
      setSelectedResult(result);
      setSubmitting(true);
    }

    try {
      await onSubmit(cleanQuery, result);
    } finally {
      setSubmitting(false);
    }
  }

  const showDropdown =
    dropdownOpen &&
    !isMusicLink(value) &&
    value.trim().length >= MIN_CATALOG_QUERY_LENGTH &&
    (loading || results.length > 0);

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
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
          onClick={closeModal}
          disabled={submitting}
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

          {submitting && selectedResult ? (
            <div
              className={styles.searching}
              role="status"
              aria-live="polite"
            >
              <span className={styles.searchingArtwork} aria-hidden="true">
                <ReferenceArtwork
                  imageUrl={selectedResult.imageUrl}
                  imageUrls={selectedResult.imageUrls}
                />
              </span>
              <span className={styles.searchingCopy}>
                <strong>{selectedResult.name}</strong>
                <small>{selectedResult.artist}</small>
                <span>Finding similar tracks…</span>
              </span>
              <span className={styles.searchingSpinner} aria-hidden="true" />
            </div>
          ) : (
          <form
            ref={searchFormRef}
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
                onChange={(event) => {
                  onChange(event.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => {
                  if (
                    value.trim().length >= MIN_CATALOG_QUERY_LENGTH &&
                    !isMusicLink(value) &&
                    (loading || results.length > 0)
                  ) {
                    setDropdownOpen(true);
                  }
                }}
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
                      onClick={() => submitQuery(result.searchQuery, result)}
                    >
                      <span className={styles.resultArtwork} aria-hidden="true">
                        <ReferenceArtwork
                          imageUrl={result.imageUrl}
                          imageUrls={result.imageUrls}
                        />
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
          )}
        </div>
      </section>
    </div>
  );
}
