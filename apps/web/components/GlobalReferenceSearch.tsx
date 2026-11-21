"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import WaveformIcon from "@/components/icons/WaveformIcon";
import styles from "./GlobalReferenceSearch.module.css";
import ReferenceSearchModal, {
  type ReferenceCatalogResult,
} from "@/components/ReferenceSearchModal";
import {
  getReferenceSearchMatchSongIds,
  writeReferenceSearchHandoff,
} from "@/lib/referenceSearchHandoff";

const FLASH_INTERVAL_MS = 140;
let flashImagesPromise: Promise<string[]> | null = null;

function loadFlashImages(): Promise<string[]> {
  if (!flashImagesPromise) {
    flashImagesPromise = fetch("/api/home-flash-images")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load flash images");
        return response.json() as Promise<{ images?: unknown }>;
      })
      .then(async (data) => {
        if (!Array.isArray(data.images)) return [];
        const urls = data.images.filter((url): url is string => typeof url === "string");
        const usable = await Promise.all(urls.map((url) =>
          new Promise<string | null>((resolve) => {
            const image = new window.Image();
            image.onload = () => resolve(url);
            image.onerror = () => resolve(null);
            image.src = url;
          }),
        ));
        return usable.filter((url): url is string => url !== null);
      })
      .catch(() => {
        flashImagesPromise = null;
        return [];
      });
  }
  return flashImagesPromise;
}

type GlobalReferenceSearchProps = {
  className?: string;
  embedded?: boolean;
};

export default function GlobalReferenceSearch({
  className = "audioflume-home-reference-searchbar-song",
  embedded = false,
}: GlobalReferenceSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState(false);
  const [flashImages, setFlashImages] = useState<string[]>([]);
  const [flashIndex, setFlashIndex] = useState(0);

  useEffect(() => {
    if (flashImages.length > 0) return;
    let active = true;
    loadFlashImages().then((images) => {
      if (active) setFlashImages(images);
    });
    return () => { active = false; };
  }, [flashImages.length]);

  useEffect(() => {
    if (!hovered || flashImages.length <= 1 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setFlashIndex((index) => (index + 1) % flashImages.length);
    }, FLASH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [hovered, flashImages]);

  const showFlash = hovered && flashImages.length > 0;

  async function handleSubmit(
    value: string,
    result?: ReferenceCatalogResult,
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams({
      referenceSearch: value,
    });

    if (result?.kind !== "track") {
      setQuery(value);
      setOpen(false);
      router.push(`/music?${params.toString()}`);
      return;
    }

    const response = await fetch("/api/music/reference-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId: result.id }),
      signal,
    });

    if (!response.ok) {
      const errorResponse = await response.json().catch(() => null);
      throw new Error(
        typeof errorResponse?.error === "string"
          ? errorResponse.error
          : `Reference search failed (HTTP ${response.status})`,
      );
    }

    const data = await response.json();
    if (signal?.aborted) return;
    writeReferenceSearchHandoff({
      referenceId: result.id,
      query: value,
      name: result.name,
      artist: result.artist,
      imageUrl: result.imageUrl,
      songIds: getReferenceSearchMatchSongIds(data),
    });

    params.set("referenceTrackId", result.id);

    setQuery(value);
    setOpen(false);
    router.push(`/music?${params.toString()}`);
  }

  if (embedded) {
    return (
      <ReferenceSearchModal
        open
        embedded
        value={query}
        onChange={setQuery}
        onClose={() => undefined}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        className={`${className} ${styles.flashButton}${showFlash ? ` ${styles.isFlashing}` : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setFlashIndex(0); }}
        onFocus={() => setHovered(true)}
        onBlur={() => { setHovered(false); setFlashIndex(0); }}
        aria-label="Find Similar"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        {showFlash ? (
          <span className={styles.flashMedia} aria-hidden="true">
            <img src={flashImages[flashIndex % flashImages.length]} alt="" />
          </span>
        ) : null}
        <WaveformIcon size={16} />
        <span>Find Similar</span>
      </button>

      <ReferenceSearchModal
        open={open}
        value={query}
        onChange={setQuery}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
