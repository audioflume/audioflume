"use client";

import { useEffect, useState } from "react";
import WaveformIcon from "@/components/icons/WaveformIcon";
import flashStyles from "@/components/GlobalReferenceSearch.module.css";

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

export default function MusicFindSimilarButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [flashImages, setFlashImages] = useState<string[]>([]);
  const [flashIndex, setFlashIndex] = useState(0);

  useEffect(() => {
    if (!hovered || flashImages.length > 0) return;
    let active = true;
    loadFlashImages().then((images) => {
      if (active) setFlashImages(images);
    });
    return () => { active = false; };
  }, [hovered, flashImages.length]);

  useEffect(() => {
    if (!hovered || flashImages.length <= 1 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setFlashIndex((index) => (index + 1) % flashImages.length);
    }, FLASH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [hovered, flashImages]);

  const showFlash = hovered && flashImages.length > 0;

  return (
    <button
      type="button"
      className={`audioflume-music-page-searchbar-song ${flashStyles.flashButton}${showFlash ? ` ${flashStyles.isFlashing}` : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setFlashIndex(0); }}
      onFocus={() => setHovered(true)}
      onBlur={() => { setHovered(false); setFlashIndex(0); }}
      aria-label="Find Similar"
      aria-expanded={open}
      onClick={onClick}
    >
      {showFlash ? (
        <span className={flashStyles.flashMedia} aria-hidden="true">
          <img src={flashImages[flashIndex % flashImages.length]} alt="" />
        </span>
      ) : null}
      <WaveformIcon size={16} />
      <span>Find Similar</span>
    </button>
  );
}
