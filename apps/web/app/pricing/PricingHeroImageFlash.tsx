"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const FLASH_INTERVAL_MS = 140;

type PricingHeroImageFlashProps = {
  images: string[];
  mediaClassName?: string;
};

export default function PricingHeroImageFlash({
  images,
  mediaClassName = "audioflume-home-flash-hero-media",
}: PricingHeroImageFlashProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadFullSequence, setLoadFullSequence] = useState(false);
  const [settledSources, setSettledSources] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadedSources, setLoadedSources] = useState<Set<string>>(
    () => new Set(),
  );
  const [failedSources, setFailedSources] = useState<Set<string>>(
    () => new Set(),
  );

  const firstSource = images[0] ?? null;
  const readyImages = useMemo(
    () =>
      images.filter(
        (src) => loadedSources.has(src) && !failedSources.has(src),
      ),
    [failedSources, images, loadedSources],
  );
  const firstSourceSettled = firstSource
    ? settledSources.has(firstSource)
    : true;
  const activeSource = readyImages[activeIndex] ?? readyImages[0] ?? firstSource;
  const renderedImages = loadFullSequence ? images : images.slice(0, 1);

  useEffect(() => {
    setActiveIndex(0);
    setLoadFullSequence(false);
    setSettledSources(new Set());
    setLoadedSources(new Set());
    setFailedSources(new Set());
  }, [images]);

  useEffect(() => {
    if (!firstSourceSettled || images.length <= 1) return;
    setLoadFullSequence(true);
  }, [firstSourceSettled, images.length]);

  useEffect(() => {
    if (readyImages.length <= 1) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % readyImages.length);
    }, FLASH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [readyImages.length]);

  useEffect(() => {
    if (activeIndex < readyImages.length) return;
    setActiveIndex(0);
  }, [activeIndex, readyImages.length]);

  function markSettled(src: string) {
    setSettledSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }

  function markLoaded(src: string) {
    setLoadedSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
    markSettled(src);
  }

  function markFailed(src: string) {
    setFailedSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
    markSettled(src);
  }

  return (
    <div className={mediaClassName} aria-hidden="true">
      {renderedImages.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="(max-width: 760px) 76vw, (max-width: 980px) 67vw, (max-width: 1968px) 61vw, 1200px"
          priority={index === 0}
          loading={index === 0 ? undefined : "eager"}
          onLoad={() => markLoaded(src)}
          onError={() => markFailed(src)}
          className={`audioflume-pricing-hero-frame${
            src === activeSource ? " is-active" : ""
          }`}
          style={{ objectFit: "cover", objectPosition: "center center" }}
        />
      ))}
    </div>
  );
}
