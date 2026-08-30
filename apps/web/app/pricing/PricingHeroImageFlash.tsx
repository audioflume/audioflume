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
  const [failedSources, setFailedSources] = useState<Set<string>>(
    () => new Set(),
  );

  const firstSource = images[0] ?? null;
  const usableImages = useMemo(
    () => images.filter((src) => !failedSources.has(src)),
    [failedSources, images],
  );
  const firstSourceSettled = firstSource
    ? settledSources.has(firstSource)
    : true;
  const allImagesSettled = images.every((src) => settledSources.has(src));
  const activeSource = usableImages[activeIndex] ?? usableImages[0] ?? null;
  const renderedImages = loadFullSequence ? images : images.slice(0, 1);

  useEffect(() => {
    setActiveIndex(0);
    setLoadFullSequence(false);
    setSettledSources(new Set());
    setFailedSources(new Set());
  }, [images]);

  useEffect(() => {
    if (!firstSourceSettled || images.length <= 1) return;
    setLoadFullSequence(true);
  }, [firstSourceSettled, images.length]);

  useEffect(() => {
    if (!allImagesSettled || usableImages.length <= 1) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % usableImages.length);
    }, FLASH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [allImagesSettled, usableImages.length]);

  function markSettled(src: string) {
    setSettledSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }

  function markFailed(src: string) {
    setFailedSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
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
          onLoad={() => markSettled(src)}
          onError={() => {
            markFailed(src);
            markSettled(src);
          }}
          className={`audioflume-pricing-hero-frame${
            src === activeSource ? " is-active" : ""
          }`}
          style={{ objectFit: "cover", objectPosition: "center center" }}
        />
      ))}
    </div>
  );
}
