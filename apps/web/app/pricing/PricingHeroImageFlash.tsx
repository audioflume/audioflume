"use client";

import { useEffect, useState } from "react";

const FLASH_INTERVAL_MS = 220;

type PricingHeroImageFlashProps = {
  images: string[];
};

export default function PricingHeroImageFlash({
  images,
}: PricingHeroImageFlashProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    if (images.length <= 1) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, FLASH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [images.length]);

  return (
    <div className="audioflume-pricing-hero-media" aria-hidden="true">
      {images.map((src, index) => (
        <div
          key={src}
          className={`audioflume-pricing-hero-frame${
            index === activeIndex ? " is-active" : ""
          }`}
          style={{ backgroundImage: `url("${src}")` }}
        />
      ))}
    </div>
  );
}
