"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const FLASH_INTERVAL_MS = 140;

type PricingHeroImageFlashProps = {
  images: string[];
  mediaClassName?: string;
};

export default function PricingHeroImageFlash({
  images,
  mediaClassName = "audioflume-home-flash-hero-media",
}: PricingHeroImageFlashProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInViewport, setIsInViewport] = useState(true);
  const [settledSources, setSettledSources] = useState<Set<string>>(
    () => new Set(),
  );
  const [failedSources, setFailedSources] = useState<Set<string>>(
    () => new Set(),
  );

  const usableImages = useMemo(
    () => images.filter((src) => !failedSources.has(src)),
    [failedSources, images],
  );
  const allImagesSettled = images.every((src) => settledSources.has(src));
  const activeSource = usableImages[activeIndex] ?? usableImages[0] ?? null;

  useEffect(() => {
    setActiveIndex(0);
    setSettledSources(new Set());
    setFailedSources(new Set());
  }, [images]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.01 },
    );

    observer.observe(media);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!allImagesSettled || usableImages.length <= 1 || !isInViewport) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % usableImages.length);
    }, FLASH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [allImagesSettled, isInViewport, usableImages.length]);

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
    <div ref={mediaRef} className={mediaClassName} aria-hidden="true">
      {images.map((src, index) => (
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
